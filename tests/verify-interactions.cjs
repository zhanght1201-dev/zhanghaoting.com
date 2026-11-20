const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.SITE_URL || 'http://127.0.0.1:8788';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const ready = async p => {
      await p.waitForFunction(() => !document.querySelector('[data-like]').disabled);
    };
    const count = async () => Number(await page.locator('[data-like-count]').innerText());
    const url = base + '/notes/why-this-site/';
    await page.goto(url); await ready(page);
    const baseline = await count();
    await page.locator('[data-like]').click();
    await page.waitForFunction(() => document.querySelector('[data-like]').getAttribute('aria-pressed') === 'true');
    assert.equal(await count(), baseline + 1);
    await page.reload(); await ready(page);
    assert.equal(await page.locator('[data-like]').getAttribute('aria-pressed'), 'true');
    assert.equal(await count(), baseline + 1);
    await page.locator('[data-like]').click();
    await page.waitForFunction(() => document.querySelector('[data-like]').getAttribute('aria-pressed') === 'false');
    assert.equal(await count(), baseline);

    const marker = '本地验收 ' + Date.now();
    const body = marker + '\n<img src=x onerror="window.commentExecuted=true">';
    await page.locator('[name=nickname]').fill('测试读者');
    await page.locator('[name=body]').fill(body);
    await page.locator('[data-submit]').click();
    await page.waitForFunction(() => document.querySelector('[data-form-status]').textContent === '留言已发表。');
    assert.equal(await page.locator('[name=body]').inputValue(), '');
    assert.equal(await page.locator('[name=nickname]').inputValue(), '测试读者');
    assert.equal(await page.locator('[data-comments] img').count(), 0);
    assert.equal(await page.evaluate(() => window.commentExecuted), undefined);
    assert((await page.locator('[data-comments]').innerText()).includes(body));
    await page.reload(); await ready(page);
    assert((await page.locator('[data-comments]').innerText()).includes(marker));

    const other = await browser.newContext();
    const p = await other.newPage(); await p.goto(url); await ready(p);
    assert.equal(await p.locator('[data-like]').getAttribute('aria-pressed'), 'false');
    assert((await p.locator('[data-comments]').innerText()).includes(marker));
    const { PUBLIC_NOTES } = await import('../lib/public-notes.js');
    const second = PUBLIC_NOTES.find(s => s !== 'why-this-site');
    await p.goto(base + '/notes/' + second + '/'); await ready(p);
    assert(!(await p.locator('[data-comments]').innerText()).includes(marker));

    // A committed comment whose response was lost must be safe to retry.
    await page.locator('[name=nickname]').fill('重试读者');
    const retryBody = marker + ' 网络重试';
    await page.locator('[name=body]').fill(retryBody);
    const ids = [];
    let loseResponse = true;
    const postUrl = '**/api/notes/why-this-site/comments';
    await page.route(postUrl, async route => {
      ids.push(route.request().postDataJSON().requestId);
      const response = await route.fetch();
      if (loseResponse) { loseResponse = false; await route.abort('failed'); }
      else await route.fulfill({ response });
    });
    await page.locator('[data-submit]').click();
    await page.waitForFunction(() => document.querySelector('[data-form-status]').textContent.includes('仍在这里'));
    assert.equal(await page.locator('[name=body]').inputValue(), retryBody);
    await page.locator('[data-submit]').click();
    await page.waitForFunction(() => document.querySelector('[data-form-status]').textContent === '留言已发表。');
    assert.equal(ids.length, 2); assert.equal(ids[0], ids[1]);
    await page.unroute(postUrl);
    await page.reload(); await ready(page);
    const data = await page.evaluate(async () => (await fetch('/api/notes/why-this-site')).json());
    assert.equal(data.comments.filter(c => c.body === retryBody).length, 1);

    // Backend feedback and network failures preserve the form.
    await page.locator('[name=nickname]').fill('失败读者');
    await page.locator('[name=body]').fill('保留这段文字');
    await page.route(postUrl, route => route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { code: 'rate_limited', message: '留言太频繁，请稍后再试。' } }) }));
    await page.locator('[data-submit]').click();
    await page.waitForFunction(() => document.querySelector('[data-form-status]').textContent.includes('频繁'));
    assert.equal(await page.locator('[name=body]').inputValue(), '保留这段文字');
    await page.unroute(postUrl);

    // Failed initial reads show no invented counts and support an explicit retry.
    const offline = await browser.newContext(); const q = await offline.newPage();
    await q.route('**/api/notes/why-this-site', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    await q.goto(url); await q.locator('[data-retry]').waitFor();
    assert(await q.locator('[data-like]').isDisabled());
    assert.equal(await q.locator('[data-like-count]').innerText(), '—');
    await q.unroute('**/api/notes/why-this-site');
    await q.locator('[data-retry]').click(); await ready(q);

    // Exercise UI pagination without requiring 20 real comments in a local database.
    const paginated = await browser.newContext(); const r = await paginated.newPage();
    await r.route('**/api/notes/why-this-site*', route => {
      const more = new URL(route.request().url()).searchParams.has('before');
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ likes: 2, liked: false, commentCount: 2,
        comments: [{ id: more ? 'second' : 'first', nickname: '分页读者', body: more ? '较早留言' : '最新留言', createdAt: '2026-11-20T00:00:00.000Z' }], nextCursor: more ? null : 'test-cursor' }) });
    });
    await r.goto(url); await ready(r); await r.locator('[data-more]').click();
    await r.waitForFunction(() => document.querySelectorAll('[data-comments] li').length === 2);
    assert(await r.locator('[data-more]').isHidden());

    for (const mode of ['comic', 'pixel']) {
      await page.locator(`[data-ui-mode=${mode}]`).click();
      for (const width of [1440, 1024, 768, 390, 360]) {
        await page.setViewportSize({ width, height: 950 });
        await page.locator('[data-note-interactions]').scrollIntoViewIfNeeded();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${mode} ${width}: overflow`);
        assert(await page.locator('[data-submit]').isVisible());
      }
      if (process.env.SCREENSHOT_DIR) {
        await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.setViewportSize({ width: mode === 'comic' ? 1200 : 390, height: 1000 });
        await page.locator('[data-note-interactions]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'interactions-' + mode + '.png') });
      }
    }
    const plain = await browser.newContext({ javaScriptEnabled: false }); const nojs = await plain.newPage();
    await nojs.goto(url); assert(await nojs.locator('h1').isVisible());
    assert(await nojs.locator('[data-note-interactions] noscript').isVisible());
    assert.deepEqual(errors, []);
    console.log('PASS: local D1 persistence, likes/cancel/reload, article and browser isolation, safe text, lost-response retry, 429 preservation, unavailable API recovery, pagination, two modes × five widths, no-JS.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
