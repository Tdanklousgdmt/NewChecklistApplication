import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = './docs/screenshots';
const VIEWPORT = { width: 1440, height: 900 };

if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

async function newPage() {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  return page;
}

async function goto(page, url = BASE_URL) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
}

async function shot(page, name, fullPage = false) {
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage });
  console.log(`✓ ${name}.png`);
}

async function clickButton(page, textPattern) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const txt = await page.evaluate(el => el.textContent?.trim(), btn);
    if (textPattern.test(txt)) { await btn.click(); return true; }
  }
  return false;
}

// ── 1. Role Selection ────────────────────────────────────────────────────────
{
  const page = await newPage();
  await goto(page);
  await page.evaluate(() => localStorage.removeItem('echeck_user_role'));
  await page.evaluate(() => location.reload());
  await new Promise(r => setTimeout(r, 2000));
  await shot(page, '01_role_selection');
  await page.close();
}

// ── 2. Dashboard – Manager (All Checklists tab) ───────────────────────────────
const mgr = await newPage();
await goto(mgr);
await mgr.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
await mgr.evaluate(() => location.reload());
await new Promise(r => setTimeout(r, 3000));
await shot(mgr, '02_dashboard_manager_all');

// ── 3. Dashboard – Manager – Validations tab ──────────────────────────────────
await clickButton(mgr, /Validation/i);
await new Promise(r => setTimeout(r, 1000));
await shot(mgr, '03_dashboard_manager_validations');

// ── 4. Dashboard – Manager – Drafts tab ───────────────────────────────────────
await clickButton(mgr, /Drafts/i);
await new Promise(r => setTimeout(r, 1000));
await shot(mgr, '04_dashboard_manager_drafts');

// ── 5. Dashboard – Manager – Calendar view ────────────────────────────────────
await clickButton(mgr, /^Calendar$/);
await new Promise(r => setTimeout(r, 1500));
await shot(mgr, '05_dashboard_manager_calendar');

// Back to list view
await clickButton(mgr, /List View/);
await new Promise(r => setTimeout(r, 1000));

// ── 6. Filters panel ──────────────────────────────────────────────────────────
await clickButton(mgr, /Filters/);
await new Promise(r => setTimeout(r, 1200));
await shot(mgr, '06_dashboard_filters');

// Dismiss/close filters if needed
await mgr.keyboard.press('Escape');
await new Promise(r => setTimeout(r, 500));

// ── 7. Dashboard – Operator view ─────────────────────────────────────────────
{
  const page = await newPage();
  await goto(page);
  await page.evaluate(() => localStorage.setItem('echeck_user_role', 'user'));
  await page.evaluate(() => location.reload());
  await new Promise(r => setTimeout(r, 3000));
  await shot(page, '07_dashboard_operator');
  await page.close();
}

// ── 8. Creation Wizard – Step 1 (Metadata) ────────────────────────────────────
await goto(mgr);
await mgr.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
await mgr.evaluate(() => location.reload());
await new Promise(r => setTimeout(r, 3000));

await clickButton(mgr, /Create New/);
await new Promise(r => setTimeout(r, 2500));
await shot(mgr, '08_create_step1_metadata');

// Scroll down a bit to show more of step 1
await mgr.evaluate(() => window.scrollBy(0, 400));
await new Promise(r => setTimeout(r, 500));
await shot(mgr, '08b_create_step1_metadata_bottom');

// ── 9. Creation Wizard – Step 2 (Field Builder) ────────────────────────────────
await mgr.evaluate(() => window.scrollTo(0, 0));
const nextClicked = await clickButton(mgr, /^Next$|^Next Step$|^Continue$|Step 2/i);
if (!nextClicked) {
  // Try clicking the step indicator directly
  const stepDivs = await mgr.$$('[class*="step"], [data-step]');
  for (const d of stepDivs) {
    const txt = await mgr.evaluate(el => el.textContent?.trim(), d);
    if (/2|question|field|builder/i.test(txt)) { await d.click(); break; }
  }
}
await new Promise(r => setTimeout(r, 2500));
await shot(mgr, '09_create_step2_field_builder');

// Scroll to show the palette
await mgr.evaluate(() => window.scrollBy(0, 200));
await new Promise(r => setTimeout(r, 500));
await shot(mgr, '09b_create_step2_palette');

// ── 10. Creation Wizard – Step 3 (Preview & Publish) ─────────────────────────
const next2Clicked = await clickButton(mgr, /^Next$|^Next Step$|^Continue$|Step 3|Preview/i);
if (!next2Clicked) {
  const stepDivs = await mgr.$$('[class*="step"], [data-step]');
  for (const d of stepDivs) {
    const txt = await mgr.evaluate(el => el.textContent?.trim(), d);
    if (/3|preview|publish/i.test(txt)) { await d.click(); break; }
  }
}
await new Promise(r => setTimeout(r, 2500));
await shot(mgr, '10_create_step3_preview');

// ── 11. Validation Screen ────────────────────────────────────────────────────
{
  const page = await newPage();
  await goto(page);
  await page.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
  await page.evaluate(() => location.reload());
  await new Promise(r => setTimeout(r, 3000));

  // Click Validations tab then click first Review button
  await clickButton(page, /Validation/i);
  await new Promise(r => setTimeout(r, 1000));
  const clicked = await clickButton(page, /^Review$/);
  if (clicked) {
    await new Promise(r => setTimeout(r, 2500));
    await shot(page, '11_validation_screen');
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 500));
    await shot(page, '11b_validation_screen_bottom');
  }
  await page.close();
}

// ── 12. Mobile – Operator Dashboard ──────────────────────────────────────────
{
  const page = await newPage();
  await page.setViewport({ width: 390, height: 844 });
  await goto(page);
  await page.evaluate(() => localStorage.setItem('echeck_user_role', 'user'));
  await page.evaluate(() => location.reload());
  await new Promise(r => setTimeout(r, 3000));
  await shot(page, '12_mobile_operator_dashboard');
  await page.close();
}

// ── 13. Mobile – Manager Dashboard ───────────────────────────────────────────
{
  const page = await newPage();
  await page.setViewport({ width: 390, height: 844 });
  await goto(page);
  await page.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
  await page.evaluate(() => location.reload());
  await new Promise(r => setTimeout(r, 3000));
  await shot(page, '13_mobile_manager_dashboard');
  await page.close();
}

await browser.close();
console.log(`\n✅ All screenshots saved to ${OUT_DIR}`);
