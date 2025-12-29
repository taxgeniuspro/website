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
 * GET /api/admin/products
 * Fetch all products (admin only)
 */
export async function GET() {
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

    const { data: products, error: productsError } = await db.from('products')
      .select('*')
      .order('createdAt', { ascending: false });

    if (productsError) {
      throw productsError;
    }

    // Serialize products (convert Decimal to number, parse JSON fields)
    const serializedProducts = (products || []).map((product: Product) => ({
      ...product,
      price: Number(product.price),
      images: Array.isArray(product.images) ? product.images : [],
    }));

    return NextResponse.json(serializedProducts);
  } catch (error) {
    logger.error('Failed to fetch products', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

/**
 * POST /api/admin/products
 * Create a new product (admin only)
 */
export async function POST(req: NextRequest) {
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

    // Validate required fields
    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    // Create product
    const { data: product, error: createError } = await db.from('products')
      .insert({
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
        // Set imageUrl to primary image for backward compatibility
        imageUrl:
          images && images.length > 0
            ? images.find((img: any) => img.isPrimary)?.url || images[0]?.url
            : null,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    logger.info('Product created', { productId: product.id, name: product.name });

    return NextResponse.json({
      ...product,
      price: Number(product.price),
      images: Array.isArray(product.images) ? product.images : [],
    });
  } catch (error) {
    logger.error('Failed to create product', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
