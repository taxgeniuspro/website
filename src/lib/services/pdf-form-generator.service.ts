/**
 * PDF Form Generator Service
 *
 * Generates professional, black-and-white PDF forms for email attachments.
 * Designed for print-ready output with proper labeling and formatting.
 * Supports embedding images (like driver's license) from URLs.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logger } from '@/lib/logger';

// Image handling types
interface ImageData {
  base64: string;
  format: 'JPEG' | 'PNG';
  width: number;
  height: number;
}

/**
 * Fetch an image from URL and convert to base64
 * Returns null if image cannot be fetched
 */
async function fetchImageAsBase64(url: string): Promise<ImageData | null> {
  try {
    // Use AbortController for timeout (5 second limit for serverless)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers: {
        'Accept': 'image/*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn('Failed to fetch image for PDF', { url, status: response.status });
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Determine format from content type
    let format: 'JPEG' | 'PNG' = 'JPEG';
    if (contentType.includes('png')) {
      format = 'PNG';
    }

    // For image dimensions, we'll use default sizing
    // jsPDF will scale appropriately
    return {
      base64,
      format,
      width: 0, // Will be calculated on render
      height: 0,
    };
  } catch (error) {
    logger.error('Error fetching image for PDF', { url, error });
    return null;
  }
}

/**
 * Add an image page to the PDF document
 * Images are rendered in grayscale for B&W printing
 */
function addImagePage(
  doc: jsPDF,
  imageData: ImageData,
  label: string,
  refId: string,
  date: string,
  pageNum: number,
  totalPages: number
): void {
  doc.addPage();

  // Add header
  let y = MARGIN;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX GENIUS PRO', MARGIN, y);

  y += 24;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Document Attachment', MARGIN, y);

  y += 8;
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  y += 20;

  // Document label
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(label, MARGIN, y);
  y += 20;

  // Calculate image dimensions to fit within content area
  // Max width is content width, max height is available space minus footer
  const maxWidth = CONTENT_WIDTH;
  const maxHeight = PAGE_HEIGHT - y - MARGIN - 40; // Leave space for footer

  // Add the image - jsPDF will handle format conversion
  try {
    const imgDataUri = `data:image/${imageData.format.toLowerCase()};base64,${imageData.base64}`;

    // Add image with auto-calculated dimensions
    // Use 'FAST' compression to avoid CPU-intensive processing in serverless
    doc.addImage(
      imgDataUri,
      imageData.format,
      MARGIN,
      y,
      maxWidth,
      maxHeight,
      undefined,
      'FAST' // Fast compression - safer for serverless environments
    );
  } catch (imgError) {
    // If image fails to render, add placeholder text
    logger.error('Failed to embed image in PDF', { label, error: imgError });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('[Image could not be embedded - see original upload]', MARGIN, y);
  }

  // Add footer
  addFooter(doc, refId, date, pageNum, totalPages);
}

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Types
interface TaxIntakeData {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email: string;
  phone: string;
  country_code?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  // Identity Information
  date_of_birth?: string | null;
  ssn?: string | null;
  // Tax Filing Information
  filing_status?: string | null;
  employment_type?: string | null;
  occupation?: string | null;
  claimed_as_dependent?: string | null;
  in_college?: string | null;
  // Dependents
  has_dependents?: boolean | string | null;
  number_of_dependents?: number | string | null;
  dependents_under_24_student_or_disabled?: string | null;
  dependents_in_college?: string | null;
  child_care_provider?: string | null;
  // Property & Tax Credits
  has_mortgage?: boolean | string | null;
  wants_refund_advance?: boolean | string | null;
  denied_eitc?: boolean | string | null;
  has_irs_pin?: boolean | string | null;
  irs_pin?: string | null;
  // Identification Documents
  drivers_license?: string | null;
  license_expiration?: string | null;
  // Attribution
  referrerUsername?: string | null;
  referrerType?: string | null;
  tax_year?: number | null;
  created_at: Date | string;
  // Image attachments
  drivers_license_url?: string | null;
  ssn_card_url?: string | null;
  additional_document_urls?: string[] | null;
}

interface ContactFormData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  service?: string | null;
  message?: string | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  createdAt: Date | string;
}

