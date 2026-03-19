import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = './docs/screenshots';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
await page.evaluate(() => location.reload());
await new Promise(r => setTimeout(r, 3500));

// Click "Validations" tab
const btns = await page.$$('button');
for (const btn of btns) {
  const txt = await page.evaluate(el => el.textContent?.trim(), btn);
  if (/Validation/i.test(txt)) { await btn.click(); break; }
}
await new Promise(r => setTimeout(r, 1500));

// Log all buttons again
const allBtns = await page.evaluate(() =>
  [...document.querySelectorAll('button')].map(b => b.textContent?.trim().slice(0, 60))
);
console.log('Buttons on Validations tab:', JSON.stringify(allBtns, null, 2));

// Try clicking "Review"
const btns2 = await page.$$('button');
let reviewFound = false;
for (const btn of btns2) {
  const txt = await page.evaluate(el => el.textContent?.trim(), btn);
  if (/^Review$/i.test(txt)) {
    console.log('Clicking Review...');
    await btn.click();
    reviewFound = true;
    break;
  }
}

await new Promise(r => setTimeout(r, 3000));

// Log URL / heading to confirm navigation
const heading = await page.evaluate(() =>
  document.querySelector('h1,h2,h3,h4')?.textContent?.trim()
);
console.log('Current heading:', heading);

const currentBtns = await page.evaluate(() =>
  [...document.querySelectorAll('button')].map(b => b.textContent?.trim().slice(0, 60)).slice(0, 15)
);
console.log('Current buttons:', JSON.stringify(currentBtns, null, 2));

await page.screenshot({ path: `${OUT_DIR}/11_validation_screen.png` });
console.log('✓ 11_validation_screen.png');

// scroll down for more
await page.evaluate(() => window.scrollBy(0, 600));
await new Promise(r => setTimeout(r, 500));
await page.screenshot({ path: `${OUT_DIR}/11b_validation_bottom.png` });
console.log('✓ 11b_validation_bottom.png');

await browser.close();
