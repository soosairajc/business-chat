import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5000';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--window-size=1400,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

async function probe(url, label) {
  await page.goto(BASE + url, { waitUntilNetwork: 'networkidle2', waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 400));

  async function measure() {
    return await page.evaluate(() => {
      const main = document.querySelector('[data-app-main]');
      const out = { layout: document.documentElement.getAttribute('data-layout'), main: null, scrollers: [] };
      if (main) {
        const cs = getComputedStyle(main);
        out.main = { cls: main.className.slice(0,60), overflowY: cs.overflowY, maxWidth: cs.maxWidth,
          clientH: main.clientHeight, scrollH: main.scrollHeight, canScroll: main.scrollHeight > main.clientHeight + 2 };
        // find the actual vertical scroller inside main
        main.querySelectorAll('*').forEach(el => {
          const s = getComputedStyle(el);
          if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 2) {
            out.scrollers.push({ cls: el.className.slice(0,50), scrollH: el.scrollHeight, clientH: el.clientHeight });
          }
        });
      }
      return out;
    });
  }

  // set layout via the app API and measure both states
  const results = {};
  for (const mode of ['default','centered','default']) {
    await page.evaluate(m => window.NexusSettings?.set('layout', m, { toast:false }), mode);
    await new Promise(r => setTimeout(r, 250));
    results[mode + '_' + Math.random().toString(36).slice(2,5)] = await measure();
  }
  console.log('\n=== ' + label + ' (' + url + ') ===');
  for (const [k,v] of Object.entries(results)) console.log(k.split('_')[0].padEnd(9), JSON.stringify(v));
}

for (const [u,l] of [['/', 'index'], ['/pages/settings.html','settings'], ['/pages/team-directory.html','team-dir'], ['/pages/profile.html','profile'], ['/pages/files.html','files']]) {
  try { await probe(u,l); } catch(e){ console.log('ERR', l, e.message); }
}

await browser.close();
