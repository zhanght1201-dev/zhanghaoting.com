const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.SITE_URL || 'http://127.0.0.1:8788';

async function noOverflow(page, label) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: horizontal overflow`);
}

async function countText(locator, value) {
  await locator.waitFor({ state: 'attached' });
  await locator.page().waitForFunction(([element, expected]) => element.textContent.trim() === `♡ ${expected}`, [await locator.elementHandle(), value]);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  let likedButton;
  try {
    // Mocking the public count endpoint makes all three homepage badges independently checkable.
    const mockContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const home = await mockContext.newPage();
    let batches = 0;
    await home.route('**/api/note-likes?*', async (route) => {
      batches++;
      const slugs = new URL(route.request().url()).searchParams.get('slugs').split(',');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ likes: Object.fromEntries(slugs.map((slug) => [slug, 123])) }) });
    });
    await home.goto(`${base}/`);
    await home.locator('.card.notes').click();
    const homeBadges = home.locator('[data-summary=notes] [data-note-like-count]');
    assert.equal(await homeBadges.count(), 3, 'recent notes should each have a count');
    await home.waitForFunction(() => [...document.querySelectorAll('[data-summary=notes] [data-note-like-count]')].every((el) => el.textContent.trim() === '♡ 123'));
    assert.equal(batches, 1, 'home loads all three counts with a single batch');
    await noOverflow(home, 'home dialog');
    await Promise.all([
      home.waitForResponse((response) => response.url().includes('/api/note-likes?')),
      home.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))),
    ]);
    assert(batches >= 2, 'restoring a cached page refreshes counts');
    await Promise.all([
      home.waitForResponse((response) => response.url().includes('/api/note-likes?')),
      home.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }),
    ]);
    assert(batches >= 3, 'returning to a visible page refreshes counts');
    await mockContext.close();

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${base}/notes/`);
    const rows = page.locator('[data-note]');
    assert((await rows.count()) > 0, 'at least one public note exists');
    assert.equal(await page.locator('[data-note] [data-note-like-count]').count(), await rows.count());
    const badge = rows.first().locator('[data-note-like-count]');
    const slug = await badge.getAttribute('data-note-like-count');
    await page.waitForFunction((s) => /^♡ \d+$/.test(document.querySelector(`[data-note-like-count="${s}"]`).textContent.trim()), slug);
    const firstCount = Number((await badge.innerText()).replace(/[^\d]/g, ''));
    await page.locator('[data-filter=reading]').click();
    assert.equal(await page.locator('[data-note]:visible').count(), await page.locator('[data-note][data-category=reading]').count());
    await page.locator('[data-filter=all]').click();
    assert.equal(await page.locator('[data-note]:visible').count(), await rows.count());

    await page.goto(`${base}/notes/${slug}/`);
    const headBadge = page.locator('.article-header [data-note-like-count]');
    assert.equal(await headBadge.count(), 1, 'detail header has one count');
    await countText(headBadge, firstCount);
    likedButton = page.locator('[data-like]');
    await page.waitForFunction(() => !document.querySelector('[data-like]').disabled);
    assert.equal(await likedButton.getAttribute('aria-pressed'), 'false', 'fresh visitor has not liked');
    await likedButton.click();
    await page.waitForFunction(() => document.querySelector('[data-like]').getAttribute('aria-pressed') === 'true');
    await countText(headBadge, firstCount + 1);
    await page.goto(`${base}/notes/`);
    await countText(page.locator(`[data-note-like-count="${slug}"]`), firstCount + 1);
    await page.goto(`${base}/notes/${slug}/`);
    await page.waitForFunction(() => document.querySelector('[data-like]').getAttribute('aria-pressed') === 'true' && !document.querySelector('[data-like]').disabled);
    likedButton = page.locator('[data-like]');
    await likedButton.click();
    await page.waitForFunction(() => document.querySelector('[data-like]').getAttribute('aria-pressed') === 'false' && !document.querySelector('[data-like]').disabled);
    await countText(page.locator('.article-header [data-note-like-count]'), firstCount);
    likedButton = null;
    await page.goto(`${base}/notes/`);
    await countText(page.locator(`[data-note-like-count="${slug}"]`), firstCount);

    for (const mode of ['comic', 'pixel']) {
      await page.evaluate((value) => localStorage.setItem('four-windows-ui', value), mode);
      for (const width of [1440, 390, 360]) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of ['/notes/', `/notes/${slug}/`]) {
          await page.goto(base + path);
          assert.equal(await page.locator('html').getAttribute('data-ui'), mode);
          await noOverflow(page, `${mode} ${width} ${path}`);
        }
      }
    }
    await context.close();

    const failureContext = await browser.newContext();
    const failurePage = await failureContext.newPage();
    await failurePage.route('**/api/note-likes?*', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    await failurePage.goto(`${base}/notes/`);
    const failed = failurePage.locator('[data-note-like-count]').first();
    await failurePage.waitForFunction(() => { const el = document.querySelector('[data-note-like-count]'); return el && el.title && el.textContent.trim() === '♡ —'; });
    assert.notEqual((await failed.getAttribute('title')).trim(), '');
    await failureContext.close();

    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const plain = await noJs.newPage();
    await plain.goto(`${base}/notes/`);
    const text = await plain.locator('[data-note-like-count]').allTextContents();
    assert(text.length > 0 && text.every((value) => value.trim() === '♡ —'), 'no-JS counts stay unknown');
    await noJs.close();
    console.log('PASS: batch counts, page restoration, detail/list consistency, filters, two themes, responsive widths, 503 and no-JS.');
  } finally {
    if (likedButton) {
      try { if (await likedButton.getAttribute('aria-pressed') === 'true') await likedButton.click(); } catch (_) {}
    }
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
