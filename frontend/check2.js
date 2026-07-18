import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() === 500) {
      console.log('500 ERROR ON URL:', response.url());
    }
  });

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  } catch (e) {
    console.log('Error going to page:', e.message);
  }
  
  await browser.close();
})();
