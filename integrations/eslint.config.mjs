import globals from 'globals';
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

// The repo's stylistic rules, minus everything browser-shaped.
export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/shell/shell.js']
  },
  {
    plugins: {
      '@stylistic': stylistic,
      '@typescript-eslint': tsPlugin
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.node
      }
    },
    files: ['eslint.config.mjs', '**/src/**/*.ts', '**/test/**/*.{ts,mjs}', 'contract-tests/apps/*.js', '**/examples/**/*.{js,ts}'],
    rules: {
      ...js.configs.recommended.rules,
      ...stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        semi: true,
        jsx: false
      }).rules,
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
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

      'curly': ['error', 'multi-line'],

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

      'no-console': ['error', { allow: ['log', 'warn', 'error'] }]
    }
  },
  {
    files: ['shell/*.mjs'],
    plugins: { '@stylistic': stylistic },
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: { ...globals.browser }
    },
    rules: {
      ...js.configs.recommended.rules,
      ...stylistic.configs.customize({ indent: 2, quotes: 'single', semi: true, jsx: false }).rules,
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/max-len': ['error', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],
      'curly': ['error', 'multi-line'],
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }]
    }
  },
  {
    files: ['contract-tests/apps/*.js', '**/examples/**/*.{js,ts}'],
    rules: {
      'no-console': 'off'
    }
  }
];
