// Prepares apps/shell/dist for Cloudflare Pages (Stage B, ADR-0015, Phase 4 Step 4.4); run by
// `npm run build:pages` right after the static build.
//
//   1. The build must be static, checked explicitly: dist/build-mode.json, written by the
//      shell's Vite config from the validated VITE_APP_MODE, must say "static" (a full-stack
//      build would call an API that Stage B doesn't have).
//   2. deploy/cloudflare-pages/_headers must follow Pages' documented syntax and limits.
//   3. The Pages files (everything in deploy/cloudflare-pages except README.md) are copied into
//      dist. They live outside apps/shell/public so no other build or server ever serves them.
//
//   node scripts/prepare-pages.mjs [dist]          prepare (default dist: apps/shell/dist)
//   node scripts/prepare-pages.mjs --check-headers  only validate _headers
import { cpSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'deploy/cloudflare-pages');

const MAX_RULES = 100;
const MAX_LINE = 2000;

/** Problems in a _headers file (Pages' syntax and limits); empty when valid. */
export function headersProblems(text) {
  const problems = [];
  let rules = 0;
  let current = null;
  text.split('\n').forEach((line, index) => {
    const where = `_headers line ${index + 1}`;
    if (line.length > MAX_LINE) problems.push(`${where}: longer than ${MAX_LINE} characters`);
    if (line.trim() === '' || line.startsWith('#')) return;
    if (!/^\s/.test(line)) {
      if (!line.startsWith('/') && !/^https?:\/\//.test(line)) {
        problems.push(`${where}: a rule must start with a path or URL pattern`);
      }
      if ((line.match(/\*/g) ?? []).length > 1) problems.push(`${where}: only one splat allowed`);
      rules += 1;
      current = new Set();
      return;
    }
    if (!current) {
      problems.push(`${where}: header line before any path`);
      return;
    }
    const header = line.trim();
    const name = header.startsWith('! ') ? header.slice(2).trim() : header.split(':')[0];
    if (!header.startsWith('! ') && !/^[A-Za-z0-9-]+: \S/.test(header)) {
      problems.push(`${where}: expected "Name: value" or "! Name"`);
    }
    const key = name.toLowerCase();
    if (current.has(key)) problems.push(`${where}: ${name} set twice in one rule`);
    current.add(key);
  });
  if (rules > MAX_RULES) problems.push(`_headers: ${rules} rules (Pages allows ${MAX_RULES})`);
  if (rules === 0) problems.push('_headers: no rules');
  return problems;
}

function fail(message) {
  console.error(`prepare-pages: ${message}`);
  process.exit(1);
}

function checkHeaders() {
  const problems = headersProblems(readFileSync(join(source, '_headers'), 'utf8'));
  if (problems.length > 0)
    fail(`invalid deploy/cloudflare-pages/_headers:\n  ${problems.join('\n  ')}`);
}

function prepare(dist) {
  const marker = join(dist, 'build-mode.json');
  if (!existsSync(join(dist, 'index.html')) || !existsSync(marker)) {
    fail(
      `${dist} is not a shell build (no index.html or build-mode.json); run the static build first.`,
    );
  }
  const { mode } = JSON.parse(readFileSync(marker, 'utf8'));
  if (mode !== 'static') {
    fail(
      `${dist} is a "${mode}" build; Cloudflare Pages serves the static build only (VITE_APP_MODE=static).`,
    );
  }
  checkHeaders();
  for (const entry of readdirSync(source)) {
    if (entry === 'README.md') continue;
    cpSync(join(source, entry), join(dist, entry), { recursive: true });
  }
  console.log(`prepare-pages: ${dist} is a static build, ready for Cloudflare Pages.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check-headers')) {
    checkHeaders();
    console.log('prepare-pages: deploy/cloudflare-pages/_headers is valid.');
  } else {
    prepare(process.argv[2] ?? join(root, 'apps/shell/dist'));
  }
}
