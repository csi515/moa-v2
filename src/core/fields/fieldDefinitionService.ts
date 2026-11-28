/**
 * 테넌트 field_definitions CRUD + 업종 프리셋 시드.
 * SSOT: core.field_definitions (코드 INDUSTRY_CUSTOM_FIELDS는 시드 템플릿 전용)
 */

import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type { Database, Json } from '@/lib/supabase/database.types';
import { parseSupabaseError } from '@/shared/errors/supabaseErrorParser';
import type { EntityType } from './dynamicFieldEngine';
import type { CustomFieldDefinition, CustomFieldType } from '@/core/customer/customFields';
import {
  getCustomFieldsForIndustry,
  INDUSTRY_CUSTOM_FIELDS,
} from '@/core/customer/customFields';

type FieldDefinitionTable = Database['core']['Tables']['field_definitions'];
export type FieldDefinitionRow = FieldDefinitionTable['Row'];
type FieldDefinitionInsert = FieldDefinitionTable['Insert'];

export type FieldDataType = CustomFieldType | 'json';

export interface FieldDefinitionInput {
  entityType?: EntityType;
  key: string;
  label: string;
  dataType: FieldDataType;
  required?: boolean;
  placeholder?: string | null;
  description?: string | null;
  options?: unknown;
  defaultValue?: unknown;
  sortOrder?: number;
  isActive?: boolean;
}

function asJson(value: unknown): Json | null {
  if (value === undefined) return null;
  return value as Json;
}

function normalizeOptions(raw: unknown): CustomFieldDefinition['options'] {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'value' in item) {
      const o = item as { label?: string; value: string };
      return { label: o.label ?? String(o.value), value: String(o.value) };
    }
    return String(item);
  });
}

/** DB 행 → 폼용 CustomFieldDefinition */
export function rowToCustomFieldDefinition(row: FieldDefinitionRow): CustomFieldDefinition {
  const type = (row.data_type === 'json' ? 'textarea' : row.data_type) as CustomFieldType;
  return {
    key: row.key,
    label: row.label,
    type,
    required: row.required,
    placeholder: row.placeholder ?? undefined,
    description: row.description ?? undefined,
    options: normalizeOptions(row.options),
    defaultValue: row.default_value ?? undefined,
  };
}

/** 시드 템플릿 → RPC JSON */
export function customFieldsToSeedPayload(
  fields: readonly CustomFieldDefinition[],
  entityType: EntityType = 'customer'
): Record<string, unknown>[] {
  return fields.map((f, index) => ({
    entity_type: entityType,
    key: f.key,
    label: f.label,
    data_type: f.type,
    type: f.type,
    required: Boolean(f.required),
    placeholder: f.placeholder ?? null,
    description: f.description ?? null,
    options: f.options ? [...f.options] : null,
    defaultValue: f.defaultValue ?? null,
    sort_order: (index + 1) * 10,
  }));
}

export function buildIndustrySeedPayload(
  industry: string | null | undefined
): Record<string, unknown>[] {
  return customFieldsToSeedPayload(getCustomFieldsForIndustry(industry), 'customer');
}

export async function listFieldDefinitions(
  organizationId: string,
  entityType: EntityType = 'customer',
  opts?: { includeInactive?: boolean }
): Promise<FieldDefinitionRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    let q = getCoreClient()
      .from('field_definitions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('entity_type', entityType)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (!opts?.includeInactive) {
      q = q.eq('is_active', true);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    throw new Error(
      parseSupabaseError(err, { entity: '커스텀 필드', action: '조회' }).userMessage
    );
  }
}

/**
 * DB 정의 우선, 없으면 업종 코드 프리셋 폴백.
 * 폼·로스터 런타임 진입점.
 */
export async function resolveCustomFieldDefinitions(
  organizationId: string | null | undefined,
  industry: string | null | undefined,
  entityType: EntityType = 'customer'
): Promise<readonly CustomFieldDefinition[]> {
  if (organizationId && isSupabaseConfigured()) {
    try {
      const rows = await listFieldDefinitions(organizationId, entityType);
      if (rows.length > 0) {
        return rows.map(rowToCustomFieldDefinition);
      }
    } catch {
      // 폴백
    }
  }
  if (entityType === 'customer' || entityType === 'student') {
    return getCustomFieldsForIndustry(industry);
  }
  return [];
}

