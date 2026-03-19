import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = './docs/screenshots';
if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

async function newPage(vp = { width: 1440, height: 900 }) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  return page;
}

// Wait until no spinner/loading text is visible, up to maxMs
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
  const btns = await page.$$('button, [role="button"], [role="tab"]');
  for (const btn of btns) {
    const txt = await page.evaluate(el => el.textContent?.trim() || '', btn);
    if (pattern.test(txt)) { await btn.click(); return true; }
  }
  return false;
}

// ── ROLE SELECTION ─────────────────────────────────────────────────────────
console.log('\n── Role Selection');
{
  const page = await newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  // Clear role to show selection screen
  await page.evaluate(() => localStorage.removeItem('echeck_user_role'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '01_role_selection');
  await page.close();
}

// ── MANAGER DASHBOARD ──────────────────────────────────────────────────────
console.log('\n── Manager Dashboard');
const mgr = await newPage();
await mgr.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await mgr.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
await mgr.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
await waitForContent(mgr, 25000);
await new Promise(r => setTimeout(r, 1500));
await shot(mgr, '02_dashboard_manager_all');

// ── VALIDATIONS TAB ────────────────────────────────────────────────────────
console.log('\n── Validations tab');
await clickBtn(mgr, /Validation/i);
await new Promise(r => setTimeout(r, 1200));
await shot(mgr, '03_dashboard_manager_validations');

// ── DRAFTS TAB ─────────────────────────────────────────────────────────────
console.log('\n── Drafts tab');
await clickBtn(mgr, /^Drafts/);
await new Promise(r => setTimeout(r, 1200));
await shot(mgr, '04_dashboard_manager_drafts');

// ── IN PROGRESS TAB ───────────────────────────────────────────────────────
console.log('\n── In Progress tab');
await clickBtn(mgr, /In Progress/i);
await new Promise(r => setTimeout(r, 1200));
await shot(mgr, '05_dashboard_manager_inprogress');

// ── ALL TAB ────────────────────────────────────────────────────────────────
await clickBtn(mgr, /^All/);
await new Promise(r => setTimeout(r, 800));

// ── CALENDAR VIEW ─────────────────────────────────────────────────────────
console.log('\n── Calendar view');
await clickBtn(mgr, /^Calendar$/);
await new Promise(r => setTimeout(r, 1500));
await shot(mgr, '06_dashboard_calendar');
await clickBtn(mgr, /List View/);
await new Promise(r => setTimeout(r, 800));

// ── FILTERS PANEL ─────────────────────────────────────────────────────────
console.log('\n── Filters');
await clickBtn(mgr, /^Filters$/);
await new Promise(r => setTimeout(r, 1200));
await shot(mgr, '07_dashboard_filters');
await mgr.keyboard.press('Escape');
await new Promise(r => setTimeout(r, 500));

// ── VALIDATION SCREEN (Review a submission) ────────────────────────────────
console.log('\n── Validation screen');
await clickBtn(mgr, /Validation/i);
await new Promise(r => setTimeout(r, 1200));
await clickBtn(mgr, /^Review$/);
await new Promise(r => setTimeout(r, 3500));
const heading = await mgr.evaluate(() =>
  document.querySelector('h1,h2,h3,h4,h5')?.textContent?.trim()
);
console.log('  Heading after Review click:', heading);
await shot(mgr, '08_validation_screen_top');
await shot(mgr, '08b_validation_screen_mid', 400);
await shot(mgr, '08c_validation_screen_bottom', 900);

// ── OPERATOR DASHBOARD ──────────────────────────────────────────────────────
console.log('\n── Operator Dashboard');
{
  const page = await newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('echeck_user_role', 'user'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForContent(page, 25000);
  await new Promise(r => setTimeout(r, 1500));
  await shot(page, '09_dashboard_operator');

  // My Drafts tab
  await clickBtn(page, /Drafts/i);
  await new Promise(r => setTimeout(r, 1000));
  await shot(page, '10_dashboard_operator_drafts');
  await page.close();
}

// ── CREATION WIZARD ─────────────────────────────────────────────────────────
console.log('\n── Creation wizard');
// Go back to manager dashboard
await clickBtn(mgr, /^All/);
await new Promise(r => setTimeout(r, 800));
// Check if we need to go back to dashboard
const onValidation = await mgr.evaluate(() => document.body.innerText.includes('Submission'));
if (onValidation) {
  await clickBtn(mgr, /Back|Cancel|←/);
  await new Promise(r => setTimeout(r, 800));
}
// Navigate to dashboard by reloading
await mgr.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await mgr.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
await mgr.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
await waitForContent(mgr, 25000);
await new Promise(r => setTimeout(r, 1500));

await clickBtn(mgr, /Create New/);
await new Promise(r => setTimeout(r, 2500));

// Step 1 – Metadata
console.log('  Step 1');
await shot(mgr, '11_create_step1_top');
await shot(mgr, '11b_create_step1_bottom', 500);

// Step 2 – Field builder
console.log('  Step 2');
await mgr.evaluate(() => window.scrollTo(0, 0));
await clickBtn(mgr, /^Next$|Next →|Continue/i);
await new Promise(r => setTimeout(r, 2000));
await shot(mgr, '12_create_step2_top');
await shot(mgr, '12b_create_step2_palette', 300);

// Step 3 – Preview
console.log('  Step 3');
await mgr.evaluate(() => window.scrollTo(0, 0));
await clickBtn(mgr, /^Next$|Next →|Continue|Preview/i);
await new Promise(r => setTimeout(r, 2000));
await shot(mgr, '13_create_step3_preview');

// ── MOBILE VIEWS ──────────────────────────────────────────────────────────
console.log('\n── Mobile views');
{
  const page = await newPage({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('echeck_user_role', 'user'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForContent(page, 25000);
  await new Promise(r => setTimeout(r, 1500));
  await shot(page, '14_mobile_operator');
  await page.close();
}
{
  const page = await newPage({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForContent(page, 25000);
  await new Promise(r => setTimeout(r, 1500));
  await shot(page, '15_mobile_manager');
  await page.close();
}

await browser.close();
console.log(`\n✅  Done – screenshots saved to ${OUT_DIR}`);
