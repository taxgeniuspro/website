#!/usr/bin/env node
/**
 * Upload Test Document to José O'Brien-Smith's Client Folder
 *
 * This script uploads YW.webp as a test driver's license document
 * to demonstrate the document folder functionality.
 *
 * Usage:
 *   DATABASE_URL='postgresql://...' node scripts/upload-test-document.mjs
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Configuration
const FOLDER_ID = 'cmj24qsok000yjv049c1vyjpx';
const SOURCE_IMAGE = join(__dirname, '..', 'AAA Folder', 'preparers', 'YW.webp');
const TAX_YEAR = 2024;

async function main() {
  console.log('=== Upload Test Document Script ===\n');

  try {
    // 1. Verify source file exists
    if (!existsSync(SOURCE_IMAGE)) {
      console.error(`Source image not found: ${SOURCE_IMAGE}`);
      process.exit(1);
    }

    const fileStats = statSync(SOURCE_IMAGE);
    console.log(`Source file: ${SOURCE_IMAGE}`);
    console.log(`File size: ${fileStats.size} bytes\n`);

    // 2. Get folder information to find the ownerId (profileId)
    console.log(`Looking up folder: ${FOLDER_ID}`);
    const folder = await prisma.folder.findUnique({
      where: { id: FOLDER_ID },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!folder) {
      console.error(`Folder not found: ${FOLDER_ID}`);
      process.exit(1);
    }

    console.log(`Folder found: ${folder.name} (${folder.path})`);
    console.log(`Owner: ${folder.owner.firstName} ${folder.owner.lastName} (Profile ID: ${folder.ownerId})\n`);

    // 3. Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-drivers-license-yw.webp`;

    // 4. Create upload directory structure
    const uploadDir = join(process.cwd(), 'uploads', 'documents', folder.ownerId, TAX_YEAR.toString());
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
      console.log(`Created directory: ${uploadDir}`);
    }

    // 5. Copy file to uploads directory
    const destPath = join(uploadDir, fileName);
    const fileBuffer = readFileSync(SOURCE_IMAGE);
    writeFileSync(destPath, fileBuffer);
    console.log(`File copied to: ${destPath}\n`);

    // 6. Create document record in database
    const fileUrl = `/uploads/documents/${folder.ownerId}/${TAX_YEAR}/${fileName}`;

    const document = await prisma.document.create({
      data: {
        profileId: folder.ownerId,
        folderId: FOLDER_ID,
        type: 'OTHER', // No ID_DOCUMENT type, using OTHER
        fileName: 'Drivers License - YW.webp',
        fileUrl: fileUrl,
        fileSize: fileStats.size,
        mimeType: 'image/webp',
        isEncrypted: false,
        taxYear: TAX_YEAR,
        status: 'PENDING',
        metadata: {
          documentCategory: 'ID_DOCUMENT',
          description: 'Driver\'s License / Photo ID',
          uploadedViaScript: true,
          originalFileName: 'YW.webp',
          uploadedAt: new Date().toISOString(),
        },
        tags: ['id', 'drivers-license', 'photo-id'],
      },
    });

    console.log('Document created successfully!');
    console.log(`  Document ID: ${document.id}`);
    console.log(`  Profile ID: ${document.profileId}`);
    console.log(`  Folder ID: ${document.folderId}`);
    console.log(`  File Name: ${document.fileName}`);
    console.log(`  File URL: ${document.fileUrl}`);
    console.log(`  Status: ${document.status}`);
    console.log(`  Tax Year: ${document.taxYear}\n`);

    // 7. Log file operation for audit trail
    await prisma.fileOperation.create({
      data: {
        operation: 'UPLOAD',
        performedBy: folder.ownerId,
        documentId: document.id,
        folderId: FOLDER_ID,
        details: {
          fileName: document.fileName,
          fileSize: fileStats.size,
          mimeType: 'image/webp',
          uploadedViaScript: true,
          description: 'Test upload - Driver\'s License',
        },
      },
    });

    console.log('File operation logged for audit trail.\n');

    // 8. Verify document count in folder
    const documentCount = await prisma.document.count({
      where: { folderId: FOLDER_ID },
    });

    console.log(`Total documents in folder: ${documentCount}`);
    console.log('\n=== Upload Complete ===');
    console.log(`\nView at: https://taxgeniuspro.tax/en/dashboard/tax-preparer/documents?folder=${FOLDER_ID}`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
