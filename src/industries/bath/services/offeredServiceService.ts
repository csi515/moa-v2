/**
 * Bath 인적 서비스 카탈로그.
 * Product가 아님. 예약은 resourceReservationCapability + 향후 staff 충돌.
 */
import { resourceReservationCapability } from '@/core/resources';
import type { ResourceReservation } from '@/core/resources';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getBathClient } from '@/lib/supabase/bathClient';
import { getOrganizationId } from '@/services/adapters';
import type { BathService, BathServiceListQuery, BathServiceWriteInput } from '../types/service';
import { mapBathServiceRpcError } from './offeredServiceErrors';
import { rowToBathService, type BathServiceRow } from './offeredServiceMappers';
import { getBathServiceById, listBathServices } from './offeredServiceRepository';
import {
  bathServiceValidationMessage,
  validateBathServiceInput,
} from './offeredServiceValidation';

function requireOrgId(): string {
  if (!isSupabaseConfigured()) {
    throw new Error('온라인 환경에서만 서비스를 처리할 수 있습니다.');
  }
  const orgId = getOrganizationId();
  if (!orgId) throw new Error('사업장이 선택되지 않았습니다.');
  return orgId;
}

function assertWrite(input: BathServiceWriteInput): void {
  const decision = validateBathServiceInput(input);
  if (decision.ok === false) {
    throw new Error(bathServiceValidationMessage(decision.reason));
  }
}

async function callServiceRpc(
  name: 'upsert_service' | 'set_service_active' | 'delete_service' | 'set_service_resources' | 'set_service_staff',
  args: Record<string, unknown>
): Promise<BathService | null> {
  const client = getBathClient();
  const { data, error } = await client.rpc(name, args as never);
  if (error) throw new Error(mapBathServiceRpcError(error).message);
  if (!data) return null;
  return rowToBathService(data as BathServiceRow);
}

function writeArgs(organizationId: string, input: BathServiceWriteInput, id?: string) {
  return {
    p_organization_id: organizationId,
    p_id: id ?? null,
    p_name: input.name.trim(),
    p_category: input.category,
    p_duration_minutes: input.durationMinutes,
    p_base_price: input.basePrice ?? 0,
    p_requires_staff: input.requiresStaff ?? false,
    p_requires_resource: input.requiresResource ?? false,
    p_product_id: input.productId ?? null,
    p_active: input.active ?? true,
    p_sort_order: input.sortOrder ?? 0,
    p_metadata: input.metadata ?? {},
  };
}

export const bathOfferedService = {
  list(query: BathServiceListQuery = {}) {
    return listBathServices(requireOrgId(), query);
  },

  listActive() {
    return listBathServices(requireOrgId(), { active: true });
  },

  getById(serviceId: string) {
    return getBathServiceById(requireOrgId(), serviceId);
  },

  create(input: BathServiceWriteInput): Promise<BathService> {
    assertWrite(input);
    return callServiceRpc('upsert_service', writeArgs(requireOrgId(), input)).then((row) => {
      if (!row) throw new Error('서비스 저장에 실패했습니다.');
      return row;
    });
  },

  update(serviceId: string, input: BathServiceWriteInput): Promise<BathService> {
    assertWrite(input);
    return callServiceRpc('upsert_service', writeArgs(requireOrgId(), input, serviceId)).then((row) => {
      if (!row) throw new Error('서비스 저장에 실패했습니다.');
      return row;
    });
  },

  setActive(serviceId: string, active: boolean): Promise<BathService> {
    return callServiceRpc('set_service_active', {
      p_organization_id: requireOrgId(),
      p_service_id: serviceId,
      p_active: active,
    }).then((row) => {
      if (!row) throw new Error('서비스 상태 변경에 실패했습니다.');
      return row;
    });
  },

  remove(serviceId: string): Promise<void> {
    return callServiceRpc('delete_service', {
      p_organization_id: requireOrgId(),
      p_service_id: serviceId,
    }).then(() => undefined);
  },

  setResources(serviceId: string, resourceIds: string[]): Promise<BathService> {
    return callServiceRpc('set_service_resources', {
      p_organization_id: requireOrgId(),
      p_service_id: serviceId,
      p_resource_ids: resourceIds,
    }).then((row) => {
      if (!row) throw new Error('서비스 자원 연결에 실패했습니다.');
      return row;
    });
  },

  setStaff(serviceId: string, staffIds: string[]): Promise<BathService> {
    return callServiceRpc('set_service_staff', {
      p_organization_id: requireOrgId(),
      p_service_id: serviceId,
      p_staff_ids: staffIds,
    }).then((row) => {
      if (!row) throw new Error('서비스 직원 연결에 실패했습니다.');
      return row;
    });
  },

  /** 연결된 자원의 예약. 서비스에 booked 상태를 두지 않는다. */
  async listReservations(serviceId: string): Promise<ResourceReservation[]> {
    const organizationId = requireOrgId();
    const service = await getBathServiceById(organizationId, serviceId);
    if (!service) throw new Error('서비스를 찾을 수 없습니다.');
    const groups = await Promise.all(
      service.resourceIds.map((resourceId) =>
        resourceReservationCapability.listReservations({
          organizationId,
          resourceId,
          order: 'asc',
        })
      )
    );
    return groups.flat();
  },
};
