import { getCoreClient } from '@/lib/supabase';
import { callRpc } from '@/shared/kernel';
import type {
  DeptAggregateRow,
  ItemAggregateRow,
  OfficeSupplyCampaign,
  OfficeSupplyCatalogItem,
  OfficeSupplyRequestLineInput,
} from './domain/officeSupplyRequestEngine';

export type CatalogItemRow = {
  id: string;
  organization_id: string;
  name: string;
  unit: string;
  estimated_unit_price: number;
  is_active: boolean;
  sort_order: number;
};

export type CampaignRow = {
  id: string;
  organization_id: string;
  year_month: string;
  deadline_at: string;
  status: 'open' | 'closed';
  closed_at: string | null;
  note: string | null;
};

export type RequestLineRow = {
  id: string;
  organization_id: string;
  campaign_id: string;
  member_id: string;
  department_id: string | null;
  catalog_item_id: string;
  quantity: number;
};

export type DeptAggregatePayload = {
  campaign: {
    id: string;
    year_month: string;
    deadline_at: string;
    status: 'open' | 'closed';
    closed_at: string | null;
    note: string | null;
  };
  by_department: Array<{
    department_id: string | null;
    department_name: string;
    catalog_item_id: string;
    item_name: string;
    unit: string;
    estimated_unit_price: number;
    total_quantity: number;
    estimated_total: number;
  }>;
  by_item: Array<{
    catalog_item_id: string;
    item_name: string;
    unit: string;
    estimated_unit_price: number;
    total_quantity: number;
    estimated_total: number;
  }>;
  grand_total_estimate: number;
};

