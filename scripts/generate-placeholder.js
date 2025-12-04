const sharp = require('sharp');
const path = require('path');

// Create a 384x384 placeholder image with Tax Genius Pro branding
const createPlaceholder = async () => {
  const width = 384;
  const height = 384;

  // Create SVG with Tax Genius Pro colors (yellow and green)
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background gradient -->
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f9d938;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#408851;stop-opacity:0.3" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#f2f7ff"/>
      <rect width="${width}" height="${height}" fill="url(#grad1)"/>

      <!-- Shopping bag icon -->
      <g transform="translate(${width / 2}, ${height / 2})">
        <!-- Bag body -->
        <rect x="-60" y="-40" width="120" height="100" rx="8" fill="#408851" opacity="0.8"/>

        <!-- Bag handle -->
        <path d="M -40,-40 Q -40,-70 0,-70 Q 40,-70 40,-40"
              stroke="#408851" stroke-width="8" fill="none" opacity="0.8"/>

        <!-- Dollar sign -->
        <text x="0" y="25" font-family="Arial, sans-serif" font-size="60"
              font-weight="bold" fill="#f9d938" text-anchor="middle">$</text>
      </g>

      <!-- Product text -->
      <text x="${width / 2}" y="${height - 30}" font-family="Arial, sans-serif"
            font-size="18" fill="#666" text-anchor="middle" opacity="0.6">Product Image</text>
    </svg>
  `;

  try {
    // Convert SVG to PNG
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(__dirname, '../public/placeholder-product.png'));

    console.log('✅ placeholder-product.png created successfully!');
  } catch (error) {
    console.error('❌ Error creating placeholder:', error);
    process.exit(1);
  }
};

createPlaceholder();
