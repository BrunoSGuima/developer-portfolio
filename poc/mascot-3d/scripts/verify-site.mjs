// Runs the spike under the site's real headers (the Pages emulator): CSP probes, then the renderer
// comparison and the bench. Fails loudly if the policy was not actually served.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const base = process.argv[2];
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const newPage = async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.addInitScript(() => {
    window.__violations = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__violations.push({ directive: e.effectiveDirective, blocked: e.blockedURI }),
    );
  });
  page.on('pageerror', (e) => console.error('PAGE ERROR', page.url(), e.message));
  return page;
};
const out = {};
let page = await newPage();
const response = await page.goto(`${base}/csp`);
out.servedCsp = response.headers()['content-security-policy'];
if (!out.servedCsp) throw new Error('No CSP served: this test would prove nothing.');
await page.waitForFunction(() => window.__csp, null, { timeout: 60000 });
out.csp = await page.evaluate(() => window.__csp);
await page.close();

out.compare = {};
for (const name of ['plain', 'r3f']) {
  const runs = [];
  let violations = [];
  for (let i = 0; i < 5; i++) {
    page = await newPage();
    await page.goto(`${base}/${name}`);
    await page.waitForFunction(() => window.__result, null, { timeout: 120000 });
    runs.push(await page.evaluate(() => window.__result));
    violations = violations.concat(await page.evaluate(() => window.__violations));
    await page.close();
  }
  const med = (k) => [...runs.map((r) => r[k])].sort((a, b) => a - b)[2];
  out.compare[name] = {
    renderer: runs[0].renderer,
    runs: 5,
    firstFrameMsMedian: +med('firstFrameMs').toFixed(1),
    frameMeanMsMedian: +med('meanMs').toFixed(2),
    frameP95MsMedian: +med('p95Ms').toFixed(2),
    violations,
  };
}
page = await newPage();
await page.goto(`${base}/bench`);
await page.waitForFunction(() => window.__bench, null, { timeout: 280000 });
out.bench = await page.evaluate(() => window.__bench);
out.benchViolations = await page.evaluate(() => window.__violations);
await page.close();
page = await newPage();
await page.goto(`${base}/stage?mode=film`);
await page.waitForFunction(() => window.__ready === true && window.__film, null, {
  timeout: 120000,
});
await page.evaluate(() => {
  window.__film.renderAt(90);
});
out.filmStageViolations = await page.evaluate(() => window.__violations);
await page.close();
fs.writeFileSync('out/verify.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
