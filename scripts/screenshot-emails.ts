import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

async function screenshotEmails() {
  const inputDir = path.join(process.cwd(), 'test-results', 'email-previews');
  const outputDir = path.join(process.cwd(), 'test-results', 'email-screenshots');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Set viewport for email width
  await page.setViewport({ width: 700, height: 1200 });

  const files = fs.readdirSync(inputDir).filter((f) => f.endsWith('.html'));

  for (const file of files) {
    const filePath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file.replace('.html', '.png'));

    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });

    // Get full page height
    const bodyHandle = await page.$('body');
    const boundingBox = await bodyHandle?.boundingBox();

    if (boundingBox) {
      await page.setViewport({
        width: 700,
        height: Math.ceil(boundingBox.height) + 50,
      });
    }

    await page.screenshot({
      path: outputPath,
      fullPage: true,
    });

    console.log(`📸 Screenshot: ${file.replace('.html', '.png')}`);
  }

  await browser.close();
  console.log(`\n📁 Screenshots saved to: ${outputDir}`);
}

screenshotEmails().catch(console.error);
