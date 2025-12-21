/**
 * Generate OG Images for Tax Genius Pro
 * Creates 1200x630 branded images for Facebook/Twitter sharing
 */

import sharp from 'sharp';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

async function generateOgImage() {
  console.log('Generating OG images...');

  // Create a 1200x630 image with Tax Genius Pro branding
  // Professional dark blue gradient background with logo
  const width = 1200;
  const height = 630;

  // Create SVG with professional branding
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a365d;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#2d4a7c;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1e3a5f;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#d4a54a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#f0d68a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#d4a54a;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bgGradient)"/>

      <!-- Decorative elements -->
      <rect x="0" y="580" width="1200" height="50" fill="url(#goldAccent)" opacity="0.8"/>
      <rect x="0" y="0" width="1200" height="8" fill="url(#goldAccent)" opacity="0.8"/>

      <!-- Subtle pattern overlay -->
      <rect width="100%" height="100%" fill="url(#bgGradient)" opacity="0.1"/>

      <!-- Main text - TAX GENIUS PRO -->
      <text x="600" y="280" font-family="Georgia, Times New Roman, serif" font-size="90" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="8">
        TAX GENIUS
      </text>
      <text x="600" y="360" font-family="Georgia, Times New Roman, serif" font-size="50" font-weight="bold" fill="url(#goldAccent)" text-anchor="middle" letter-spacing="12">
        PRO
      </text>

      <!-- Tagline -->
      <text x="600" y="440" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle" opacity="0.9">
        Professional Tax Preparation Services
      </text>

      <!-- Website URL -->
      <text x="600" y="540" font-family="Arial, sans-serif" font-size="22" fill="white" text-anchor="middle" opacity="0.7">
        taxgeniuspro.tax
      </text>
    </svg>
  `;

  // Generate English version
  const enBuffer = await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toBuffer();

  await sharp(enBuffer)
    .toFile(path.join(PUBLIC_DIR, 'og-image-en.jpg'));

  console.log('✓ Generated og-image-en.jpg');

  // Generate Spanish version
  const svgEs = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a365d;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#2d4a7c;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1e3a5f;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#d4a54a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#f0d68a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#d4a54a;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bgGradient)"/>

      <!-- Decorative elements -->
      <rect x="0" y="580" width="1200" height="50" fill="url(#goldAccent)" opacity="0.8"/>
      <rect x="0" y="0" width="1200" height="8" fill="url(#goldAccent)" opacity="0.8"/>

      <!-- Main text - TAX GENIUS PRO -->
      <text x="600" y="280" font-family="Georgia, Times New Roman, serif" font-size="90" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="8">
        TAX GENIUS
      </text>
      <text x="600" y="360" font-family="Georgia, Times New Roman, serif" font-size="50" font-weight="bold" fill="url(#goldAccent)" text-anchor="middle" letter-spacing="12">
        PRO
      </text>

      <!-- Spanish Tagline -->
      <text x="600" y="440" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle" opacity="0.9">
        Servicios Profesionales de Preparación de Impuestos
      </text>

      <!-- Website URL -->
      <text x="600" y="540" font-family="Arial, sans-serif" font-size="22" fill="white" text-anchor="middle" opacity="0.7">
        taxgeniuspro.tax
      </text>
    </svg>
  `;

  const esBuffer = await sharp(Buffer.from(svgEs))
    .jpeg({ quality: 90 })
    .toBuffer();

  await sharp(esBuffer)
    .toFile(path.join(PUBLIC_DIR, 'og-image-es.jpg'));

  console.log('✓ Generated og-image-es.jpg');

  // Verify dimensions
  const enMeta = await sharp(path.join(PUBLIC_DIR, 'og-image-en.jpg')).metadata();
  const esMeta = await sharp(path.join(PUBLIC_DIR, 'og-image-es.jpg')).metadata();

  console.log(`\nEnglish OG image: ${enMeta.width}x${enMeta.height}`);
  console.log(`Spanish OG image: ${esMeta.width}x${esMeta.height}`);
  console.log('\n✅ OG images generated successfully!');
}

generateOgImage().catch(console.error);
