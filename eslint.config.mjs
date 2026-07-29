import globals from 'globals';
import js from '@eslint/js';
import { fixupPluginRules } from '@eslint/compat';
import eslintPluginDiff from 'eslint-plugin-diff';
import stylistic from '@stylistic/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

// Anything that looks like a hex colour literal. Colours belong in the theme
// tokens and reach components as CSS custom properties.
const HEX_COLOUR = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-standalone/**',
      '**/dist-server/**',
      '**/playwright-report/**',
      '**/bundled-libraries.iife.js',
      '**/.claude/**'
    ]
  },
  {
    plugins: {
      'diff': fixupPluginRules(eslintPluginDiff),
      '@stylistic': stylistic,
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'import': importPlugin
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    files: [
      'eslint.config.mjs',
      'packages/**/src/**/*.{ts,tsx}',
      'packages/**/e2e/**/*.{ts,tsx}'
    ],
    // Lint only changed lines. `diff/ci` diffs against the PR base but no-ops
    // when CI is unset, so it cannot replace `diff/diff` locally.
    processor: process.env.CI ? 'diff/ci' : 'diff/diff',
    rules: {
      ...js.configs.recommended.rules,
      ...stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        semi: true,
        jsx: true
      }).rules,
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
      '@stylistic/function-call-spacing': ['error', 'never'],
      '@stylistic/semi-style': ['error', 'last'],
      '@stylistic/max-len': ['error', {
        code: 120,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true
      }],
      // JSX makes these three noisy without making anything safer.
      '@stylistic/multiline-ternary': ['off'],
      '@stylistic/padding-line-between-statements': ['off'],
      '@stylistic/jsx-one-expression-per-line': ['off'],
      '@stylistic/max-statements-per-line': ['off'],

      // TypeScript already resolves identifiers and reports unused code more
      // accurately than the core rules, which misfire on types and interfaces.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // This package is published, so anything imported by runtime code has to
      // be a real dependency — a devDependency would break consumers the moment
      // a dep stops being bundled.
      'import/no-extraneous-dependencies': ['error', {
        packageDir: ['.', './packages/bruno-api-docs'],
        devDependencies: [
          '**/*.{test,spec}.{ts,tsx}',
          '**/e2e/**',
          '**/test-utils/**',
          '**/*.config.{ts,mts,js,mjs,cjs}'
        ]
      }],
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/store/slices/*', '!@/store/slices/*', '@slices/*'],
          message: 'Import slices through the @/store/slices/* alias.'
        }]
      }],

      'no-restricted-syntax': ['error',
        {
          selector: `Literal[value=/^${HEX_COLOUR.source}$/]`,
          message: 'Use a theme CSS variable (var(--…)) instead of a hardcoded colour.'
        },
        {
          selector: `TemplateElement[value.raw=/${HEX_COLOUR.source}/]`,
          message: 'Use a theme CSS variable (var(--…)) instead of a hardcoded colour.'
        }
      ],

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    // The theme tokens are where colours are allowed to be literal — everything
    // else consumes them as CSS custom properties.
    files: ['packages/**/src/theme/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off'
    }
  },
  {
    // Tests and dev scripts legitimately log.
    files: [
      'packages/**/*.{test,spec}.{ts,tsx}',
      'packages/**/e2e/**/*.{ts,tsx}'
    ],
    rules: {
      'no-console': 'off'
    }
  },
  {
    // Playwright e2e files are page objects/fixtures, not React — the fixture
    // `use` argument is not a hook.
    files: ['packages/**/e2e/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off'
    }
  }
];
