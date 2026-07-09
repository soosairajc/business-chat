import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5000';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 700 }); // laptop, shorter -> forces overflow

const pages = ['/', '/pages/dm.html','/pages/threads.html','/pages/calls.html','/pages/files.html',
  '/pages/media-gallery.html','/pages/notifications.html','/pages/bookmarks.html',
  '/pages/activity-feed.html','/pages/team-directory.html','/pages/profile.html','/pages/settings.html'];

for (const u of pages) {
  await page.goto(BASE + u, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 250));
  const res = {};
  for (const mode of ['default','centered']) {
    await page.evaluate(m => window.NexusSettings?.set('layout', m, { toast:false }), mode);
    await new Promise(r => setTimeout(r, 150));
    res[mode] = await page.evaluate(() => {
      // find ALL vertical scrollers with overflow, test each can move
      const scrollers = [];
      document.querySelectorAll('[data-app-main], [data-app-main] *').forEach(el => {
        const s = getComputedStyle(el);
        if ((s.overflowY==='auto'||s.overflowY==='scroll') && el.scrollHeight - el.clientHeight > 4) {
          const b = el.scrollTop; el.scrollTop = 999; const moved = el.scrollTop > b; el.scrollTop = b;
          scrollers.push(moved);
        }
      });
      const de = document.documentElement;
      return { n: scrollers.length, allMove: scrollers.every(Boolean), hOverflow: de.scrollWidth > de.clientWidth };
    });
  }
  const bad = (res.default.n>0 && !res.default.allMove);
  console.log((bad?'*** BAD ':'ok      ') + u.padEnd(30),
    'FULL: scrollers=%d allMove=%s hOv=%s | CENT: scrollers=%d allMove=%s',
    res.default.n, res.default.allMove, res.default.hOverflow, res.centered.n, res.centered.allMove);
}
await browser.close();
