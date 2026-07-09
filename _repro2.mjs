import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5000';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();

async function test(url, w, h) {
  await page.setViewport({ width: w, height: h });
  await page.goto(BASE + url, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 300));
  const out = {};
  for (const mode of ['default','centered']) {
    await page.evaluate(m => window.NexusSettings?.set('layout', m, { toast:false }), mode);
    await new Promise(r => setTimeout(r, 200));
    out[mode] = await page.evaluate(() => {
      const de = document.documentElement, body = document.body;
      const hOverflow = de.scrollWidth > de.clientWidth || body.scrollWidth > body.clientWidth;
      // biggest vertical scroller anywhere
      let best = null;
      document.querySelectorAll('*').forEach(el => {
        const s = getComputedStyle(el);
        if ((s.overflowY==='auto'||s.overflowY==='scroll') && el.scrollHeight - el.clientHeight > 4) {
          if (!best || (el.scrollHeight-el.clientHeight) > (best.d)) best = { cls: el.className.slice(0,45), d: el.scrollHeight-el.clientHeight, sh: el.scrollHeight, ch: el.clientHeight, el };
        }
      });
      // try to actually scroll it
      let moved = null;
      if (best) { best.el.scrollTop = 300; moved = best.el.scrollTop; }
      return { hOverflow, docSW: de.scrollWidth, docCW: de.clientWidth,
        scroller: best ? { cls: best.cls, sh: best.sh, ch: best.ch } : null, scrolledTo: moved };
    });
  }
  const tag = `${url}  ${w}x${h}`;
  console.log(tag);
  console.log('  default : hOverflow=%s docSW=%d/%d scroller=%o moved=%s', out.default.hOverflow, out.default.docSW, out.default.docCW, out.default.scroller, out.default.scrolledTo);
  console.log('  centered: hOverflow=%s docSW=%d/%d scroller=%o moved=%s', out.centered.hOverflow, out.centered.docSW, out.centered.docCW, out.centered.scroller, out.centered.scrolledTo);
}

for (const [w,h] of [[1920,1080],[1600,900],[1280,800]]) {
  for (const u of ['/', '/pages/settings.html', '/pages/team-directory.html', '/pages/files.html']) {
    try { await test(u,w,h); } catch(e){ console.log('ERR', u, e.message); }
  }
}
await browser.close();
