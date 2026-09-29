/** dual-read: 정식 컬럼 우선, 없으면 metadata. 컬럼이 있으면 그것이 정본. */

export function asMetadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function metadataText(
  metadata: unknown,
  key: string
): string | undefined {
  const raw = asMetadataRecord(metadata)[key];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

export function dualReadText(
  column: string | null | undefined,
  metadata: unknown,
  metaKey: string
): string | undefined {
  const fromColumn = typeof column === 'string' ? column.trim() : '';
  if (fromColumn) return fromColumn;
  return metadataText(metadata, metaKey);
}

export function dualReadPreferred(
  column: string | null | undefined,
  metadata: unknown,
  metaKey: string
): { value?: string; source: 'column' | 'metadata' | 'none' } {
  const fromColumn = typeof column === 'string' ? column.trim() : '';
  if (fromColumn) return { value: fromColumn, source: 'column' };
  const fromMeta = metadataText(metadata, metaKey);
  if (fromMeta) return { value: fromMeta, source: 'metadata' };
  return { source: 'none' };
}

/** 컬럼과 metadata가 둘 다 있으면 같아야 한다. */
export function promotedFieldInvariant(
  column: string | null | undefined,
  metadata: unknown,
  metaKey: string
): boolean {
  const fromColumn = typeof column === 'string' ? column.trim() : '';
  const fromMeta = metadataText(metadata, metaKey);
  if (!fromColumn || !fromMeta) return true;
  return fromColumn === fromMeta;
}