// Affiliate Application Data
interface AffiliateApplicationData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experience?: string | null;
  audience?: string | null;
  platforms?: string[] | null;
  website?: string | null;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
  } | null;
  message?: string | null;
  bondedPreparerId?: string | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  createdAt: Date | string;
}

// Preparer Application Data
interface PreparerApplicationData {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  email: string;
  phone: string;
  languages: string;
  experienceLevel: string;
  taxSoftware?: string[] | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  createdAt: Date | string;
}

// Cash Advance Lead Data
interface CashAdvanceData {
  id: string;
  firstName: string;
  phone: string;
  email?: string | null;
  zipCode: string;
  preferredFiling?: string | null;
  bestTimeToContact?: string | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  createdAt: Date | string;
}

// Appointment Booking Data
interface AppointmentData {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  appointmentType: string;
  scheduledFor?: Date | string | null;
  duration?: number | null;
  notes?: string | null;
  timezone?: string | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  createdAt: Date | string;
}

// Referral Signup Data
interface ReferralSignupData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referralCode: string;
  createdAt: Date | string;
}

// Customer Lead Data
interface CustomerLeadData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  taxSituation?: string | null;
  estimatedIncome?: string | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  createdAt: Date | string;
}

// Affiliate Lead Data (simple form)
interface AffiliateLeadData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experience?: string | null;
  audience?: string | null;
  message?: string | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  createdAt: Date | string;
}

// Constants
const PAGE_WIDTH = 612; // US Letter width in points (8.5")
const PAGE_HEIGHT = 792; // US Letter height in points (11")
const MARGIN = 54; // 0.75" margins
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

// Formatting helpers
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBoolean(value: boolean | string | null | undefined): string {
  if (value === null || value === undefined) return 'Not specified';
  if (typeof value === 'string') {
    return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : capitalize(value);
  }
  return value ? 'Yes' : 'No';
}

function capitalize(str: string | null | undefined): string {
  if (!str) return 'Not specified';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase().replace(/_/g, ' ');
}

function titleCase(str: string): string {
  return str.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Add header with company name and form title
 */
function addHeader(doc: jsPDF, title: string): number {
  let y = MARGIN;

  // Company name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX GENIUS PRO', MARGIN, y);

  // Form title
  y += 24;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(title, MARGIN, y);

  // Horizontal line
  y += 8;
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  return y + 16;
}

/**
 * Add section header
 */
function addSectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, y);

  // Underline
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + doc.getTextWidth(title), y);

  return y + 12;
}

/**
 * Add footer with reference ID, date, and page number
 */
function addFooter(doc: jsPDF, refId: string, date: string, pageNum: number, totalPages: number): void {
  const footerY = PAGE_HEIGHT - MARGIN + 20;

  // Horizontal line
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY - 8, PAGE_WIDTH - MARGIN, footerY - 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Left: Reference ID
  doc.text(`Ref: ${refId}`, MARGIN, footerY);

  // Center: Date
  const dateText = `Submitted: ${date}`;
  const dateWidth = doc.getTextWidth(dateText);
  doc.text(dateText, (PAGE_WIDTH - dateWidth) / 2, footerY);

  // Right: Page number
  const pageText = `Page ${pageNum} of ${totalPages}`;
  const pageWidth = doc.getTextWidth(pageText);
  doc.text(pageText, PAGE_WIDTH - MARGIN - pageWidth, footerY);
}

/**
 * Generate professional PDF for Tax Intake Lead form
 */
