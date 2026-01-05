#!/usr/bin/env bun
/**
 * i18n Parity Validation Script
 *
 * Validates that all translation keys exist in both English and Korean locales.
 * This script traverses all JSON files under locales/en and locales/ko directories
 * and ensures key parity across all namespaces.
 *
 * Usage: bun scripts/check-i18n.ts
 *
 * Exit codes:
 * - 0: All translation keys match
 * - 1: Missing keys found in either locale
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface NestedObject {
  [key: string]: string | NestedObject;
}

/**
 * Recursively extracts all keys from a nested object as dot-notation paths
 * @param obj - The nested object to extract keys from
 * @param prefix - The current key path prefix
 * @returns Array of dot-notation key paths
 */
function extractKeys(obj: NestedObject, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value as NestedObject, fullPath));
    } else {
      keys.push(fullPath);
    }
  }

  return keys;
}

/**
 * Loads all JSON files from a directory and returns a map of namespace to keys
 * @param localeDir - Path to the locale directory (e.g., 'locales/en')
 * @returns Map of filename to array of keys
 */
function loadLocaleFiles(localeDir: string): Map<string, string[]> {
  const localeMap = new Map<string, string[]>();

  try {
    const files = readdirSync(localeDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const filePath = join(localeDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content) as NestedObject;
      const namespace = file.replace('.json', '');
      const keys = extractKeys(data).sort();
      localeMap.set(namespace, keys);
    }
  } catch (error) {
    console.error(`Error reading locale directory ${localeDir}:`, error);
    process.exit(1);
  }

  return localeMap;
}

/**
 * Compares keys between two locale maps and reports discrepancies
 * @param enKeys - Map of English namespace to keys
 * @param koKeys - Map of Korean namespace to keys
 * @returns true if all keys match, false otherwise
 */
function compareLocaleKeys(
  enKeys: Map<string, string[]>,
  koKeys: Map<string, string[]>
): boolean {
  let hasErrors = false;
  const allNamespaces = new Set([...enKeys.keys(), ...koKeys.keys()]);

  // Check each namespace
  for (const namespace of allNamespaces) {
    const enNamespaceKeys = enKeys.get(namespace) ?? [];
    const koNamespaceKeys = koKeys.get(namespace) ?? [];

    if (enNamespaceKeys.length === 0 && koNamespaceKeys.length === 0) {
      continue;
    }

    // Find keys missing in Korean
    const missingInKo = enNamespaceKeys.filter((k) => !koNamespaceKeys.includes(k));

    // Find keys missing in English (extra keys in Korean)
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

    // Check for namespace that only exists in one locale
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

/**
 * Main function
 */
function main(): void {
  console.log('🔍 Checking translation key parity between en and ko locales...\n');

  const enDir = join(process.cwd(), 'locales', 'en');
  const koDir = join(process.cwd(), 'locales', 'ko');

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
