/**
 * 지점 CRUD. 쓰기는 RPC. 기존 organization_id 테넌트 경계를 유지한다.
 */
import { toAuthorizationGrant } from '@/core/authorization/authorizationService';
import type { AuthorizationGrant } from '@/core/authorization';
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { filterAccessibleLocations, pickOrganizationTimezone, resolveLocationTimezone } from './locationAware';
import { userFacingErrorMessage } from '@/shared/errors/userFacingError';
import { mapLocationRpcError } from './locationErrors';
import { rowToLocation, type LocationRow } from './locationMappers';
import { getLocationById, listLocations } from './locationRepository';
import {
  DEFAULT_LOCATION_CODE,
  type Location,
  type LocationAccessContext,
  type LocationListQuery,
  type UpsertLocationInput,
} from './types';

const LOCATION_ID_STORAGE_KEY = 'moa_current_location_id';

type StoredLocationSelection = {
  organizationId: string;
  locationId: string;
};

function readStoredSelection(): StoredLocationSelection | string | null {
  const raw = localStorage.getItem(LOCATION_ID_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as StoredLocationSelection).organizationId === 'string' &&
      typeof (parsed as StoredLocationSelection).locationId === 'string'
    ) {
      return parsed as StoredLocationSelection;
    }
  } catch {
    /* 레거시: location id 문자열 */
  }
  return raw;
}

export function getStoredLocationId(organizationId?: string | null): string | null {
  const stored = readStoredSelection();
  if (!stored) return null;
  if (typeof stored === 'string') return stored;
  if (organizationId && stored.organizationId !== organizationId) return null;
  return stored.locationId;
}

export function storeLocationId(locationId: string, organizationId?: string | null): void {
  if (organizationId) {
    localStorage.setItem(
      LOCATION_ID_STORAGE_KEY,
      JSON.stringify({ organizationId, locationId } satisfies StoredLocationSelection)
    );
    return;
  }
  localStorage.setItem(LOCATION_ID_STORAGE_KEY, locationId);
}

export function clearStoredLocationId(): void {
  localStorage.removeItem(LOCATION_ID_STORAGE_KEY);
}

async function callLocationRpc(name: 'upsert_location' | 'set_location_active', args: Record<string, unknown>) {
  const client = getCoreClient();
  const { data, error } = await client.rpc(name, args as never);
  if (error) throw new Error(mapLocationRpcError(error).message);
  if (!data) throw new Error('지점 처리에 실패했습니다.');
  return data;
}

export const locationService = {
  list(organizationId: string, query: LocationListQuery = {}) {
    return listLocations(organizationId, query);
  },

  async listAccessible(
    organizationId: string,
    access: Omit<LocationAccessContext, 'organizationId'>,
    query: LocationListQuery = {}
  ): Promise<Location[]> {
    const rows = await listLocations(organizationId, query);
    return filterAccessibleLocations(rows, { ...access, organizationId });
  },

  async listAccessGrants(organizationId: string): Promise<AuthorizationGrant[]> {
    if (!organizationId || !isSupabaseConfigured()) return [];
    try {
      const client = getCoreClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      const userId = authData.user?.id;
      if (authError || !userId) return [];
      const { data, error } = await client
        .from('authorization_grants')
        .select('organization_id, user_id, permission, scope_type, scope_id, is_active')
        .eq('organization_id', organizationId)
        .eq('user_id', userId);
      if (error || !data) return [];
      return data
        .map(toAuthorizationGrant)
        .filter((grant): grant is AuthorizationGrant => grant != null);
    } catch {
      return [];
    }
  },

  getById(organizationId: string, locationId: string) {
    return getLocationById(organizationId, locationId);
  },

  resolveTimezone(timezone?: string | null): string {
    return resolveLocationTimezone(timezone);
  },

  async resolveOrganizationTimezone(
    organizationId: string,
    locationId?: string | null
  ): Promise<string> {
    const rows = await listLocations(organizationId);
    return pickOrganizationTimezone(rows, locationId);
  },

  async upsert(organizationId: string, input: UpsertLocationInput): Promise<Location> {
    const data = await callLocationRpc('upsert_location', {
      p_organization_id: organizationId,
      p_name: input.name,
      p_code: input.code ?? null,
      p_slug: input.slug ?? null,
      p_address: input.address ?? null,
      p_phone: input.phone ?? null,
      p_timezone: input.timezone ?? null,
      p_id: input.id ?? null,
      p_metadata: input.metadata ?? {},
    });
    return rowToLocation(data as LocationRow);
  },

  async setActive(organizationId: string, locationId: string, active: boolean): Promise<Location> {
    const data = await callLocationRpc('set_location_active', {
      p_organization_id: organizationId,
      p_location_id: locationId,
      p_active: active,
    });
    return rowToLocation(data as LocationRow);
  },

  /** 기본 지점 확인. 이미 있으면 RPC를 호출하지 않는다. */
  async ensureDefault(organizationId: string): Promise<string> {
    let existing: Location[];
    try {
      existing = await listLocations(organizationId);
    } catch (error) {
      throw new Error(userFacingErrorMessage(error));
    }
    const found =
      existing.find((row) => row.code === DEFAULT_LOCATION_CODE) ?? existing[0];
    if (found) return found.id;

    const client = getCoreClient();
    const { data, error } = await client.rpc('ensure_default_organization_location', {
      p_organization_id: organizationId,
    });
    if (error) throw new Error(userFacingErrorMessage(error));
    if (!data) {
      throw new Error(userFacingErrorMessage(new Error('Location not found')));
    }
    return String(data);
  },
};
