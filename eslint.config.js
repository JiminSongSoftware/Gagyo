// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const i18nJson = require('eslint-plugin-i18n-json');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      '.expo/*',
      '.expo-shared/*',
      'ios/build/*',
      'android/app/build/*',
      'coverage/*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'i18n-json': i18nJson,
    },
    rules: {
      // TypeScript strictness rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
    },
  },
  {
    files: ['**/*.tsx'],
    rules: {
      // i18n hardcoded-string guard - simplified selectors
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'JSXElement[name="Text"] > JSXText',
          message: 'Hardcoded strings in Text are not allowed. Use i18nKey prop: <Text i18nKey="common.key" />',
        },
        {
          selector: 'JSXElement[name="Heading"] > JSXText',
          message: 'Hardcoded strings in Heading are not allowed. Use i18nKey prop: <Heading i18nKey="common.key" />',
        },
        {
          selector: 'JSXElement[name="Text"] JSXAttribute[name="children"]',
          message: 'children prop is not allowed in Text. Use i18nKey prop: <Text i18nKey="common.key" />',
        },
        {
          selector: 'JSXElement[name="Heading"] JSXAttribute[name="children"]',
          message: 'children prop is not allowed in Heading. Use i18nKey prop: <Heading i18nKey="common.key" />',
        },
        {
          selector: 'JSXElement[name="Button"] JSXAttribute[name="children"]',
          message: 'Hardcoded labels in Button are not allowed. Use labelKey prop: <Button labelKey="common.key" />',
        },
        {
          selector: 'JSXElement[name="Button"] JSXAttribute[name="title"]',
          message: 'Hardcoded labels in Button are not allowed. Use labelKey prop: <Button labelKey="common.key" />',
        },
        {
          selector: 'JSXElement[name="Input"] JSXAttribute[name="label"]',
          message: 'Hardcoded labels in Input are not allowed. Use labelKey prop',
        },
        {
          selector: 'JSXElement[name="Input"] JSXAttribute[name="placeholder"]',
          message: 'Hardcoded placeholders in Input are not allowed. Use placeholderKey prop',
        },
        {
          selector: 'JSXElement[name="TextArea"] JSXAttribute[name="label"]',
          message: 'Hardcoded labels in TextArea are not allowed. Use labelKey prop',
        },
        {
          selector: 'JSXElement[name="TextArea"] JSXAttribute[name="placeholder"]',
          message: 'Hardcoded placeholders in TextArea are not allowed. Use placeholderKey prop',
        },
      ],
    },
  },
  {
    files: ['locales/**/*.json'],
    rules: {
      // Validate JSON structure and key consistency across locales
      'i18n-json/valid-json': 'error',
      'i18n-json/valid-key-syntax': 'error',
      'i18n-json/confirmed-keys': 'error',
      'i18n-json/sorted-keys': 'off', // Optional: keep keys in logical order
    },
  },
]);
