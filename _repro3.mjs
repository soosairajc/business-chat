import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5000';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 820 });

// 1) Fresh settings page, click the real "Full width" radio label, then wheel-scroll the settings main.
await page.goto(BASE + '/pages/settings.html', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 300));

// Click the Centered label first, then Full width — real DOM path
async function clickLayout(val) {
  await page.evaluate(v => {
    const radio = document.querySelector(`input[name="layout"][value="${v}"]`);
    radio.click();  // fires change
  }, val);
  await new Promise(r => setTimeout(r, 250));
}

async function state(label) {
  const s = await page.evaluate(() => {
    const main = document.querySelector('[data-app-main]');
    const before = main.scrollTop;
    main.scrollTop = 400;
    const after = main.scrollTop;
    main.scrollTop = before;
    return { layout: document.documentElement.getAttribute('data-layout'),
      mainOverflowY: getComputedStyle(main).overflowY, sh: main.scrollHeight, ch: main.clientHeight,
      canProgScroll: after > before, mw: getComputedStyle(main).maxWidth };
  });
  console.log(label, JSON.stringify(s));
}

await clickLayout('centered'); await state('after click Centered ');
await clickLayout('default');  await state('after click FullWidth');

// wheel scroll test on settings main
await page.mouse.move(900, 400);
const wheelResult = await page.evaluate(async () => {
  const main = document.querySelector('[data-app-main]');
  main.scrollTop = 0;
  main.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, bubbles: true }));
  // native wheel needs real input; use scrollBy fallback to confirm scrollability
  main.scrollBy(0, 500);
  return { scrollTopAfter: main.scrollTop };
});
console.log('wheel/scrollBy settings main ->', JSON.stringify(wheelResult));

await page.screenshot({ path: '_shot_settings_fullwidth.png' });

// 2) index page real check in full width
await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 300));
await clickLayout('default');
const idx = await page.evaluate(() => {
  const ml = document.getElementById('message-list');
  const before = ml.scrollTop; ml.scrollTop = 500; const after = ml.scrollTop;
  return { layout: document.documentElement.getAttribute('data-layout'), sh: ml.scrollHeight, ch: ml.clientHeight, canScroll: after > before };
});
console.log('index message-list fullwidth ->', JSON.stringify(idx));

await browser.close();
