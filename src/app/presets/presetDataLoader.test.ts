import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSeedPack,
  getVerticalQuestTemplates,
  listJsonPresetIds,
  listSeedPackIndustryKeys,
  loadJsonPresetDefinitions,
  mergeSeedPackIntoSettings,
} from './presetDataLoader';
import { getIndustryPreset } from './presetRegistry';
import { getPresetQuests } from '@/app/onboarding/questEngine';
import { buildOrganizationPresetConfig } from '@/app/onboarding/organizationPresetSeed';

describe('presetDataLoader', () => {
  it('loads JSON vertical quest templates for piano and retail', () => {
    const templates = getVerticalQuestTemplates();
    assert.ok(templates.piano?.length >= 3);
    assert.equal(templates.piano[0]?.id, 'register_first_student');
    assert.ok(templates.retail?.length >= 2);
  });

  it('questEngine prefers JSON templates', () => {
    const quests = getPresetQuests('piano', '원생', '학원');
    assert.equal(quests[0]?.id, 'register_first_student');
    assert.match(quests[0]?.title ?? '', /원생/);
  });

  it('merges JSON data preset into registry', () => {
    const ids = listJsonPresetIds();
    assert.ok(ids.includes('craft_workshop_data'));
    const preset = getIndustryPreset('craft_workshop_data');
    assert.ok(preset);
    assert.equal(preset?.hiddenInMoa, true);
    assert.ok(preset?.capabilities.includes('booking'));
  });

  it('seed packs expose retail categories and idempotent settings merge', () => {
    assert.ok(listSeedPackIndustryKeys().includes('retail'));
    const pack = getSeedPack('retail');
    assert.ok((pack?.defaultCategories?.length ?? 0) >= 1);

    const once = mergeSeedPackIntoSettings({}, 'retail');
    assert.deepEqual(
      (once.default_product_categories as string[])?.slice(0, 1),
      pack?.defaultCategories?.slice(0, 1)
    );
    const twice = mergeSeedPackIntoSettings(
      { ...once, allocation_policy: { overbook_mode: 'forbid' } },
      'retail'
    );
    assert.equal(
      (twice.allocation_policy as { overbook_mode?: string }).overbook_mode,
      'forbid'
    );
  });

  it('buildOrganizationPresetConfig includes terms and seed pack stubs', () => {
    const payload = buildOrganizationPresetConfig('piano', { name: '테스트학원' });
    assert.equal(payload.industry, 'piano');
    assert.ok(payload.custom_terms);
    assert.ok(payload.allocation_policy || payload.roles);
  });

  it('loadJsonPresetDefinitions returns frozen ids', () => {
    const defs = loadJsonPresetDefinitions();
    assert.equal(defs.craft_workshop_data?.id, 'craft_workshop_data');
  });
});
