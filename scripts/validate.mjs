import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const toolsIndex = process.argv.indexOf('--tools');
const toolRoot = toolsIndex < 0 ? root : resolve(process.argv[toolsIndex + 1]);
const requireTool = createRequire(join(toolRoot, 'package.json'));
const { chromium, webkit } = requireTool('playwright');
const { default: AxeBuilder } = requireTool('@axe-core/playwright');
const output = join(root, 'test/scratch/validation');
await mkdir(output, { recursive: true });
const data = JSON.parse(await readFile(join(root, 'src/tweets.json'), 'utf8'));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.json': 'application/json' };
const dist = join(root, 'dist');
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/preview/')) { res.writeHead(404).end(); return; }
    const file = resolve(dist, decodeURIComponent(pathname.slice('/preview/'.length)) || 'index.html');
    if (!file.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
    await stat(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const url = origin + '/preview/';
const report = { checkedAt: new Date().toISOString(), checks: [], limitations: [] };
let failures = 0;
async function check(name, fn) {
  try { const detail = await fn(); report.checks.push({ name, passed: true, detail: detail ?? null }); console.log(`PASS ${name}`); }
  catch (error) { failures++; report.checks.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}

await check('Source integrity: twelve distinct real status URLs, short excerpts, capture metadata, local avatars', async () => {
  assert.equal(data.tweets.length, 12);
  assert.equal(new Set(data.tweets.map(t => t.id)).size, data.tweets.length);
  assert.ok(Number.isFinite(Date.parse(data.capturedAt)));
  for (const tweet of data.tweets) {
    assert.equal(tweet.url, `https://x.com/${tweet.handle}/status/${tweet.id}`);
    assert.equal(tweet.source, `https://teapawt.org/${tweet.handle}/status/${tweet.id}`);
    assert.ok(tweet.excerpt.split(/\s+/).length <= 25);
    assert.ok(tweet.likes === null || Number.isInteger(tweet.likes));
    assert.ok((await stat(join(root, 'public', tweet.avatar))).size > 0);
  }
  assert.deepEqual(JSON.parse(await readFile(join(dist, 'sources.json'), 'utf8')).sources, data.tweets);
  return { tweets: data.tweets.length, authors: new Set(data.tweets.map(t => t.handle)).size };
});

async function runEngine(engine, name) {
  let browser;
  try { browser = await engine.launch({ headless: true }); }
  catch (error) {
    if (name === 'chromium') throw error;
    const reason = error.message.split('\n').slice(0, 18).join('\n');
    report.limitations.push({ check: `${name} browser interactions`, reason });
    console.log(`UNAVAILABLE ${name}: ${reason}`); return;
  }
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [], failuresHttp = [], offOrigin = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) failuresHttp.push({ url: r.url(), status: r.status() }); });
    await context.route('**/*', route => {
      if (!route.request().url().startsWith(origin)) { offOrigin.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const navigate = async (hash = '') => { await page.goto(url + hash); await page.locator('article, .empty-state').first().waitFor(); await page.evaluate(() => document.fonts.ready); };
    const ids = () => page.locator('article').evaluateAll(cards => cards.map(card => card.dataset.tweetId));
    const count = async expected => {
      await page.waitForFunction(value => document.querySelectorAll('article').length === value, expected, { timeout: 5000 });
      assert.equal(await page.locator('article').count(), expected);
    };
    const expectedSort = sort => [...data.tweets].sort((a, b) => sort === 'latest' ? b.date.localeCompare(a.date) : (b[sort] ?? -1) - (a[sort] ?? -1) || b.date.localeCompare(a.date)).map(t => t.id);
    await check(`${name}: static subpath, local resources, fonts and mobile first screen`, async () => {
      await navigate(); await count(6);
      assert.deepEqual(await ids(), expectedSort('likes').slice(0, 6));
      const read = await page.locator('.read-tweet').first().boundingBox();
      assert.ok(read.y + read.height <= 844, 'First tweet action must fit on first screen');
      const heroAction = await page.getByRole('link', { name: 'Explore tweets', exact: true }).boundingBox();
      assert.ok(heroAction.y + heroAction.height <= 844);
      assert.equal(await page.evaluate(() => document.fonts.check('400 16px Manrope')), true);
      await page.waitForFunction(() => [...document.images].filter(i => { const r = i.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && r.bottom > 0; }).every(i => i.complete && i.naturalWidth > 0));
      const assets = await page.locator('img').evaluateAll(images => images.filter(i => { const r = i.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && r.bottom > 0; }).map(i => ({ src: i.src, loaded: i.complete && i.naturalWidth > 0 })));
      assert.ok(assets.every(a => a.loaded));
      await page.screenshot({ path: join(output, `${name}-390.png`) });
      return { firstReadTweet: read, heroAction, assets: assets.length };
    });
    await check(`${name}: all topic filters, combined search, empty results and reset`, async () => {
      for (const topic of ['AI agents', 'Builders', 'Community', 'Ecosystem']) {
        await page.getByRole('button', { name: topic, exact: true }).click();
        assert.deepEqual(new Set(await ids()), new Set(data.tweets.filter(t => t.topic === topic).map(t => t.id)));
        assert.equal(await page.getByRole('button', { name: topic, exact: true }).getAttribute('aria-pressed'), 'true');
      }
      await page.getByRole('button', { name: 'All tweets', exact: true }).click();
      await page.getByRole('searchbox', { name: 'Search tweets' }).fill('  @TAYLOR_   ');
      await count(1);
      assert.deepEqual(await ids(), ['2111926070052036690']);
      await page.getByRole('button', { name: 'Community', exact: true }).click(); await count(0);
      assert.ok(await page.getByRole('heading', { name: 'Quiet in this corner.' }).isVisible());
      await page.locator('.empty-state').getByRole('button', { name: 'Reset filters' }).click(); await count(6);
      assert.equal(await page.getByRole('searchbox').inputValue(), '');
      await page.getByRole('searchbox').fill('no-matching-pond-signal'); await count(0);
      assert.ok((await page.locator('.empty-state').textContent()).includes('no-matching-pond-signal'));
      await page.getByRole('button', { name: 'Clear search' }).click(); await count(6);
    });
    await check(`${name}: sorting and load-more preserve accurate order`, async () => {
      for (const sort of ['reposts', 'latest', 'likes']) {
        await page.getByRole('combobox', { name: 'Sort tweets' }).selectOption(sort);
        assert.deepEqual(await ids(), expectedSort(sort).slice(0, 6));
        await page.getByRole('button', { name: 'Show 6 more tweets' }).click(); await count(12);
        assert.deepEqual(await ids(), expectedSort(sort));
        assert.equal(await page.evaluate(() => document.activeElement.closest('article')?.dataset.tweetId), expectedSort(sort)[6]);
      }
    });
    await check(`${name}: save, reload, saved view, skip link, remove and empty recovery`, async () => {
      await navigate();
      await page.locator('article').first().getByRole('button', { name: 'Save tweet by Adam', exact: true }).click();
      assert.ok((await page.locator('.toast').textContent()).includes('saved in this browser'));
      await page.reload(); await page.locator('article').first().waitFor();
      assert.equal(await page.locator('article').first().locator('.save-button').getAttribute('aria-pressed'), 'true');
      await page.getByRole('link', { name: /^Saved/ }).click(); await count(1);
      await page.locator('.skip-link').focus(); await page.keyboard.press('Enter');
      assert.equal((await page.locator('#feed-title').innerText()).replace(/\s/g, ''), 'Savedtweets1');
      await count(1);
      await page.getByRole('button', { name: 'Remove saved tweet by Adam' }).click(); await count(0);
      assert.ok(await page.getByRole('heading', { name: 'Keep a little signal.' }).isVisible());
      await page.getByRole('link', { name: 'Explore tweets', exact: true }).click(); await count(6);
      assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('signal-pond:saved:v1'))), []);
    });
    await check(`${name}: keyboard filter, visible focus, native modal trap, Escape and focus return`, async () => {
      await navigate();
      await page.getByRole('button', { name: 'AI agents', exact: true }).focus();
      await page.keyboard.press('Space'); await count(3);
      assert.equal(await page.getByRole('button', { name: 'AI agents', exact: true }).getAttribute('aria-pressed'), 'true');
      const focus = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, width: s.outlineWidth }; });
      assert.equal(focus.style, 'solid'); assert.equal(focus.width, '2px');
      await page.screenshot({ path: join(output, `${name}-focus.png`) });
      const trigger = page.getByRole('button', { name: 'About this snapshot and ranking' });
      await trigger.focus(); await page.keyboard.press('Enter');
      assert.ok(await page.getByRole('dialog').isVisible());
      for (let n = 0; n < 9; n++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => !!document.activeElement.closest('dialog'))); }
      await page.screenshot({ path: join(output, `${name}-about.png`) });
      const a11y = await new AxeBuilder({ page }).analyze(); assert.equal(a11y.violations.length, 0, JSON.stringify(a11y.violations));
      await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog').count(), 0);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'About this snapshot and ranking');
    });
    await check(`${name}: clipboard success, failure and accurate original link`, async () => {
      await navigate();
      if (name === 'chromium') {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
        await page.locator('article').first().locator('.copy-button').click();
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), data.tweets[0].url);
      }
      await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.__copiedLink = value; } } }));
      await page.locator('article').first().locator('.copy-button').click();
      assert.equal(await page.evaluate(() => window.__copiedLink), 'https://x.com/surfcoderepeat/status/2107939454396567581');
      assert.ok((await page.locator('.toast').textContent()).includes('Tweet link copied.'));
      await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Clipboard denied in test'); } } }));
      await page.locator('article').first().locator('.copy-button').click();
      assert.equal(await page.getByLabel('Tweet link', { exact: true }).inputValue(), 'https://x.com/surfcoderepeat/status/2107939454396567581');
      assert.ok((await page.getByRole('dialog').textContent()).includes('Automatic copying is unavailable'));
      await page.keyboard.press('Escape');
      const href = await page.locator('article').first().locator('.read-tweet').getAttribute('href');
      assert.equal(href, data.tweets[0].url);
      assert.equal(await page.locator('article').first().locator('.read-tweet').getAttribute('rel'), 'noopener noreferrer');
    });
    await check(`${name}: saved state synchronizes between browser tabs`, async () => {
      await page.evaluate(() => localStorage.removeItem('signal-pond:saved:v1'));
      await navigate();
      const second = await context.newPage(); await second.goto(url + '#saved'); await second.locator('.empty-state').waitFor();
      await page.locator('article').first().locator('.save-button').click();
      await second.locator('article').waitFor(); assert.equal(await second.locator('article').count(), 1);
      await second.locator('.save-button').click();
      await page.waitForFunction(() => document.querySelector('.save-button')?.getAttribute('aria-pressed') === 'false');
      await second.close();
    });
    await check(`${name}: responsive overflow, metadata and automated accessibility`, async () => {
      await navigate();
      const scans = [];
      for (const width of [320, 360, 375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: width > 900 ? 1000 : 844 });
        const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
        assert.equal(dimensions.scroll, dimensions.client, `Overflow at ${width}px`);
        if ([390, 1440].includes(width)) {
          const results = await new AxeBuilder({ page }).analyze();
          assert.equal(results.violations.length, 0, JSON.stringify(results.violations));
          scans.push({ width, passes: results.passes.length, incomplete: results.incomplete.map(x => x.id) });
        }
      }
      for (const selector of ['title', 'link[rel="icon"]', 'meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:image"]']) assert.equal(await page.locator(selector).count(), 1);
      await page.screenshot({ path: join(output, `${name}-1440.png`) });
      await page.screenshot({ path: join(output, `${name}-1440-full.png`), fullPage: true });
      return { widths: [320, 360, 375, 390, 768, 1024, 1440], axe: scans };
    });
    await check(`${name}: reduced motion, RTL reflow and 200% text enlargement`, async () => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('.button-primary').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => document.documentElement.dir = 'rtl');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
      await page.evaluate(() => { document.documentElement.dir = 'ltr'; document.documentElement.style.fontSize = '200%'; });
      const sizes = await page.evaluate(() => ({ w: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.equal(sizes.scroll, sizes.w, '200% text enlargement causes overflow');
      await page.screenshot({ path: join(output, `${name}-text-200.png`), fullPage: true });
      await page.evaluate(() => document.documentElement.style.fontSize = '');
      return { note: 'Text-only enlargement and RTL stress test; not native browser zoom or a translated UI.' };
    });
    await check(`${name}: no console errors, missing resources or external runtime requests`, async () => {
      assert.deepEqual(errors, []); assert.deepEqual(failuresHttp, []); assert.deepEqual(offOrigin, []);
    });
    await context.close();
    await check(`${name}: denied storage and malformed storage recover without crashing`, async () => {
      const blocked = await browser.newContext();
      await blocked.addInitScript(() => {
        Storage.prototype.getItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
        Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
      });
      const p = await blocked.newPage(); await p.goto(url); await p.locator('article').first().waitFor();
      await p.locator('article').first().locator('.save-button').click();
      assert.ok((await p.locator('.toast').textContent()).includes('saved for this visit'));
      await p.getByRole('link', { name: /^Saved/ }).click();
      await p.locator('.saved-intro').waitFor();
      assert.equal(await p.locator('article').count(), 1);
      assert.ok((await p.locator('.storage-note').textContent()).includes('this visit only'));
      await blocked.close();
      const corrupted = await browser.newContext();
      await corrupted.addInitScript(() => localStorage.setItem('signal-pond:saved:v1', '{invalid json'));
      const p2 = await corrupted.newPage(); await p2.goto(url + '#saved'); await p2.locator('.empty-state').waitFor();
      assert.equal(await p2.locator('article').count(), 0);
      assert.equal(await p2.locator('.storage-note').count(), 0);
      await corrupted.close();
    });
  } finally { await browser.close(); }
}

try { await runEngine(chromium, 'chromium'); await runEngine(webkit, 'webkit'); }
catch (error) { failures++; report.checks.push({ name: 'Browser launch', passed: false, error: error.message }); console.error(error.message); }
finally {
  await new Promise(resolve => server.close(resolve));
  await writeFile(join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.checks.filter(c => c.passed).length} passed, ${failures} failed, ${report.limitations.length} unavailable`);
  process.exitCode = failures ? 1 : 0;
}
