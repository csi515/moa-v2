import type { Json } from '@/lib/supabase/database.types';
import type { BathService, BathServiceCategory } from '../types/service';

export type BathServiceRow = {
  id: string;
  organization_id: string;
  name: string;
  category: BathServiceCategory;
  duration_minutes: number;
  base_price: number | string;
  requires_staff: boolean;
  requires_resource: boolean;
  product_id: string | null;
  active: boolean;
  sort_order: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
  resource_ids?: string[] | null;
  staff_ids?: string[] | null;
};

function asIdList(value: string[] | null | undefined): string[] {
  return (value ?? []).filter((id) => typeof id === 'string' && id.length > 0);
}

export function rowToBathService(row: BathServiceRow): BathService {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    category: row.category,
    durationMinutes: row.duration_minutes,
    basePrice: Number(row.base_price),
    requiresStaff: row.requires_staff,
    requiresResource: row.requires_resource,
    productId: row.product_id || undefined,
    resourceIds: asIdList(row.resource_ids),
    staffIds: asIdList(row.staff_ids),
    active: row.active,
    sortOrder: row.sort_order,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
