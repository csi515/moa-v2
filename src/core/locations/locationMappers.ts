import type { Json } from '@/lib/supabase/database.types';
import type { Location } from './types';

export type LocationRow = {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  slug: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  is_active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function rowToLocation(row: LocationRow): Location {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    code: row.code,
    slug: row.slug,
    address: row.address || undefined,
    phone: row.phone || undefined,
    timezone: row.timezone || 'Asia/Seoul',
    active: row.is_active,
    metadata: asRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
