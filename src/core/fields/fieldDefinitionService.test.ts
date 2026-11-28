import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIndustrySeedPayload,
  customFieldsToSeedPayload,
  listSeedTemplateIndustryKeys,
  rowToCustomFieldDefinition,
  type FieldDefinitionRow,
} from './fieldDefinitionService';
import { INDUSTRY_CUSTOM_FIELDS } from '@/core/customer/customFields';

function makeRow(partial: Partial<FieldDefinitionRow> & Pick<FieldDefinitionRow, 'key' | 'label'>): FieldDefinitionRow {
  return {
    id: 'fd-1',
    organization_id: 'org-1',
    entity_type: 'customer',
    data_type: 'text',
    required: false,
    placeholder: null,
    description: null,
    options: null,
    default_value: null,
    sort_order: 10,
    is_active: true,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('fieldDefinitionService mapping', () => {
  it('rowToCustomFieldDefinition maps select options and json→textarea', () => {
    const row = makeRow({
      key: 'skinType',
      label: '피부 타입',
      data_type: 'select',
      required: true,
      options: ['건성', { label: '지성', value: 'oily' }],
      placeholder: '선택',
    });
    const def = rowToCustomFieldDefinition(row);
    assert.equal(def.key, 'skinType');
    assert.equal(def.type, 'select');
    assert.equal(def.required, true);
    assert.deepEqual(def.options, ['건성', { label: '지성', value: 'oily' }]);

    const jsonRow = makeRow({ key: 'extra', label: '추가', data_type: 'json' });
    assert.equal(rowToCustomFieldDefinition(jsonRow).type, 'textarea');
  });

  it('customFieldsToSeedPayload is idempotent by key order for piano template', () => {
    const fields = INDUSTRY_CUSTOM_FIELDS.piano;
    const a = customFieldsToSeedPayload(fields);
    const b = customFieldsToSeedPayload(fields);
    assert.deepEqual(a, b);
    assert.equal(a[0]?.key, 'pianoLevel');
    assert.equal(a[0]?.entity_type, 'customer');
    assert.equal(a[0]?.data_type, 'select');
  });

  it('buildIndustrySeedPayload returns empty for unknown industry', () => {
    assert.deepEqual(buildIndustrySeedPayload(null), []);
    assert.deepEqual(buildIndustrySeedPayload('unknown_xyz'), []);
  });

  it('buildIndustrySeedPayload mirrors INDUSTRY_CUSTOM_FIELDS for daycare', () => {
    const payload = buildIndustrySeedPayload('daycare');
    assert.equal(payload.length, INDUSTRY_CUSTOM_FIELDS.daycare.length);
    assert.ok(payload.every((p) => typeof p.key === 'string' && p.key.length > 0));
  });

  it('listSeedTemplateIndustryKeys includes piano and retail', () => {
    const keys = listSeedTemplateIndustryKeys();
    assert.ok(keys.includes('piano'));
    assert.ok(keys.includes('retail'));
  });
});
