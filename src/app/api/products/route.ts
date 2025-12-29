import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interface for Product (replaces @prisma/client import)
interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  category: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    // Build Supabase query
    let query = db.from('products').select('*').eq('is_active', true);

    if (type) {
      query = query.eq('type', type);
    }

    if (category) {
      query = query.eq('category', category);
    }

    // Order by created_at ascending
    query = query.order('created_at', { ascending: true });

    // Execute query
    const { data: products, error } = await query;

    if (error) {
      logger.error('Failed to fetch products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Map snake_case to camelCase and ensure price is a number
    const serializedProducts = (products || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      type: product.type,
      category: product.category,
      imageUrl: product.image_url,
      isActive: product.is_active,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }));

    return NextResponse.json({ products: serializedProducts });
  } catch (error) {
    logger.error('Failed to fetch products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
