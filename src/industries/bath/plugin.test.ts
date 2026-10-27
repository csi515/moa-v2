/**
 * Bath plugin이 sauna_jjimjilbang에 연결되는지.
 * 실행: npx tsx src/industries/bath/plugin.test.ts
 */
import assert from 'node:assert/strict';
import {
  getIndustryDefinition,
  hasIndustryModule,
  shouldUseGenericShell,
} from '@/core/industry/catalog';
import { normalizeIndustryType } from '@/core/industry/types';
import { bathPluginManifest } from './plugin';

assert.equal(bathPluginManifest.id, 'sauna_jjimjilbang');
assert.equal(hasIndustryModule('sauna_jjimjilbang'), true);
assert.equal(hasIndustryModule('sauna_jjimjbang'), true);
assert.equal(shouldUseGenericShell('sauna_jjimjilbang'), false);
assert.equal(shouldUseGenericShell('sauna_jjimjbang'), false);
assert.equal(normalizeIndustryType('sauna_jjimjbang'), 'sauna_jjimjilbang');
assert.equal(getIndustryDefinition('sauna_jjimjilbang')?.moduleId, bathPluginManifest.id);
assert.equal(getIndustryDefinition('sauna_jjimjbang')?.moduleId, bathPluginManifest.id);
assert.ok(bathPluginManifest.adminTabs.includes('dashboard'));
assert.ok(bathPluginManifest.adminTabs.includes('members'));
assert.ok(bathPluginManifest.staffTabs.includes('dashboard'));
assert.ok(bathPluginManifest.staffTabs.includes('members'));

console.log('bath/plugin.test.ts: ok');
