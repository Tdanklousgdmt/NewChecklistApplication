import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// ── Role selection page ───────────────────────────────────────────────────────
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.removeItem('echeck_user_role'));
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));

const roleButtons = await page.evaluate(() => {
  return [...document.querySelectorAll('button')].map(b => ({
    text: b.textContent?.trim(),
    classes: b.className.slice(0, 80),
  }));
});
console.log('\n=== ROLE SELECTION BUTTONS ===');
console.log(JSON.stringify(roleButtons, null, 2));

// ── Manager dashboard ─────────────────────────────────────────────────────────
await page.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));

const managerButtons = await page.evaluate(() => {
  return [...document.querySelectorAll('button')].map(b => ({
    text: b.textContent?.trim().slice(0, 60),
    ariaLabel: b.getAttribute('aria-label'),
    id: b.id,
  }));
});
console.log('\n=== MANAGER DASHBOARD BUTTONS ===');
console.log(JSON.stringify(managerButtons, null, 2));

const tabs = await page.evaluate(() => {
  return [...document.querySelectorAll('[role="tab"]')].map(t => ({
    text: t.textContent?.trim(),
    selected: t.getAttribute('aria-selected'),
  }));
});
console.log('\n=== TABS ===');
console.log(JSON.stringify(tabs, null, 2));

const headings = await page.evaluate(() => {
  return [...document.querySelectorAll('h1,h2,h3,h4')].map(h => h.textContent?.trim());
});
console.log('\n=== HEADINGS ===');
console.log(JSON.stringify(headings, null, 2));

await browser.close();
