// ESLint 9 (flat config) — React + Vite, tests Vitest y E2E Cypress
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist/', 'coverage/', 'reports/', 'cypress/videos/', 'cypress/screenshots/'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType:  'module',
      globals:     { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18.2' } },
    plugins: {
      react,
      'react-hooks':   reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      'react/jsx-uses-react': 'error', // el proyecto importa React en cada componente
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true, allowExportNames: ['useAuth'] }],
    },
  },
  {
    files: ['*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/**/*.test.{js,jsx}', 'src/test/**'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'react-refresh/only-export-components': 'off' }, // Fast Refresh no aplica a tests
  },
  {
    files: ['cypress/**/*.js'],
    languageOptions: {
      globals: { cy: 'readonly', Cypress: 'readonly', describe: 'readonly', it: 'readonly', beforeEach: 'readonly', expect: 'readonly' },
    },
  },
];
