// Builds each candidate alone and reports its real JavaScript cost.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const out = {};
for (const entry of ['baseline', 'plain', 'r3f']) {
  execSync('npx vite build --logLevel error', {
    env: { ...process.env, ENTRY: entry },
    stdio: 'inherit',
  });
  const dir = `dist/sizes/${entry}/assets`;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  const totals = { raw: 0, gzip: 0, brotli: 0 };
  for (const file of files) {
    const data = fs.readFileSync(path.join(dir, file));
    totals.raw += data.length;
    totals.gzip += zlib.gzipSync(data, { level: 9 }).length;
    totals.brotli += zlib.brotliCompressSync(data).length;
  }
  out[entry] = totals;
}
const kb = (n) => +(n / 1024).toFixed(1);
const row = (t) => ({ raw: kb(t.raw), gzip: kb(t.gzip), brotli: kb(t.brotli) });
const delta = (a, b) => ({
  raw: a.raw - b.raw,
  gzip: a.gzip - b.gzip,
  brotli: a.brotli - b.brotli,
});
const result = {
  'React only (baseline, already in the shell)': row(out.baseline),
  'Plain three + GLTFLoader (no React; total added to the shell)': row(out.plain),
  'R3F + three + GLTFLoader + React (total)': row(out.r3f),
  'R3F added to the shell (total minus baseline)': row(delta(out.r3f, out.baseline)),
  'R3F extra over plain three': row(delta(delta(out.r3f, out.baseline), out.plain)),
};
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/sizes.json', JSON.stringify(result, null, 1));
console.table(result);