export async function generateTaxIntakePDF(data: TaxIntakeData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let y = addHeader(doc, 'Tax Intake Form');

  // Personal Information Section
  y = addSectionHeader(doc, 'PERSONAL INFORMATION', y);

  const fullName = [data.first_name, data.middle_name, data.last_name]
    .filter(Boolean)
    .join(' ');

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Full Name:', titleCase(fullName)],
      ['Email Address:', data.email.toLowerCase()],
      ['Phone Number:', formatPhone(data.phone)],
      ['Date of Birth:', data.date_of_birth || 'Not provided'],
      ['SSN:', data.ssn || 'Not provided'],
      ['Tax Year:', data.tax_year?.toString() || 'Current Year'],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Address Section
  if (data.address_line_1 || data.city) {
    y = addSectionHeader(doc, 'ADDRESS', y);

    const addressLines: string[][] = [];
    if (data.address_line_1) {
      addressLines.push(['Street Address:', data.address_line_1]);
    }
    if (data.address_line_2) {
      addressLines.push(['Address Line 2:', data.address_line_2]);
    }
    if (data.city || data.state || data.zip_code) {
      const cityStateZip = [
        data.city,
        data.state ? data.state.toUpperCase() : null,
        data.zip_code,
      ].filter(Boolean).join(', ');
      addressLines.push(['City, State, ZIP:', cityStateZip]);
    }

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 4,
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 120 },
        1: { cellWidth: CONTENT_WIDTH - 120 },
      },
      body: addressLines,
    });

    y = doc.lastAutoTable.finalY + 16;
  }

  // Tax Information Section
  y = addSectionHeader(doc, 'TAX INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Filing Status:', capitalize(data.filing_status)],
      ['Employment Type:', capitalize(data.employment_type)],
      ['Occupation:', data.occupation || 'Not specified'],
      ['Claimed as Dependent:', formatBoolean(data.claimed_as_dependent)],
      ['In College:', formatBoolean(data.in_college)],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Dependents Section
  y = addSectionHeader(doc, 'DEPENDENTS', y);

  const dependentRows: string[][] = [
    ['Has Dependents:', formatBoolean(data.has_dependents)],
    ['Number of Dependents:', data.number_of_dependents?.toString() || '0'],
  ];

  // Add conditional fields if has dependents
  const hasDeps = data.has_dependents === 'yes' || data.has_dependents === true;
  if (hasDeps) {
    dependentRows.push(['Under 24/Student/Disabled:', formatBoolean(data.dependents_under_24_student_or_disabled)]);
    dependentRows.push(['Dependents in College:', formatBoolean(data.dependents_in_college)]);
    dependentRows.push(['Child Care Provider:', formatBoolean(data.child_care_provider)]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: dependentRows,
  });

  y = doc.lastAutoTable.finalY + 16;

  // Property & Tax Credits Section
  y = addSectionHeader(doc, 'PROPERTY & TAX CREDITS', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Has Mortgage:', formatBoolean(data.has_mortgage)],
      ['Previously Denied EITC:', formatBoolean(data.denied_eitc)],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // IRS Information & Refund Section
  y = addSectionHeader(doc, 'IRS INFORMATION & REFUND', y);

  const irsRows: string[][] = [
    ['Has IRS PIN:', formatBoolean(data.has_irs_pin)],
  ];

  // Add IRS PIN if provided
  if (data.irs_pin) {
    irsRows.push(['IRS PIN:', data.irs_pin]);
  }

  irsRows.push(['Wants Refund Advance:', formatBoolean(data.wants_refund_advance)]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: irsRows,
  });

  y = doc.lastAutoTable.finalY + 16;

  // Identification Documents Section
  y = addSectionHeader(doc, 'IDENTIFICATION DOCUMENTS', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ["Driver's License #:", data.drivers_license || 'Not provided'],
      ['License Expiration:', data.license_expiration || 'Not provided'],
      ['Document Uploaded:', data.drivers_license_url ? 'Yes - See attached' : 'No'],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Attribution Section
  y = addSectionHeader(doc, 'REFERRAL INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Referred By:', data.referrerUsername || 'Direct'],
      ['Referrer Type:', capitalize(data.referrerType)],
    ],
  });

  // Collect all image URLs to embed
  const imagesToEmbed: { url: string; label: string }[] = [];

  if (data.drivers_license_url) {
    imagesToEmbed.push({ url: data.drivers_license_url, label: "Driver's License" });
  }
  if (data.ssn_card_url) {
    imagesToEmbed.push({ url: data.ssn_card_url, label: 'Social Security Card' });
  }
  if (data.additional_document_urls && data.additional_document_urls.length > 0) {
    data.additional_document_urls.forEach((url, index) => {
      imagesToEmbed.push({ url, label: `Additional Document ${index + 1}` });
    });
  }

  // Calculate total pages (1 for form + 1 per image)
  const totalPages = 1 + imagesToEmbed.length;

  // Add footer to first page
  const refId = data.id.slice(-8).toUpperCase();
  const submittedDate = formatDate(data.created_at);
  addFooter(doc, refId, submittedDate, 1, totalPages);

  // Fetch and embed each image on its own page
  let currentPage = 2;
  for (const { url, label } of imagesToEmbed) {
    try {
      const imageData = await fetchImageAsBase64(url);
      if (imageData) {
        addImagePage(doc, imageData, label, refId, submittedDate, currentPage, totalPages);
        logger.info('Image embedded in PDF', { label, url: url.substring(0, 50) + '...' });
      } else {
        // Add a page noting the image couldn't be loaded
        doc.addPage();
        let iy = addHeader(doc, 'Document Attachment');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(label, MARGIN, iy);
        iy += 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('[Image could not be loaded - please access via original upload link]', MARGIN, iy);
        iy += 16;
        doc.setFont('helvetica', 'normal');
        doc.text(`URL: ${url}`, MARGIN, iy);
        addFooter(doc, refId, submittedDate, currentPage, totalPages);
      }
    } catch (imgError) {
      logger.error('Failed to process image for PDF', { label, url, error: imgError });
      // Continue with other images
    }
    currentPage++;
  }

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generate professional PDF for Contact Form submission
 */
