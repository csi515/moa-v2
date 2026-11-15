import type { Json } from '@/lib/supabase/database.types';
import { toJsonValue } from '@/shared/kernel';
import type {
  PatentAsset,
  PatentInventor,
  PatentLifecycleStatus,
} from '../domain/patentIpAssetEngine';

export type PatentRow = {
  id: string;
  organization_id: string;
  application_no: string;
  title: string;
  summary: string | null;
  tech_field: string | null;
  inventor_ids: Json;
  status: string;
  filing_date: string | null;
  document_urls: Json;
  payload: Json;
  created_at: string;
  updated_at: string;
};

function parseInventors(value: Json): PatentInventor[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const inventorId = String(row.inventorId ?? row.inventor_id ?? '');
      const inventorName = String(row.inventorName ?? row.inventor_name ?? '');
      if (!inventorId || !inventorName) return null;
      return {
        inventorId,
        inventorName,
        department: String(row.department ?? ''),
        sharePercentage: Number(row.sharePercentage ?? row.share_percentage ?? 0),
      };
    })
    .filter((v): v is PatentInventor => v !== null);
}

function parsePayload(value: Json): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function patentRowToAsset(row: PatentRow): PatentAsset {
  const payload = parsePayload(row.payload);
  const status = (row.status || 'draft') as PatentLifecycleStatus;
  return {
    id: row.id,
    inventionTitle: row.title,
    summary: row.summary ?? '',
    techField: row.tech_field ?? '',
    receiptDate: row.filing_date ?? row.created_at.slice(0, 10),
    inventors: parseInventors(row.inventor_ids),
    status,
    review: payload.review as PatentAsset['review'],
    applicationNumber: row.application_no || (payload.applicationNumber as string | undefined),
    applicationDate: (payload.applicationDate as string | undefined) ?? row.filing_date ?? undefined,
    registrationNumber: payload.registrationNumber as string | undefined,
    registrationDate: payload.registrationDate as string | undefined,
    applicationReward: payload.applicationReward as PatentAsset['applicationReward'],
    registrationReward: payload.registrationReward as PatentAsset['registrationReward'],
    documentUrls: Array.isArray(row.document_urls)
      ? (row.document_urls as unknown[]).map(String).filter(Boolean)
      : [],
  };
}

export function patentAssetToInsert(
  organizationId: string,
  asset: PatentAsset,
): Omit<PatentRow, 'id' | 'created_at' | 'updated_at'> & { organization_id: string } {
  return {
    organization_id: organizationId,
    application_no: asset.applicationNumber ?? '',
    title: asset.inventionTitle,
    summary: asset.summary,
    tech_field: asset.techField,
    inventor_ids: toJsonValue(asset.inventors),
    status: asset.status,
    filing_date: asset.receiptDate,
    document_urls: toJsonValue(asset.documentUrls ?? []),
    payload: toJsonValue({
      review: asset.review,
      applicationNumber: asset.applicationNumber,
      applicationDate: asset.applicationDate,
      registrationNumber: asset.registrationNumber,
      registrationDate: asset.registrationDate,
      applicationReward: asset.applicationReward,
      registrationReward: asset.registrationReward,
    }),
  };
}

export function patentAssetToUpdate(asset: PatentAsset): Partial<PatentRow> {
  return {
    application_no: asset.applicationNumber ?? '',
    title: asset.inventionTitle,
    summary: asset.summary,
    tech_field: asset.techField,
    inventor_ids: toJsonValue(asset.inventors),
    status: asset.status,
    filing_date: asset.receiptDate,
    document_urls: toJsonValue(asset.documentUrls ?? []),
    payload: toJsonValue({
      review: asset.review,
      applicationNumber: asset.applicationNumber,
      applicationDate: asset.applicationDate,
      registrationNumber: asset.registrationNumber,
      registrationDate: asset.registrationDate,
      applicationReward: asset.applicationReward,
      registrationReward: asset.registrationReward,
    }),
    updated_at: new Date().toISOString(),
  };
}
