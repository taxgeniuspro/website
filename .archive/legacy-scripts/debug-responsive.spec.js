const { test, expect } = require('@playwright/test');

test('Debug font scaling issue', async ({ page }) => {
  // Test at desktop size
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('http://localhost:3005');
  await page.waitForLoadState('domcontentloaded');

  // Check if h1 element exists and get its computed styles
  const h1 = page.locator('h1').first();
  await expect(h1).toBeVisible();

  // Get all computed styles
  const styles = await h1.evaluate(element => {
    const computed = window.getComputedStyle(element);
    return {
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      display: computed.display,
      className: element.className,
      innerText: element.innerText.substring(0, 50)
    };
  });

  console.log('H1 styles at 1200px width:', styles);

  // Check if Tailwind CSS classes are applied
  const hasClasses = await h1.evaluate(element => {
    const classList = Array.from(element.classList);
    return {
      allClasses: classList,
      hasTextClasses: classList.filter(c => c.startsWith('text-')),
      hasMdClasses: classList.filter(c => c.includes('md:')),
      hasLgClasses: classList.filter(c => c.includes('lg:'))
    };
  });

  console.log('H1 classes:', hasClasses);

  // Test different viewport sizes
  const viewports = [400, 600, 768, 1024, 1440];
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(100); // Let styles recalculate

    const fontSize = await h1.evaluate(el => window.getComputedStyle(el).fontSize);
    console.log(`Font size at ${width}px: ${fontSize}`);
  }
});