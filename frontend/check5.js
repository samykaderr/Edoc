import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  try {
    await page.goto('http://localhost:5173/view/demande_conge', { waitUntil: 'networkidle0', timeout: 10000 });
    const content = await page.evaluate(() => {
      return document.getElementById('root')?.innerText || 'NO ROOT CONTENT';
    });
    console.log('--- ROOT CONTENT VIEW FORM ---');
    console.log(content);
    console.log('--------------------');
  } catch (e) {
    console.log('Error going to page:', e.message);
  }
  
  await browser.close();
})();