export async function generateContactFormPDF(data: ContactFormData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let y = addHeader(doc, 'Contact Form Submission');

  // Contact Information Section
  y = addSectionHeader(doc, 'CONTACT INFORMATION', y);

  const fullName = `${data.firstName} ${data.lastName}`;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Full Name:', titleCase(fullName)],
      ['Email Address:', data.email.toLowerCase()],
      ['Phone Number:', data.phone ? formatPhone(data.phone) : 'Not provided'],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Service Request Section
  y = addSectionHeader(doc, 'SERVICE REQUEST', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Service:', capitalize(data.service)],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Message Section
  y = addSectionHeader(doc, 'MESSAGE', y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Word wrap the message
  const messageLines = doc.splitTextToSize(
    data.message || 'No message provided',
    CONTENT_WIDTH
  );

  doc.text(messageLines, MARGIN, y);
  y += messageLines.length * 14 + 16;

  // Attribution Section
  y = addSectionHeader(doc, 'REFERRAL INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Referred By:', data.referrerUsername || 'Direct'],
      ['Referrer Type:', capitalize(data.referrerType)],
    ],
  });

  // Add footer
  const refId = data.id.slice(-8).toUpperCase();
  const submittedDate = formatDate(data.createdAt);
  addFooter(doc, refId, submittedDate, 1, 1);

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generate professional PDF for Affiliate Application
 */
export async function generateAffiliateApplicationPDF(data: AffiliateApplicationData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let y = addHeader(doc, 'Affiliate Application');

  // Personal Information Section
  y = addSectionHeader(doc, 'PERSONAL INFORMATION', y);

  const fullName = `${data.firstName} ${data.lastName}`;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Full Name:', titleCase(fullName)],
      ['Email Address:', data.email.toLowerCase()],
      ['Phone Number:', formatPhone(data.phone)],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Marketing Experience Section
  y = addSectionHeader(doc, 'MARKETING EXPERIENCE', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Experience:', data.experience || 'Not specified'],
      ['Target Audience:', data.audience || 'Not specified'],
      ['Platforms:', data.platforms?.join(', ') || 'Not specified'],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Online Presence Section
  y = addSectionHeader(doc, 'ONLINE PRESENCE', y);

  const onlineRows: string[][] = [
    ['Website:', data.website || 'Not provided'],
  ];

  if (data.socialMedia) {
    if (data.socialMedia.facebook) onlineRows.push(['Facebook:', data.socialMedia.facebook]);
    if (data.socialMedia.instagram) onlineRows.push(['Instagram:', data.socialMedia.instagram]);
    if (data.socialMedia.twitter) onlineRows.push(['Twitter:', data.socialMedia.twitter]);
    if (data.socialMedia.tiktok) onlineRows.push(['TikTok:', data.socialMedia.tiktok]);
    if (data.socialMedia.youtube) onlineRows.push(['YouTube:', data.socialMedia.youtube]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: onlineRows,
  });

  y = doc.lastAutoTable.finalY + 16;

  // Message Section
  if (data.message) {
    y = addSectionHeader(doc, 'ADDITIONAL MESSAGE', y);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const messageLines = doc.splitTextToSize(data.message, CONTENT_WIDTH);
    doc.text(messageLines, MARGIN, y);
    y += messageLines.length * 14 + 16;
  }

  // Bonding Information Section
  if (data.bondedPreparerId) {
    y = addSectionHeader(doc, 'BONDING REQUEST', y);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 4,
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 120 },
        1: { cellWidth: CONTENT_WIDTH - 120 },
      },
      body: [
        ['Bonded to Preparer:', data.bondedPreparerId],
        ['Status:', 'Pending Approval'],
      ],
    });

    y = doc.lastAutoTable.finalY + 16;
  }

  // Attribution Section
  y = addSectionHeader(doc, 'REFERRAL INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Referred By:', data.referrerUsername || 'Direct'],
      ['Referrer Type:', capitalize(data.referrerType)],
    ],
  });

  // Add footer
  const refId = data.id.slice(-8).toUpperCase();
  const submittedDate = formatDate(data.createdAt);
  addFooter(doc, refId, submittedDate, 1, 1);

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generate professional PDF for Tax Preparer Application
 */
