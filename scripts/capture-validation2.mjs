import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = './docs/screenshots';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// Set role first then navigate
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('echeck_user_role', 'manager');
});

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise(r => setTimeout(r, 4000));

// Log all buttons
const allBtns = await page.evaluate(() =>
  [...document.querySelectorAll('button')].map(b => b.textContent?.trim().slice(0, 60))
);
console.log('All buttons after load:', JSON.stringify(allBtns, null, 2));

// Click "Validations" tab
let found = false;
for (const text of ['Validations', 'Validation', 'Pending']) {
  const btns = await page.$$('button');
  for (const btn of btns) {
    const txt = await page.evaluate(el => el.textContent?.trim(), btn);
    if (txt.includes(text)) {
      await btn.click();
      console.log(`Clicked tab: ${txt}`);
      found = true;
      break;
    }
  }
  if (found) break;
}

await new Promise(r => setTimeout(r, 2000));

// Take screenshot of the validations tab
await page.screenshot({ path: `${OUT_DIR}/03_dashboard_manager_validations.png` });
console.log('✓ 03_dashboard_manager_validations.png');

// Click first "Review" button
const btns3 = await page.$$('button');
for (const btn of btns3) {
  const txt = await page.evaluate(el => el.textContent?.trim(), btn);
  if (/^Review$/i.test(txt)) {
    await btn.click();
    console.log('Clicked Review button');
    break;
  }
}

await new Promise(r => setTimeout(r, 3500));

const heading = await page.evaluate(() =>
  [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => h.textContent?.trim()).join(' | ')
);
console.log('Current headings:', heading);

await page.screenshot({ path: `${OUT_DIR}/11_validation_screen.png` });
console.log('✓ 11_validation_screen.png');

await page.evaluate(() => window.scrollBy(0, 500));
await new Promise(r => setTimeout(r, 500));
await page.screenshot({ path: `${OUT_DIR}/11b_validation_bottom.png` });
console.log('✓ 11b_validation_bottom.png');

await browser.close();
