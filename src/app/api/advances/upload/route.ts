import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Simulated OCR processing for tax documents
function extractDataFromDocument(fileName: string, fileType: string): any {
  // Simulate OCR extraction based on document type
  if (fileType.includes('w2')) {
    return {
      documentType: 'W-2',
      employerName: 'Sample Employer Inc.',
      employerEIN: '12-3456789',
      wages: Math.floor(Math.random() * 30000) + 25000,
      federalWithholding: Math.floor(Math.random() * 5000) + 2000,
      socialSecurityWages: Math.floor(Math.random() * 30000) + 25000,
      medicareWages: Math.floor(Math.random() * 30000) + 25000,
      year: 2023,
    };
  } else if (fileType.includes('1099')) {
    return {
      documentType: '1099-NEC',
      payerName: 'Gig Platform Inc.',
      payerTIN: '98-7654321',
      nonemployeeCompensation: Math.floor(Math.random() * 40000) + 15000,
      federalWithholding: 0,
      year: 2023,
    };
  } else if (fileType.includes('id')) {
    return {
      documentType: 'Driver License',
      fullName: 'John Doe',
      licenseNumber: 'D123456789',
      dateOfBirth: '1990-01-15',
      expirationDate: '2025-01-15',
      state: 'CA',
      verified: true,
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image or PDF.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    // Simulate file upload to storage (in production, upload to S3/R2)
    const fileId = crypto.randomUUID();
    const fileUrl = `/uploads/${fileId}/${file.name}`;

    // Simulate OCR processing
    const extractedData = extractDataFromDocument(file.name, documentType);

    // Prepare response
    const response = {
      id: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      documentType: documentType,
      url: fileUrl,
      extractedData: extractedData,
      processingStatus: extractedData ? 'completed' : 'pending',
      uploadedAt: new Date().toISOString(),
    };

    // Log upload (in production, save to database)
    logger.info('Document uploaded:', {
      id: fileId,
      name: file.name,
      type: documentType,
      size: file.size,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

// GET endpoint to check document processing status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const documentId = searchParams.get('id');

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
  }

  // Simulate database lookup (in production, query database)
  const mockDocument = {
    id: documentId,
    processingStatus: 'completed',
    extractedData: {
      documentType: 'W-2',
      wages: 45000,
      federalWithholding: 6750,
      year: 2023,
    },
    verificationStatus: 'verified',
    processedAt: new Date().toISOString(),
  };

  return NextResponse.json(mockDocument, { status: 200 });
}