export async function generatePreparerApplicationPDF(data: PreparerApplicationData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let y = addHeader(doc, 'Tax Preparer Application');

  // Personal Information Section
  y = addSectionHeader(doc, 'PERSONAL INFORMATION', y);

  const fullName = [data.firstName, data.middleName, data.lastName]
    .filter(Boolean)
    .join(' ');

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Full Name:', titleCase(fullName)],
      ['Email Address:', data.email.toLowerCase()],
      ['Phone Number:', formatPhone(data.phone)],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Professional Details Section
  y = addSectionHeader(doc, 'PROFESSIONAL DETAILS', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Languages:', data.languages],
      ['Experience Level:', capitalize(data.experienceLevel)],
      ['Tax Software:', data.taxSoftware?.join(', ') || 'Not specified'],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Attribution Section
  y = addSectionHeader(doc, 'REFERRAL INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Referred By:', data.referrerUsername || 'Direct'],
      ['Referrer Type:', capitalize(data.referrerType)],
    ],
  });

  // Add footer
  const refId = data.id.slice(-8).toUpperCase();
  const submittedDate = formatDate(data.createdAt);
  addFooter(doc, refId, submittedDate, 1, 1);

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generate professional PDF for Cash Advance Lead
 */
export async function generateCashAdvancePDF(data: CashAdvanceData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let y = addHeader(doc, 'Cash Advance Lead');

  // Contact Information Section
  y = addSectionHeader(doc, 'CONTACT INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['First Name:', titleCase(data.firstName)],
      ['Phone Number:', formatPhone(data.phone)],
      ['Email Address:', data.email?.toLowerCase() || 'Not provided'],
      ['ZIP Code:', data.zipCode],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Preferences Section
  y = addSectionHeader(doc, 'PREFERENCES', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Preferred Filing:', capitalize(data.preferredFiling)],
      ['Best Time to Contact:', data.bestTimeToContact || 'Not specified'],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Attribution Section
  y = addSectionHeader(doc, 'REFERRAL INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Referred By:', data.referrerUsername || 'Direct'],
      ['Referrer Type:', capitalize(data.referrerType)],
    ],
  });

  // Add footer
  const refId = data.id.slice(-8).toUpperCase();
  const submittedDate = formatDate(data.createdAt);
  addFooter(doc, refId, submittedDate, 1, 1);

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generate professional PDF for Appointment Booking
 */
export async function generateAppointmentPDF(data: AppointmentData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let y = addHeader(doc, 'Appointment Booking');

  // Client Information Section
  y = addSectionHeader(doc, 'CLIENT INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Client Name:', titleCase(data.clientName)],
      ['Email Address:', data.clientEmail.toLowerCase()],
      ['Phone Number:', formatPhone(data.clientPhone)],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Appointment Details Section
  y = addSectionHeader(doc, 'APPOINTMENT DETAILS', y);

  const appointmentRows: string[][] = [
    ['Appointment Type:', capitalize(data.appointmentType)],
  ];

  if (data.scheduledFor) {
    appointmentRows.push(['Scheduled For:', formatDate(data.scheduledFor)]);
  }

  if (data.duration) {
    appointmentRows.push(['Duration:', `${data.duration} minutes`]);
  }

  if (data.timezone) {
    appointmentRows.push(['Timezone:', data.timezone]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: appointmentRows,
  });

  y = doc.lastAutoTable.finalY + 16;

  // Notes Section
  if (data.notes) {
    y = addSectionHeader(doc, 'NOTES', y);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const notesLines = doc.splitTextToSize(data.notes, CONTENT_WIDTH);
    doc.text(notesLines, MARGIN, y);
    y += notesLines.length * 14 + 16;
  }

  // Attribution Section
  y = addSectionHeader(doc, 'REFERRAL INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Referred By:', data.referrerUsername || 'Direct'],
      ['Referrer Type:', capitalize(data.referrerType)],
    ],
  });

  // Add footer
  const refId = data.id.slice(-8).toUpperCase();
  const submittedDate = formatDate(data.createdAt);
  addFooter(doc, refId, submittedDate, 1, 1);

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generate professional PDF for Referral Signup
 */
