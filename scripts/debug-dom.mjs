import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

await page.evaluateOnNewDocument(() => {
  localStorage.setItem('echeck_user_role', 'manager');
});

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));

const body = await page.evaluate(() => document.body.innerHTML.slice(0, 3000));
console.log(body);

await browser.close();
