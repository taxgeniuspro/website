import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local interfaces
interface Profile {
  id: string;
  role: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  type: string;
  isActive: boolean;
  recurring: boolean;
  interval: string | null;
  availableFor: string[];
  printable: boolean;
  digitalDownload: boolean;
  stock: number | null;
  sku: string | null;
  images: any[];
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * PUT /api/admin/products/[id]
 * Update a product (admin only)
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profileData, error: profileError } = await db.from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      throw profileError;
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      name,
      description,
      price,
      category,
      type,
      isActive,
      recurring,
      interval,
      availableFor,
      printable,
      digitalDownload,
      stock,
      sku,
      images,
    } = body;

    // Check if product exists
    const { data: existingProductData, error: existingError } = await db.from('products')
      .select('id')
      .eq('id', id)
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    const existingProduct = firstOrNull<{ id: string }>(existingProductData);

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update product
    const { data: product, error: updateError } = await db.from('products')
      .update({
        name,
        description: description || null,
        price,
        category: category || null,
        type: type || 'ONE_TIME',
        isActive: isActive !== undefined ? isActive : true,
        recurring: recurring || false,
        interval: interval || null,
        availableFor: availableFor || [],
        printable: printable || false,
        digitalDownload: digitalDownload || false,
        stock: stock || null,
        sku: sku || null,
        images: images || [],
        // Update imageUrl to primary image for backward compatibility
        imageUrl:
          images && images.length > 0
            ? images.find((img: any) => img.isPrimary)?.url || images[0]?.url
            : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    logger.info('Product updated', { productId: product.id, name: product.name });

    return NextResponse.json({
      ...product,
      price: Number(product.price),
      images: Array.isArray(product.images) ? product.images : [],
    });
  } catch (error) {
    logger.error('Failed to update product', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/[id]
 * Delete a product (admin only)
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profileData, error: profileError } = await db.from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      throw profileError;
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if product exists
    const { data: existingProductData, error: existingError } = await db.from('products')
      .select('id')
      .eq('id', id)
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    const existingProduct = firstOrNull<{ id: string }>(existingProductData);

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if product has active subscriptions or orders
    const { count: hasActiveSubscriptions } = await db.from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('productId', id)
      .in('status', ['ACTIVE', 'TRIALING']);

    if (hasActiveSubscriptions && hasActiveSubscriptions > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete product with active subscriptions. Please deactivate instead.',
        },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false instead of hard delete
    const { error: softDeleteError } = await db.from('products')
      .update({ isActive: false })
      .eq('id', id);

    if (softDeleteError) {
      throw softDeleteError;
    }

    logger.info('Product deactivated (soft delete)', { productId: id });

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete product', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
