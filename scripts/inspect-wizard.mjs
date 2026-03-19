import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.setItem('echeck_user_role', 'manager'));
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2500));

// Click "Create New" button
const buttons = await page.$$('button');
for (const btn of buttons) {
  const txt = await page.evaluate(el => el.textContent?.trim(), btn);
  if (txt.includes('Create New')) { await btn.click(); break; }
}
await new Promise(r => setTimeout(r, 2000));

const wizardButtons = await page.evaluate(() => {
  return [...document.querySelectorAll('button')].map(b => ({
    text: b.textContent?.trim().slice(0, 80),
  }));
});
console.log('\n=== CREATION WIZARD BUTTONS ===');
console.log(JSON.stringify(wizardButtons, null, 2));

const headings = await page.evaluate(() => {
  return [...document.querySelectorAll('h1,h2,h3,h4,h5,[class*="step"],[class*="Step"]')]
    .map(h => h.textContent?.trim().slice(0, 100));
});
console.log('\n=== WIZARD HEADINGS/STEPS ===');
console.log(JSON.stringify(headings, null, 2));

// Try clicking "Next" or "Step 2" button
const btns2 = await page.$$('button');
let nextClicked = false;
for (const btn of btns2) {
  const txt = await page.evaluate(el => el.textContent?.trim(), btn);
  if (/next|continue|step 2/i.test(txt)) { await btn.click(); nextClicked = true; break; }
}
if (nextClicked) {
  await new Promise(r => setTimeout(r, 2000));
  const step2Buttons = await page.evaluate(() => {
    return [...document.querySelectorAll('button')].map(b => ({
      text: b.textContent?.trim().slice(0, 60),
    })).slice(0, 20);
  });
  console.log('\n=== STEP 2 BUTTONS ===');
  console.log(JSON.stringify(step2Buttons, null, 2));
}

await browser.close();
