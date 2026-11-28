/**
 * QuickSetup / CreateOrganizationWizard 공통 프리셋 시드.
 * create_organization_with_preset + field_definitions + seedPack 멱등 적용.
 * Core Wizard는 organizationPresetSeedPort를 통해 본 구현을 호출한다.
 */

import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { callRpc } from '@/shared/kernel';
import {
  buildPresetPayload,
  type PresetPayload,
} from '@/app/presets/presetQuestionEngine';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { mergeSeedPackIntoSettings, getSeedPack } from '@/app/presets/presetDataLoader';
import { mergeOpsRuntimeSettings } from '@/core/capabilities/opsRuntimeSettings';
import { seedFieldDefinitionsFromIndustry } from '@/core/fields/fieldDefinitionService';
import {
  ensureOrganizationDefaultLocation,
  updateOrganization,
} from '@/core/organizations/services/organizationService';
import {
  registerOrganizationPresetSeed,
  type OrganizationPresetSeedInput,
  type OrganizationPresetSeedResult,
} from '@/core/organizations/organizationPresetSeedPort';
import { productService } from '@/capabilities/commerce/catalog/productService';
import { ensureAllocationPolicySeeded } from '@/core/policies/allocationPolicyService';
import { ensureTaxPolicySeeded } from '@/core/policies/taxPolicyService';
import { seedBookingLifecycle } from '@/core/policies/bookingLifecycleService';

export type { OrganizationPresetSeedInput, OrganizationPresetSeedResult };

function buildCustomTerms(industry: string): Record<string, string> | undefined {
  const preset = getIndustryPreset(industry);
  if (!preset?.terms) return undefined;
  return {
    'term.customer': preset.terms.customer,
    'term.instructor': preset.terms.instructor ?? '',
    'term.space': preset.terms.space ?? '',
    'term.pass': preset.terms.pass ?? '',
    'term.fee': preset.terms.fee ?? '',
    'term.lesson': preset.terms.lesson ?? '',
  };
}

/** Wizard·QuickSetup이 공유하는 최종 RPC payload */
export function buildOrganizationPresetConfig(
  industry: string,
  formValues: Record<string, unknown> = {},
  extras?: Record<string, unknown>
): Record<string, unknown> {
  const preset = getIndustryPreset(industry);
  const base = buildPresetPayload(industry, formValues) as PresetPayload & Record<string, unknown>;
  const withOps = mergeOpsRuntimeSettings(base, {
    turnaround_buffer_minutes:
      Number(formValues.turnaround_buffer_minutes) ||
      preset?.facilities?.turnaroundBufferMinutes ||
      15,
    seat_capacity_default:
      (Array.isArray(formValues.rooms) &&
        (formValues.rooms as { capacity?: number }[])[0]?.capacity) ||
      1,
    require_cleaning_checklist: true,
  });

  let payload: Record<string, unknown> = {
    ...withOps,
    custom_terms: buildCustomTerms(industry),
    ...(extras ?? {}),
  };

  payload = mergeSeedPackIntoSettings(payload, industry);
  return payload;
}

export async function createOrganizationWithPresetSeed(
  input: OrganizationPresetSeedInput
): Promise<OrganizationPresetSeedResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('데이터베이스 서비스에 연결할 수 없습니다.');
  }

  const trimmedName = input.orgName.trim();
  if (!trimmedName) {
    throw new Error('사업장 이름이 필요합니다.');
  }

  const formValues: Record<string, unknown> = {
    name: trimmedName,
    ...(input.formValues ?? {}),
  };
  if (input.directorName) {
    formValues.directorName = input.directorName;
    formValues.representativeName = input.directorName;
  }
  if (input.addressDisplay) {
    formValues.address = input.addressDisplay;
    formValues.businessAddress = input.addressDisplay;
  }

  const payload = buildOrganizationPresetConfig(
    input.industry,
    formValues,
    input.settingsExtras
  );

  const { data: rpcResult, error } = await callRpc<{
    success?: boolean;
    organization_id?: string;
    name?: string;
  }>(getCoreClient(), 'create_organization_with_preset', {
    p_org_name: trimmedName,
    p_industry: input.industry,
    p_custom_config: payload,
  });

  if (error) throw new Error(error.message);
  if (!rpcResult?.success || !rpcResult.organization_id) {
    throw new Error('사업장 생성 결과가 올바르지 않습니다.');
  }

  const organizationId = rpcResult.organization_id;

  if (input.addressParts) {
    try {
      await updateOrganization(organizationId, {
        addressParts: input.addressParts,
        settings: {
          directorName: input.directorName,
          representativeName: input.directorName,
        } as never,
      });
    } catch {
      // 주소 패치 실패해도 org 생성은 유지
    }
  }

  try {
    await ensureOrganizationDefaultLocation(organizationId);
  } catch {
    // 기본 창고는 이후 설정에서 생성 가능
  }

  if (input.seedFields !== false) {
    try {
      await seedFieldDefinitionsFromIndustry(organizationId, input.industry);
    } catch {
      // Phase 1 테이블 미배포 시 업종 폴백
    }
  }

  const pack = getSeedPack(input.industry);

  if (input.seedCategories !== false) {
    const cats = pack?.defaultCategories ?? [];
    for (const name of cats) {
      try {
        await productService.createCategory(organizationId, name);
      } catch {
        // 중복/권한 — skip
      }
    }
  }

  // Phase 3: 할당·세금·예약 라이프사이클 시드 (멱등)
  await ensureAllocationPolicySeeded(organizationId, pack?.allocationPolicyStub);
  await ensureTaxPolicySeeded(organizationId, pack?.taxPolicyStub);
  await seedBookingLifecycle(organizationId);

  return {
    organizationId,
    name: rpcResult.name ?? trimmedName,
  };
}

registerOrganizationPresetSeed(createOrganizationWithPresetSeed);
