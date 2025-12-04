import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
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
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: {
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
      },
    });

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
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if product has active subscriptions or orders
    const hasActiveSubscriptions = await prisma.subscription.count({
      where: {
        productId: id,
        status: {
          in: ['ACTIVE', 'TRIALING'],
        },
      },
    });

    if (hasActiveSubscriptions > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete product with active subscriptions. Please deactivate instead.',
        },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false instead of hard delete
    await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    logger.info('Product deactivated (soft delete)', { productId: id });

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete product', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
