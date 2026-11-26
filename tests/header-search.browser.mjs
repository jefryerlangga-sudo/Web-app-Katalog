import { chromium } from 'playwright';

const base = process.env.SEARCH_URL || 'http://127.0.0.1:3000/?contoh-cari=1';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const failures = [];

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Cari produk' }).waitFor({ timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, 700));
  const box = page.getByRole('textbox', { name: 'Cari produk' });
  await box.fill('Speaker');
  await page.waitForTimeout(200);

  const textboxes = await page.getByRole('textbox').count();
  if (textboxes !== 1) failures.push(`expected 1 search box, found ${textboxes}`);

  const body = await page.locator('body').innerText();
  if (!body.includes('Olike SV16 Speaker Bluetooth')) failures.push('speaker name missing');
  if (!body.includes('Kabel Data Anyam')) failures.push('brand match missing');
  if (!body.includes('Holder Dashboard')) failures.push('compatibility match missing');
  if (body.includes('Advance LED Sensor Lighting')) failures.push('LED still listed');
  if (body.includes('Advance SET TOP BOX')) failures.push('set-top box still listed');
  if (body.includes('Cari SKU, nama produk')) failures.push('duplicate in-list search still present');

  const gap = await page.evaluate(() => {
    const header = document.querySelector('header');
    const bar = document.getElementById('catalog-toolbar');
    if (!header || !bar) return -1;
    return Math.round(bar.getBoundingClientRect().top - header.getBoundingClientRect().bottom);
  });
  if (gap < 0 || gap > 24) failures.push(`gap under header is ${gap}px`);

  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`ok viewport 390 speaker search, header gap ${gap}px`);
  }
} finally {
  await browser.close();
}
