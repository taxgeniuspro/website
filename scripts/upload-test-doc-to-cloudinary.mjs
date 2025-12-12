#!/usr/bin/env node
/**
 * Upload Test Document to Cloudinary and Update Database Record
 *
 * This script uploads YW.webp to Cloudinary and updates the existing
 * document record to use the Cloudinary URL.
 *
 * Usage:
 *   DATABASE_URL='postgresql://...' node scripts/upload-test-doc-to-cloudinary.mjs
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Configuration
const DOCUMENT_ID = 'cmj27oxbs0001s4rm28rho3me';
const SOURCE_IMAGE = join(__dirname, '..', 'AAA Folder', 'preparers', 'YW.webp');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dggyh5wxy',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  console.log('=== Upload Test Document to Cloudinary ===\n');

  try {
    // 1. Verify we have Cloudinary credentials
    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET');
      console.log('\nPlease set these environment variables and try again.');
      process.exit(1);
    }

    // 2. Read the source file
    const fileBuffer = readFileSync(SOURCE_IMAGE);
    console.log(`Source file: ${SOURCE_IMAGE}`);
    console.log(`File size: ${fileBuffer.length} bytes\n`);

    // 3. Upload to Cloudinary
    console.log('Uploading to Cloudinary...');
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'taxgeniuspro/client-documents',
          resource_type: 'image',
          public_id: `jose-obrien-smith-drivers-license-${Date.now()}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(fileBuffer);
    });

    const cloudinaryUrl = uploadResult.secure_url;
    console.log(`Uploaded to Cloudinary: ${cloudinaryUrl}\n`);

    // 4. Update the document record
    const updatedDoc = await prisma.document.update({
      where: { id: DOCUMENT_ID },
      data: {
        fileUrl: cloudinaryUrl,
        metadata: {
          uploadedAt: new Date().toISOString(),
          description: "Driver's License / Photo ID",
          documentCategory: 'ID_DOCUMENT',
          originalFileName: 'YW.webp',
          uploadedViaScript: true,
          cloudinaryPublicId: uploadResult.public_id,
          storageProvider: 'cloudinary',
        },
      },
    });

    console.log('Document record updated:');
    console.log(`  Document ID: ${updatedDoc.id}`);
    console.log(`  New File URL: ${updatedDoc.fileUrl}`);
    console.log(`  Storage: Cloudinary (persistent)\n`);

    console.log('=== Upload Complete ===');
    console.log(`\nImage will now load at: ${cloudinaryUrl}`);
    console.log(`\nView in CRM: https://taxgeniuspro.tax/en/crm/contacts/cmj24qsqa0011jv04zbmxct9i`);
    console.log(`Documents: https://taxgeniuspro.tax/en/dashboard/tax-preparer/documents?folder=cmj24qsok000yjv049c1vyjpx`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