export async function generateReferralSignupPDF(data: ReferralSignupData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let y = addHeader(doc, 'Referral Program Signup');

  // Personal Information Section
  y = addSectionHeader(doc, 'PERSONAL INFORMATION', y);

  const fullName = `${data.firstName} ${data.lastName}`;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Full Name:', titleCase(fullName)],
      ['Email Address:', data.email.toLowerCase()],
      ['Phone Number:', formatPhone(data.phone)],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Referral Code Section
  y = addSectionHeader(doc, 'REFERRAL CODE', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Assigned Code:', data.referralCode],
      ['Referral Link:', `taxgeniuspro.tax/go/${data.referralCode}`],
    ],
  });

  // Add footer
  const refId = data.id.slice(-8).toUpperCase();
  const submittedDate = formatDate(data.createdAt);
  addFooter(doc, refId, submittedDate, 1, 1);

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generate professional PDF for Customer Lead
 */
export async function generateCustomerLeadPDF(data: CustomerLeadData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let y = addHeader(doc, 'Customer Lead');

  // Contact Information Section
  y = addSectionHeader(doc, 'CONTACT INFORMATION', y);

  const fullName = `${data.firstName} ${data.lastName}`;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Full Name:', titleCase(fullName)],
      ['Email Address:', data.email.toLowerCase()],
      ['Phone Number:', formatPhone(data.phone)],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Tax Information Section
  y = addSectionHeader(doc, 'TAX INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Tax Situation:', data.taxSituation || 'Not specified'],
      ['Estimated Income:', data.estimatedIncome || 'Not specified'],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Attribution Section
  y = addSectionHeader(doc, 'REFERRAL INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Referred By:', data.referrerUsername || 'Direct'],
      ['Referrer Type:', capitalize(data.referrerType)],
    ],
  });

  // Add footer
  const refId = data.id.slice(-8).toUpperCase();
  const submittedDate = formatDate(data.createdAt);
  addFooter(doc, refId, submittedDate, 1, 1);

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generate professional PDF for Affiliate Lead (simple form)
 */
export async function generateAffiliateLeadPDF(data: AffiliateLeadData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  let y = addHeader(doc, 'Affiliate Lead');

  // Personal Information Section
  y = addSectionHeader(doc, 'PERSONAL INFORMATION', y);

  const fullName = `${data.firstName} ${data.lastName}`;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Full Name:', titleCase(fullName)],
      ['Email Address:', data.email.toLowerCase()],
      ['Phone Number:', formatPhone(data.phone)],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Marketing Experience Section
  y = addSectionHeader(doc, 'MARKETING EXPERIENCE', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Experience:', data.experience || 'Not specified'],
      ['Target Audience:', data.audience || 'Not specified'],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Message Section
  if (data.message) {
    y = addSectionHeader(doc, 'ADDITIONAL MESSAGE', y);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const messageLines = doc.splitTextToSize(data.message, CONTENT_WIDTH);
    doc.text(messageLines, MARGIN, y);
    y += messageLines.length * 14 + 16;
  }

  // Attribution Section
  y = addSectionHeader(doc, 'REFERRAL INFORMATION', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { cellWidth: CONTENT_WIDTH - 120 },
    },
    body: [
      ['Referred By:', data.referrerUsername || 'Direct'],
      ['Referrer Type:', capitalize(data.referrerType)],
    ],
  });

  // Add footer
  const refId = data.id.slice(-8).toUpperCase();
  const submittedDate = formatDate(data.createdAt);
  addFooter(doc, refId, submittedDate, 1, 1);

  // Convert to Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
