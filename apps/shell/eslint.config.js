import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.configs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Presentation never depends on the API layer (ADR-0014): pages and components render the
    // shell's own models; only data-loading code may import src/api.
    files: ['src/components/**', 'src/sections/**'],
    // Tests may build their data with the API layer's fixtures; the rule is for shipped code.
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/api/*'],
              message:
                'Components and sections must not import the API layer: render the shell models (e.g. projects/model.ts) and load data outside presentation code (ADR-0014).',
            },
          ],
        },
      ],
    },
  },
  {
    // Config files are plain JS outside the TS projects: lint without type information.
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  // Must stay last: turns off rules that conflict with Prettier formatting.
  prettier,
]);