export function catalogRowToDomain(row: CatalogItemRow): OfficeSupplyCatalogItem {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    estimatedUnitPrice: Number(row.estimated_unit_price) || 0,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function campaignRowToDomain(row: CampaignRow): OfficeSupplyCampaign {
  return {
    id: row.id,
    yearMonth: row.year_month,
    deadlineAt: row.deadline_at,
    status: row.status,
    closedAt: row.closed_at,
    note: row.note,
  };
}

export function mapAggregatePayload(payload: DeptAggregatePayload): {
  campaign: OfficeSupplyCampaign;
  byDepartment: DeptAggregateRow[];
  byItem: ItemAggregateRow[];
  grandTotalEstimate: number;
} {
  return {
    campaign: {
      id: payload.campaign.id,
      yearMonth: payload.campaign.year_month,
      deadlineAt: payload.campaign.deadline_at,
      status: payload.campaign.status,
      closedAt: payload.campaign.closed_at,
      note: payload.campaign.note,
    },
    byDepartment: (payload.by_department ?? []).map((r) => ({
      departmentId: r.department_id,
      departmentName: r.department_name,
      catalogItemId: r.catalog_item_id,
      itemName: r.item_name,
      unit: r.unit,
      estimatedUnitPrice: Number(r.estimated_unit_price) || 0,
      totalQuantity: Number(r.total_quantity) || 0,
      estimatedTotal: Number(r.estimated_total) || 0,
    })),
    byItem: (payload.by_item ?? []).map((r) => ({
      catalogItemId: r.catalog_item_id,
      itemName: r.item_name,
      unit: r.unit,
      estimatedUnitPrice: Number(r.estimated_unit_price) || 0,
      totalQuantity: Number(r.total_quantity) || 0,
      estimatedTotal: Number(r.estimated_total) || 0,
    })),
    grandTotalEstimate: Number(payload.grand_total_estimate) || 0,
  };
}

export async function listCatalogItems(
  organizationId: string,
  opts?: { includeInactive?: boolean }
): Promise<CatalogItemRow[]> {
  const client = getCoreClient();
  let query = client
    .from('office_supply_catalog_items')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (!opts?.includeInactive) {
    query = query.eq('is_active', true);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as CatalogItemRow[];
}

export async function createCatalogItem(input: {
  organizationId: string;
  name: string;
  unit: string;
  estimatedUnitPrice: number;
  sortOrder?: number;
}): Promise<CatalogItemRow> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('office_supply_catalog_items')
    .insert({
      organization_id: input.organizationId,
      name: input.name.trim(),
      unit: input.unit.trim() || '개',
      estimated_unit_price: input.estimatedUnitPrice,
      sort_order: input.sortOrder ?? 0,
      is_active: true,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as CatalogItemRow;
}

export async function updateCatalogItem(
  id: string,
  patch: Partial<{
    name: string;
    unit: string;
    estimated_unit_price: number;
    is_active: boolean;
    sort_order: number;
  }>
): Promise<CatalogItemRow> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('office_supply_catalog_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as CatalogItemRow;
}

export async function listCampaigns(organizationId: string): Promise<CampaignRow[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('office_supply_campaigns')
    .select('*')
    .eq('organization_id', organizationId)
    .order('year_month', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CampaignRow[];
}

export async function getCampaignByYearMonth(
  organizationId: string,
  yearMonth: string
): Promise<CampaignRow | null> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('office_supply_campaigns')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('year_month', yearMonth)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CampaignRow | null) ?? null;
}

export async function upsertCampaign(input: {
  organizationId: string;
  yearMonth: string;
  deadlineAt: string;
  note?: string | null;
}): Promise<CampaignRow> {
  const client = getCoreClient();
  const { data, error } = await callRpc<CampaignRow>(client, 'upsert_office_supply_campaign', {
    p_organization_id: input.organizationId,
    p_year_month: input.yearMonth,
    p_deadline_at: input.deadlineAt,
    p_note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
  const row = data as CampaignRow;
  return {
    id: row.id,
    organization_id: input.organizationId,
    year_month: row.year_month,
    deadline_at: row.deadline_at,
    status: row.status,
    closed_at: row.closed_at ?? null,
    note: row.note ?? null,
  };
}

export async function closeCampaign(organizationId: string, campaignId: string): Promise<void> {
  const client = getCoreClient();
  const { error } = await callRpc(client, 'close_office_supply_campaign', {
    p_organization_id: organizationId,
    p_campaign_id: campaignId,
  });
  if (error) throw new Error(error.message);
}

export async function reopenCampaign(
  organizationId: string,
  campaignId: string,
  deadlineAt?: string | null
): Promise<void> {
  const client = getCoreClient();
  const { error } = await callRpc(client, 'reopen_office_supply_campaign', {
    p_organization_id: organizationId,
    p_campaign_id: campaignId,
    p_deadline_at: deadlineAt ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function listMyRequestLines(
  organizationId: string,
  campaignId: string,
  memberId: string
): Promise<RequestLineRow[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from('office_supply_request_lines')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('campaign_id', campaignId)
    .eq('member_id', memberId);
  if (error) throw new Error(error.message);
  return (data ?? []) as RequestLineRow[];
}

export async function upsertMyRequestLines(input: {
  organizationId: string;
  campaignId: string;
  lines: OfficeSupplyRequestLineInput[];
}): Promise<void> {
  const client = getCoreClient();
  const { error } = await callRpc(client, 'upsert_office_supply_request_lines', {
    p_organization_id: input.organizationId,
    p_campaign_id: input.campaignId,
    p_lines: input.lines.map((l) => ({
      catalog_item_id: l.catalogItemId,
      quantity: l.quantity,
    })),
  });
  if (error) throw new Error(error.message);
}

export async function listDeptAggregate(
  organizationId: string,
  campaignId: string
): Promise<DeptAggregatePayload> {
  const client = getCoreClient();
  const { data, error } = await callRpc<DeptAggregatePayload>(client, 'list_office_supply_dept_aggregate', {
    p_organization_id: organizationId,
    p_campaign_id: campaignId,
  });
  if (error) throw new Error(error.message);
  return data as DeptAggregatePayload;
}
