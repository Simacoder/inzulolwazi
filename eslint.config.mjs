import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'eval/results/**', 'dist/**'] },
  js.configs.recommended,
  {
    files: ['backend/**/*.mjs', 'ml/**/*.mjs', 'eval/**/*.mjs', 'tests/**/*.mjs', 'scripts/**/*.mjs', 'eslint.config.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.node },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['frontend/**/*.js', 'frontend/**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.browser },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
];
