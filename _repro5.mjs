import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5000';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 700 });

// Test: inject a wide element into the main scroller's content and see if full width overflows/traps.
async function run(url) {
  await page.goto(BASE + url, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 250));
  const out = {};
  for (const mode of ['default','centered']) {
    await page.evaluate(m => window.NexusSettings?.set('layout', m, { toast:false }), mode);
    await new Promise(r => setTimeout(r, 120));
    out[mode] = await page.evaluate(() => {
      const main = document.querySelector('[data-app-main]');
      // inject a very wide, unbreakable element into the deepest content region
      let host = main.querySelector('[class*="overflow-y-auto"]') || main;
      const probe = document.createElement('div');
      probe.textContent = 'x'.repeat(400);
      probe.style.whiteSpace = 'nowrap';
      probe.className = '__wideprobe text-sm';
      host.appendChild(probe);
      const de = document.documentElement;
      const r = { mainSW: main.scrollWidth, mainCW: main.clientWidth, mainOverflowsX: main.scrollWidth > main.clientWidth + 1,
                  docOverflowsX: de.scrollWidth > de.clientWidth + 1,
                  minWidth: getComputedStyle(main).minWidth };
      probe.remove();
      return r;
    });
  }
  console.log(url);
  console.log('  FULL   :', JSON.stringify(out.default));
  console.log('  CENTER :', JSON.stringify(out.centered));
}
for (const u of ['/', '/pages/dm.html', '/pages/profile.html', '/pages/settings.html']) await run(u);
await browser.close();
