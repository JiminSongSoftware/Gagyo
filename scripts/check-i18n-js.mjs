#!/usr/bin/env node
/**
 * i18n Parity Validation Script (JavaScript version)
 * 
 * Validates that all translation keys exist in both English and Korean locales.
 * This script can run with plain Node.js (no TypeScript compilation needed).
 */

import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function extractKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

function loadLocaleFiles(localeDir) {
  const localeMap = new Map();
  try {
    const files = readdirSync(localeDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const filePath = join(localeDir, file);
      const content = readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      const namespace = file.replace('.json', '');
      const keys = extractKeys(data).sort();
      localeMap.set(namespace, keys);
    }
  } catch (error) {
    console.error(`Error reading locale directory ${localeDir}:`, error.message);
    process.exit(1);
  }
  return localeMap;
}

function compareLocaleKeys(enKeys, koKeys) {
  let hasErrors = false;
  const allNamespaces = new Set([...enKeys.keys(), ...koKeys.keys()]);

  for (const namespace of allNamespaces) {
    const enNamespaceKeys = enKeys.get(namespace) ?? [];
    const koNamespaceKeys = koKeys.get(namespace) ?? [];

    if (enNamespaceKeys.length === 0 && koNamespaceKeys.length === 0) {
      continue;
    }

    const missingInKo = enNamespaceKeys.filter((k) => !koNamespaceKeys.includes(k));
    const missingInEn = koNamespaceKeys.filter((k) => !enNamespaceKeys.includes(k));

    if (missingInKo.length > 0) {
      hasErrors = true;
      console.error(`\n❌ Missing Korean translations for namespace "${namespace}":`);
      for (const key of missingInKo) {
        console.error(`   - ${key}`);
      }
    }

    if (missingInEn.length > 0) {
      hasErrors = true;
      console.error(`\n❌ Extra keys in Korean (not in English) for namespace "${namespace}":`);
      for (const key of missingInEn) {
        console.error(`   - ${key}`);
      }
    }

    if (!enKeys.has(namespace)) {
      hasErrors = true;
      console.error(`\n❌ Namespace "${namespace}" exists only in Korean locale`);
    }
    if (!koKeys.has(namespace)) {
      hasErrors = true;
      console.error(`\n❌ Namespace "${namespace}" exists only in English locale`);
    }
  }

  return !hasErrors;
}

function main() {
  console.log('🔍 Checking translation key parity between en and ko locales...\n');

  const rootDir = join(__dirname, '..');
  const enDir = join(rootDir, 'locales', 'en');
  const koDir = join(rootDir, 'locales', 'ko');

  const enKeys = loadLocaleFiles(enDir);
  const koKeys = loadLocaleFiles(koDir);

  console.log(`📁 Found ${enKeys.size} namespaces in English locale`);
  console.log(`📁 Found ${koKeys.size} namespaces in Korean locale\n`);

  const isParity = compareLocaleKeys(enKeys, koKeys);

  if (isParity) {
    console.log('✅ All translation keys match between English and Korean!');
    process.exit(0);
  } else {
    console.log('\n❌ Translation key parity check failed. Please fix the issues above.');
    process.exit(1);
  }
}

main();
