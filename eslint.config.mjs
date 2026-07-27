import globals from 'globals';
import js from '@eslint/js';
import { fixupPluginRules } from '@eslint/compat';
import eslintPluginDiff from 'eslint-plugin-diff';
import stylistic from '@stylistic/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-standalone/**',
      '**/dist-server/**',
      '**/playwright-report/**',
      '**/bundled-libraries.iife.js'
    ]
  },
  {
    plugins: {
      'diff': fixupPluginRules(eslintPluginDiff),
      '@stylistic': stylistic,
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks
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
    // Only lint lines changed vs the git diff, so the @stylistic rules apply
    // to new/changed code without reformatting the existing tree.
    processor: 'diff/diff',
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
      '@stylistic/curly-newline': ['error', {
        multiline: true,
        minElements: 2,
        consistent: true
      }],
      '@stylistic/function-paren-newline': ['off'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
      '@stylistic/function-call-spacing': ['error', 'never'],
      '@stylistic/multiline-ternary': ['off'],
      '@stylistic/padding-line-between-statements': ['off'],
      '@stylistic/semi-style': ['error', 'last'],
      '@stylistic/max-len': ['off'],
      '@stylistic/jsx-one-expression-per-line': ['off'],
      '@stylistic/max-statements-per-line': ['off'],
      '@stylistic/no-mixed-operators': ['off'],

      // TypeScript already resolves identifiers and reports unused code more
      // accurately than the core rules, which misfire on types and interfaces.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],

      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
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
