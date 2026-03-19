import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = './docs/screenshots';

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
  if (scrollY) { await page.evaluate(y => window.scrollTo(0, y), scrollY); await new Promise(r => setTimeout(r, 400)); }
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: `${OUT_DIR}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
}

async function clickBtn(page, pattern) {
  return await page.evaluate((pat) => {
    const re = new RegExp(pat, 'i');
    const els = [...document.querySelectorAll('button, [role="button"], [role="tab"]')];
    for (const el of els) { if (re.test(el.textContent?.trim() || '')) { el.click(); return el.textContent?.trim(); } }
    return null;
  }, pattern.source);
}

// ── MOBILE OPERATOR ──────────────────────────────────────────────────────────
console.log('Mobile Operator');
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('echeck_user_role', 'user'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForContent(page, 25000);
  await new Promise(r => setTimeout(r, 1500));
  await shot(page, '14_mobile_operator');
  await page.close();
}

// ── MOBILE MANAGER ───────────────────────────────────────────────────────────
console.log('Mobile Manager');
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForContent(page, 25000);
  await new Promise(r => setTimeout(r, 1500));
  await shot(page, '15_mobile_manager');
  await page.close();
}

// ── EXECUTION SCREEN ─────────────────────────────────────────────────────────
console.log('Execution screen');
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('echeck_user_role', 'user'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForContent(page, 25000);
  await new Promise(r => setTimeout(r, 2000));

  // Look for an Open/Execute/Start button in the task list
  const clicked = await clickBtn(page, /^Open$|Execute|Start|Fill/);
  console.log('  Open clicked:', clicked);

  if (clicked) {
    await new Promise(r => setTimeout(r, 3000));
    const heading = await page.evaluate(() =>
      document.querySelector('h1,h2,h3,h4')?.textContent?.trim()
    );
    console.log('  Heading:', heading);
    await shot(page, '16_execution_top');
    await shot(page, '16b_execution_mid', 400);
    await shot(page, '16c_execution_fields', 800);
  } else {
    // Try from manager view - open any active checklist
    await page.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForContent(page, 25000);
    await new Promise(r => setTimeout(r, 2000));

    // Look for any checklist to execute (click a checklist title or Open button)
    const r2 = await clickBtn(page, /^Open$|Execute|Start|Fill/);
    console.log('  Open (manager):', r2);
    await new Promise(r => setTimeout(r, 3000));
    await shot(page, '16_execution_top');
    await shot(page, '16b_execution_mid', 400);
  }
  await page.close();
}

await browser.close();
console.log('\n✅ Done');