export async function createFieldDefinition(
  organizationId: string,
  input: FieldDefinitionInput
): Promise<FieldDefinitionRow> {
  const entityType = input.entityType ?? 'customer';
  const payload: FieldDefinitionInsert = {
    organization_id: organizationId,
    entity_type: entityType,
    key: input.key.trim(),
    label: input.label.trim(),
    data_type: input.dataType,
    required: Boolean(input.required),
    placeholder: input.placeholder ?? null,
    description: input.description ?? null,
    options: asJson(input.options),
    default_value: asJson(input.defaultValue),
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
  };

  try {
    const { data, error } = await getCoreClient()
      .from('field_definitions')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(
      parseSupabaseError(err, { entity: '커스텀 필드', action: '등록' }).userMessage
    );
  }
}

export async function updateFieldDefinition(
  organizationId: string,
  id: string,
  patch: Partial<FieldDefinitionInput>
): Promise<FieldDefinitionRow> {
  const update: FieldDefinitionTable['Update'] = {};
  if (patch.label !== undefined) update.label = patch.label.trim();
  if (patch.dataType !== undefined) update.data_type = patch.dataType;
  if (patch.required !== undefined) update.required = patch.required;
  if (patch.placeholder !== undefined) update.placeholder = patch.placeholder;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.options !== undefined) update.options = asJson(patch.options);
  if (patch.defaultValue !== undefined) update.default_value = asJson(patch.defaultValue);
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;

  try {
    const { data, error } = await getCoreClient()
      .from('field_definitions')
      .update(update)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(
      parseSupabaseError(err, { entity: '커스텀 필드', action: '수정' }).userMessage
    );
  }
}

export async function softDeleteFieldDefinition(
  organizationId: string,
  id: string
): Promise<void> {
  try {
    const { error } = await getCoreClient()
      .from('field_definitions')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null);
    if (error) throw error;
  } catch (err) {
    throw new Error(
      parseSupabaseError(err, { entity: '커스텀 필드', action: '삭제' }).userMessage
    );
  }
}

/** 업종 프리셋 필드를 org에 시드 (이미 있으면 덮어쓰지 않음) */
export async function seedFieldDefinitionsFromIndustry(
  organizationId: string,
  industry: string | null | undefined
): Promise<number> {
  const payload = buildIndustrySeedPayload(industry);
  if (payload.length === 0) return 0;
  if (!isSupabaseConfigured()) return 0;

  try {
    const { data, error } = await getCoreClient().rpc('seed_field_definitions_from_preset', {
      p_org_id: organizationId,
      p_fields: payload as Json,
    });
    if (error) throw error;
    return typeof data === 'number' ? data : Number(data) || payload.length;
  } catch (err) {
    // RPC 미배포 환경: 클라이언트 insert 폴백 (unique 충돌은 skip)
    let seeded = 0;
    for (const item of payload) {
      try {
        await createFieldDefinition(organizationId, {
          entityType: (item.entity_type as EntityType) || 'customer',
          key: String(item.key),
          label: String(item.label),
          dataType: (item.data_type as FieldDataType) || 'text',
          required: Boolean(item.required),
          placeholder: (item.placeholder as string) ?? null,
          description: (item.description as string) ?? null,
          options: item.options,
          defaultValue: item.defaultValue,
          sortOrder: Number(item.sort_order) || 0,
        });
        seeded += 1;
      } catch {
        // unique 충돌 = 이미 존재 → skip
      }
    }
    if (seeded === 0 && payload.length > 0) {
      return payload.length;
    }
    if (seeded === 0) {
      throw new Error(
        parseSupabaseError(err, { entity: '커스텀 필드', action: '시드' }).userMessage
      );
    }
    return seeded;
  }
}

/** 시드 템플릿 업종 키 목록 (테스트·문서용) */
export function listSeedTemplateIndustryKeys(): string[] {
  return Object.keys(INDUSTRY_CUSTOM_FIELDS);
}
