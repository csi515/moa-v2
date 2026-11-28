import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { filterRowsByMemberDepartmentScope, type DepartmentScopeType } from '@/core/organizations/departmentScope';

export type StockLocation = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  departmentId: string | null;
  isActive: boolean;
  /** 설정 화면에서 이름을 저장한 창고 */
  configured: boolean;
};

type StockLocationRow = {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  department_id: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
};

function ensureClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase가 설정되지 않았습니다.');
  }
  return getCoreClient();
}

function mapRow(row: StockLocationRow): StockLocation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    code: row.code,
    departmentId: row.department_id,
    isActive: row.is_active,
    configured: row.metadata?.configured === true,
  };
}

const LOCATION_COLUMNS =
  'id, organization_id, name, code, department_id, is_active, metadata';

function locationCode(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let body = '';
  for (let i = 0; i < 8; i += 1) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `wh_${body}`;
}

function withConfigured(
  metadata: Record<string, unknown> | null,
  extra: Record<string, unknown>
): Record<string, unknown> {
  return { ...(metadata ?? {}), ...extra, configured: true };
}

/** 자재 창고(부서 연동) CRUD·스코프 필터 */
export const stockLocationService = {
  async ensureCentral(organizationId: string): Promise<string> {
    const client = ensureClient();
    const { data, error } = await client.rpc(
      'ensure_central_stock_location_id' as never,
      { p_organization_id: organizationId } as never
    );
    if (error) throw error;
    const id = typeof data === 'string' ? data : String(data ?? '');
    if (!id) throw new Error('중앙 창고를 준비하지 못했습니다.');
    return id;
  },

  async listLocations(
    organizationId: string,
    options?: { includeInactive?: boolean }
  ): Promise<StockLocation[]> {
    const client = ensureClient();
    await this.ensureCentral(organizationId);
    let query = client
      .from('stock_locations' as never)
      .select(LOCATION_COLUMNS)
      .eq('organization_id', organizationId)
      .order('code', { ascending: true });
    if (!options?.includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return ((data as StockLocationRow[] | null) ?? []).map(mapRow);
  },

  /** 부서 스코프 적용. department_id NULL(central)은 항상 포함. */
  filterByMemberScope(
    locations: StockLocation[],
    input: {
      scopeType: DepartmentScopeType;
      memberDepartmentId: string | null;
      memberPath: string | null;
      departmentPathById: ReadonlyMap<string, string>;
    }
  ): StockLocation[] {
    return filterRowsByMemberDepartmentScope(
      locations.map((loc) => ({ ...loc, department_id: loc.departmentId })),
      input
    ).map(({ department_id: _d, ...rest }) => rest as StockLocation);
  },

  async createDepartmentLocation(input: {
    organizationId: string;
    name: string;
    code: string;
    departmentId: string;
  }): Promise<StockLocation> {
    const client = ensureClient();
    const name = input.name.trim();
    const code = input.code.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    if (!name) throw new Error('창고 이름을 입력해 주세요.');
    if (code.length < 2) throw new Error('창고 코드가 올바르지 않습니다.');
    if (code === 'central') throw new Error('central 코드는 예약되어 있습니다.');
    if (!input.departmentId) throw new Error('부서를 선택해 주세요.');

    const { data, error } = await client
      .from('stock_locations' as never)
      .insert({
        organization_id: input.organizationId,
        name,
        code,
        department_id: input.departmentId,
        is_active: true,
        metadata: { kind: 'department', configured: true },
      } as never)
      .select(LOCATION_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as StockLocationRow);
  },

  async createNamedLocation(input: {
    organizationId: string;
    name: string;
    departmentId?: string | null;
  }): Promise<StockLocation> {
    const name = input.name.trim();
    if (!name) throw new Error('창고 이름을 입력해 주세요.');
    if (input.departmentId) {
      return this.createDepartmentLocation({
        organizationId: input.organizationId,
        name,
        code: locationCode(),
        departmentId: input.departmentId,
      });
    }
    const client = ensureClient();
    const { data, error } = await client
      .from('stock_locations' as never)
      .insert({
        organization_id: input.organizationId,
        name,
        code: locationCode(),
        department_id: null,
        is_active: true,
        metadata: { kind: 'store', configured: true },
      } as never)
      .select(LOCATION_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as StockLocationRow);
  },

  async renameLocation(
    organizationId: string,
    locationId: string,
    name: string
  ): Promise<StockLocation> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('창고 이름을 입력해 주세요.');
    const client = ensureClient();
    const { data: current, error: readError } = await client
      .from('stock_locations' as never)
      .select(LOCATION_COLUMNS)
      .eq('id', locationId)
      .eq('organization_id', organizationId)
      .single();
    if (readError) throw readError;
    const row = current as StockLocationRow;
    const { data, error } = await client
      .from('stock_locations' as never)
      .update({
        name: trimmed,
        metadata: withConfigured(row.metadata, {}),
      } as never)
      .eq('id', locationId)
      .eq('organization_id', organizationId)
      .select(LOCATION_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as StockLocationRow);
  },

  async setLocationActive(
    organizationId: string,
    locationId: string,
    isActive: boolean
  ): Promise<StockLocation> {
    const client = ensureClient();
    const { data: current, error: readError } = await client
      .from('stock_locations' as never)
      .select(LOCATION_COLUMNS)
      .eq('id', locationId)
      .eq('organization_id', organizationId)
      .single();
    if (readError) throw readError;
    const row = current as StockLocationRow;
    if (row.code === 'central' && !isActive) {
      throw new Error('판매에 연결된 기본 창고는 끌 수 없습니다. 이름만 바꿀 수 있습니다.');
    }
    const { data, error } = await client
      .from('stock_locations' as never)
      .update({
        is_active: isActive,
        metadata: withConfigured(row.metadata, {}),
      } as never)
      .eq('id', locationId)
      .eq('organization_id', organizationId)
      .select(LOCATION_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as StockLocationRow);
  },
};
