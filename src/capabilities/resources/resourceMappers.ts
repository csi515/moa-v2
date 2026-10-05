import type { BookableResource, PracticeRoomRow, Resource } from './types';

export function toResource(row: BookableResource): Resource {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? row.metadata
      : {};
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    kind: row.kind,
    active: row.is_active,
    capacity: row.capacity,
    openTime: row.open_time,
    closeTime: row.close_time,
    memo: row.memo || undefined,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPracticeRoomRow(resource: BookableResource): PracticeRoomRow {
  return {
    id: resource.id,
    organization_id: resource.organization_id,
    name: resource.name,
    capacity: resource.capacity,
    open_time: resource.open_time,
    close_time: resource.close_time,
    is_active: resource.is_active,
    memo: resource.memo,
  };
}

export function normalizeBookableResource(row: BookableResource): BookableResource {
  return {
    ...row,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? row.metadata
        : {},
  };
}
