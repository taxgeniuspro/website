/**
 * PDF Form Generator Service
 *
 * Generates professional, black-and-white PDF forms for email attachments.
 * Designed for print-ready output with proper labeling and formatting.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  filing_status?: string | null;
  employment_type?: string | null;
  occupation?: string | null;
  has_dependents?: boolean | null;
  number_of_dependents?: number | null;
  has_mortgage?: boolean | null;
  wants_refund_advance?: boolean | null;
  denied_eitc?: boolean | null;
  has_irs_pin?: boolean | null;
  referrerUsername?: string | null;
  referrerType?: string | null;
  tax_year?: number | null;
  created_at: Date | string;
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

function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return 'Not specified';
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
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Dependents Section
  y = addSectionHeader(doc, 'DEPENDENTS', y);

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
      ['Has Dependents:', formatBoolean(data.has_dependents)],
      ['Number of Dependents:', data.number_of_dependents?.toString() || '0'],
    ],
  });

  y = doc.lastAutoTable.finalY + 16;

  // Additional Information Section
  y = addSectionHeader(doc, 'ADDITIONAL INFORMATION', y);

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
      ['Has IRS PIN:', formatBoolean(data.has_irs_pin)],
      ['Wants Refund Advance:', formatBoolean(data.wants_refund_advance)],
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
  const submittedDate = formatDate(data.created_at);
  addFooter(doc, refId, submittedDate, 1, 1);

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
