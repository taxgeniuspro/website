/**
 * Admin Setup Storage API
 * Creates required Supabase Storage buckets
 *
 * POST /api/admin/setup-storage
 * Requires: ADMIN_SETUP_KEY header for authorization
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || 'taxgenius-setup-2024';

export async function POST(req: NextRequest) {
  // Check authorization
  const authKey = req.headers.get('x-admin-setup-key');
  if (authKey !== ADMIN_SETUP_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const buckets = [
    { id: 'documents', name: 'documents', public: false },
    { id: 'images', name: 'images', public: true },
    { id: 'avatars', name: 'avatars', public: true },
  ];

  const results: { bucket: string; status: string; error?: string }[] = [];

  for (const bucket of buckets) {
    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
    });

    if (error) {
      if (error.message.includes('already exists')) {
        results.push({ bucket: bucket.id, status: 'exists' });
      } else {
        results.push({ bucket: bucket.id, status: 'error', error: error.message });
      }
    } else {
      results.push({ bucket: bucket.id, status: 'created' });
    }
  }

  // List existing buckets
  const { data: existingBuckets } = await supabase.storage.listBuckets();

  return NextResponse.json({
    message: 'Storage setup complete',
    results,
    existingBuckets: existingBuckets?.map((b) => ({ name: b.name, public: b.public })) || [],
  });
}
