// Generates apps/shell/src/api/schema.ts from the API contract (services/api/docs/openapi.yaml)
// with the lockfile-pinned openapi-typescript in this package (ADR-0014).
//
//   node tools/openapi-types/generate.mjs           write the file   (npm run api:types)
//   node tools/openapi-types/generate.mjs --check   fail if stale    (npm run api:types:check)
//
// Install this package first: npm run api:types:install (npm ci from its own lockfile).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const contract = new URL('services/api/docs/openapi.yaml', root);
const output = new URL('apps/shell/src/api/schema.ts', root);
const check = process.argv.includes('--check');

if (!existsSync(new URL('node_modules/openapi-typescript', import.meta.url))) {
  console.error('The OpenAPI type generator is not installed: run `npm run api:types:install`.');
  process.exit(1);
}

// Resolved from this package's node_modules (TypeScript 5), never from the shell's.
const { default: openapiTS, astToString } = await import('openapi-typescript');
// The repository's own Prettier (root dev dependency), so the file matches `npm run format`.
const prettier = await import('prettier');

const HEADER = `/**
 * Generated from services/api/docs/openapi.yaml by tools/openapi-types (ADR-0014).
 * Do not edit: change the contract, then run \`npm run api:types\`.
 */
`;

const ast = await openapiTS(contract, { emptyObjectsUnknown: true });
const outputPath = fileURLToPath(output);
const options = (await prettier.resolveConfig(outputPath)) ?? {};
const generated = await prettier.format(HEADER + astToString(ast), {
  ...options,
  filepath: outputPath,
});

if (check) {
  const current = existsSync(output) ? readFileSync(output, 'utf8') : '';
  if (current !== generated) {
    console.error(
      'apps/shell/src/api/schema.ts is out of date with services/api/docs/openapi.yaml: run `npm run api:types`.',
    );
    process.exit(1);
  }
  console.log('apps/shell/src/api/schema.ts is up to date with the API contract.');
} else {
  writeFileSync(output, generated);
  console.log('Wrote apps/shell/src/api/schema.ts from services/api/docs/openapi.yaml.');
}
