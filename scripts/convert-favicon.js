const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertToIco() {
  try {
    const inputPath = path.join(__dirname, '../.aaaaaa/logo and icons/Tax-genius-logo-100x100.png');
    const outputPath = path.join(__dirname, '../public/favicon.ico');

    // Read the PNG file
    const pngBuffer = fs.readFileSync(inputPath);

    // Convert to ICO format (32x32 is standard favicon size)
    await sharp(pngBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath.replace('.ico', '-32x32.png'));

    // Also create 16x16 version
    await sharp(pngBuffer)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath.replace('.ico', '-16x16.png'));

    console.log('✅ Favicon images created successfully!');
    console.log('   - favicon-32x32.png');
    console.log('   - favicon-16x16.png');
    console.log('\nNote: .ico files require special tools. Using PNG fallback which works in modern browsers.');

  } catch (error) {
    console.error('❌ Error converting favicon:', error);
    process.exit(1);
  }
}

convertToIco();
