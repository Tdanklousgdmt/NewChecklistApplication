import puppeteer from 'puppeteer';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = './docs/screenshots';
if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

async function waitForContent(page, maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const loading = await page.evaluate(() => {
      const text = document.body?.innerText || '';
      return text.includes('Loading') && !text.includes('Welcome') && !text.includes('Role');
    });
    if (!loading) return;
    await new Promise(r => setTimeout(r, 500));
  }
}

async function shot(page, name, scrollY = 0) {
  if (scrollY) {
    await page.evaluate(y => window.scrollTo(0, y), scrollY);
    await new Promise(r => setTimeout(r, 400));
  }
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: `${OUT_DIR}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
}

async function clickBtn(page, pattern) {
  // Use page.evaluate to click - avoids "not clickable" errors
  const clicked = await page.evaluate((pat) => {
    const re = new RegExp(pat, 'i');
    const els = [...document.querySelectorAll('button, [role="button"], [role="tab"]')];
    for (const el of els) {
      if (re.test(el.textContent?.trim() || '')) {
        el.click();
        return el.textContent?.trim();
      }
    }
    return null;
  }, pattern.source);
  return clicked;
}

// Load manager dashboard
const mgr = await browser.newPage();
await mgr.setViewport({ width: 1440, height: 900 });
await mgr.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await mgr.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
await mgr.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
await waitForContent(mgr, 25000);
await new Promise(r => setTimeout(r, 1500));

// Click Create New
const r1 = await clickBtn(mgr, /Create New/);
console.log('Clicked:', r1);
await new Promise(r => setTimeout(r, 2500));

// ── STEP 1 ────────────────────────────────────────────────────────────────────
const s1Heading = await mgr.evaluate(() =>
  [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span')].find(e => /step 1|configuration|metadata|checklist/i.test(e.textContent || ''))?.textContent?.trim()
);
console.log('Step 1 heading:', s1Heading);

await mgr.evaluate(() => window.scrollTo(0, 0));
await shot(mgr, '11_create_step1_top');
await shot(mgr, '11b_create_step1_bottom', 500);

// Find and log all interactive elements on Step 1
const step1Els = await mgr.evaluate(() =>
  [...document.querySelectorAll('button,input,select,label')].map(e => ({
    tag: e.tagName,
    text: e.textContent?.trim().slice(0, 50) || '',
    type: e.getAttribute('type') || '',
  })).filter(e => e.text).slice(0, 20)
);
console.log('Step 1 elements:', JSON.stringify(step1Els, null, 2));

// ── NAVIGATE TO STEP 2 ────────────────────────────────────────────────────────
await mgr.evaluate(() => window.scrollTo(0, 0));
const r2 = await clickBtn(mgr, /^Next$|Next →|Continue|Questions|Field/);
console.log('Clicked next:', r2);
await new Promise(r => setTimeout(r, 2500));

const s2Heading = await mgr.evaluate(() =>
  document.body?.innerText?.slice(0, 200)
);
console.log('After step2 click, body starts:', s2Heading);

await shot(mgr, '12_create_step2_top');
await shot(mgr, '12b_create_step2_palette', 300);

// ── NAVIGATE TO STEP 3 ────────────────────────────────────────────────────────
await mgr.evaluate(() => window.scrollTo(0, 0));
const r3 = await clickBtn(mgr, /^Next$|Next →|Continue|Preview|Publish/);
console.log('Clicked step3:', r3);
await new Promise(r => setTimeout(r, 2500));
await shot(mgr, '13_create_step3_preview');

await browser.close();
console.log('\n✅ Wizard screenshots done');
