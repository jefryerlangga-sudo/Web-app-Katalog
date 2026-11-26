import { chromium } from 'playwright';

const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

try {
  await page.goto(`${origin}/?contoh-cari=1`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Baterai', exact: true }).click();
  await page.getByRole('heading', { name: 'Baterai HP OG, HX, dan LF' }).waitFor();
  let text = await page.locator('body').innerText();
  expect(text.includes('Baterai OG BL-49FX'), 'OG battery missing after switch');
  expect(!text.includes('Advance LED Sensor Lighting'), 'accessory shown in battery mode');

  await page.getByRole('button', { name: 'OG', exact: true }).click();
  await page.getByRole('textbox', { name: 'Cari produk' }).fill('BL-49FX');
  await page.waitForTimeout(150);
  text = await page.locator('body').innerText();
  expect(text.includes('Baterai OG BL-49FX'), 'BL-49FX missing');
  expect(!text.includes('Baterai HX BN-5V'), 'HX still listed for BL-49FX');
  expect(!text.includes('Baterai LF iPhone 11'), 'LF still listed for BL-49FX');

  await page.getByRole('button', { name: 'HX', exact: true }).click();
  text = await page.locator('body').innerText();
  expect(!text.includes('Baterai OG BL-49FX'), 'OG still listed under HX filter');

  await page.goto(`${origin}/baterai?contoh-cari=1`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Baterai HP OG, HX, dan LF' }).waitFor();
  text = await page.locator('body').innerText();
  expect(text.includes('Mode Baterai'), 'deep link did not open battery mode');
  expect(text.includes('Baterai LF iPhone 11'), 'LF battery missing on deep link');

  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('ok battery mode switch, filters, search, and /baterai');
  }
} finally {
  await browser.close();
}
