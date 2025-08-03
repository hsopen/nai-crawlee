// eslint.config.js
import antfu from '@antfu/eslint-config';

export default antfu(
  {
    type: 'app',
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: true,
    },
    typescript: true,
    vue: true,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      'semi': ['error', 'always'],
      'antfu/no-top-level-await': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: 'jsonc-eslint-parser',
    },
    rules: {
      'jsonc/indent': ['error', 4],
    },
  },
);
