/** 사무용품 월별 취합 — 마감 판정·부서 집계·CSV 순수 유틸 */

export type MemberWithRole = {
  role?: string | null;
  permissions?: Record<string, boolean> | null;
};

export type OfficeSupplyCampaignStatus = 'open' | 'closed';

export type OfficeSupplyCampaign = {
  id: string;
  yearMonth: string;
  deadlineAt: string;
  status: OfficeSupplyCampaignStatus;
  closedAt?: string | null;
  note?: string | null;
};

export type OfficeSupplyCatalogItem = {
  id: string;
  name: string;
  unit: string;
  estimatedUnitPrice: number;
  isActive: boolean;
  sortOrder: number;
};

export type OfficeSupplyRequestLineInput = {
  catalogItemId: string;
  quantity: number;
};

export type DeptAggregateRow = {
  departmentId: string | null;
  departmentName: string;
  catalogItemId: string;
  itemName: string;
  unit: string;
  estimatedUnitPrice: number;
  totalQuantity: number;
  estimatedTotal: number;
};

export type ItemAggregateRow = {
  catalogItemId: string;
  itemName: string;
  unit: string;
  estimatedUnitPrice: number;
  totalQuantity: number;
  estimatedTotal: number;
};

export function canManageOfficeSupplyRequest(member: MemberWithRole): boolean {
  if (member.role === 'owner' || member.role === 'admin') return true;
  const perms = member.permissions ?? {};
  return perms['office_supply_request:manage'] === true;
}

/** YYYY-MM */
export function toYearMonth(date: Date = new Date(Date.now())): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function isValidYearMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number): string {
  if (!isValidYearMonth(yearMonth)) return toYearMonth();
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, (m ?? 1) - 1 + deltaMonths, 1);
  return toYearMonth(d);
}

/**
 * 신청 가능 여부.
 * status===closed 이거나 now >= deadlineAt 이면 false.
 */
export function isCampaignWritable(
  campaign: Pick<OfficeSupplyCampaign, 'status' | 'deadlineAt'>,
  now: Date = new Date(Date.now())
): boolean {
  if (campaign.status !== 'open') return false;
  const deadline = new Date(campaign.deadlineAt);
  if (Number.isNaN(deadline.getTime())) return false;
  return now.getTime() < deadline.getTime();
}

export function campaignLockReason(
  campaign: Pick<OfficeSupplyCampaign, 'status' | 'deadlineAt'>,
  now: Date = new Date(Date.now())
): string | null {
  if (campaign.status === 'closed') return '관리자가 마감했습니다.';
  if (!isCampaignWritable(campaign, now)) return '신청 마감일이 지났습니다.';
  return null;
}

export function validateRequestLines(
  lines: OfficeSupplyRequestLineInput[],
  activeCatalogIds: ReadonlySet<string>
): { isValid: boolean; error?: string } {
  for (const line of lines) {
    if (!line.catalogItemId) {
      return { isValid: false, error: '품목이 올바르지 않습니다.' };
    }
    if (!activeCatalogIds.has(line.catalogItemId)) {
      return { isValid: false, error: '구매 가능 목록에 없는 품목입니다.' };
    }
    if (!(line.quantity > 0) || !Number.isFinite(line.quantity)) {
      return { isValid: false, error: '수량은 0보다 커야 합니다.' };
    }
  }
  return { isValid: true };
}

/** 0 이하 수량은 제외한 제출용 라인 */
export function normalizeRequestLines(
  quantityByItemId: Record<string, number>
): OfficeSupplyRequestLineInput[] {
  const out: OfficeSupplyRequestLineInput[] = [];
  for (const [catalogItemId, quantity] of Object.entries(quantityByItemId)) {
    if (!(quantity > 0) || !Number.isFinite(quantity)) continue;
    out.push({ catalogItemId, quantity });
  }
  return out;
}

export function aggregateByDepartment(
  lines: Array<{
    departmentId: string | null;
    departmentName?: string | null;
    catalogItemId: string;
    itemName: string;
    unit: string;
    estimatedUnitPrice: number;
    quantity: number;
  }>
): DeptAggregateRow[] {
  const map = new Map<string, DeptAggregateRow>();
  for (const line of lines) {
    const deptName = line.departmentName?.trim() || '(부서 미지정)';
    const key = `${line.departmentId ?? 'none'}|${line.catalogItemId}`;
    const cur = map.get(key);
    if (cur) {
      cur.totalQuantity += line.quantity;
      cur.estimatedTotal = cur.totalQuantity * cur.estimatedUnitPrice;
    } else {
      map.set(key, {
        departmentId: line.departmentId,
        departmentName: deptName,
        catalogItemId: line.catalogItemId,
        itemName: line.itemName,
        unit: line.unit,
        estimatedUnitPrice: line.estimatedUnitPrice,
        totalQuantity: line.quantity,
        estimatedTotal: line.quantity * line.estimatedUnitPrice,
      });
    }
  }
  return [...map.values()].sort((a, b) => {
    const d = a.departmentName.localeCompare(b.departmentName, 'ko');
    if (d !== 0) return d;
    return a.itemName.localeCompare(b.itemName, 'ko');
  });
}

export function aggregateByItem(rows: DeptAggregateRow[]): ItemAggregateRow[] {
  const map = new Map<string, ItemAggregateRow>();
  for (const row of rows) {
    const cur = map.get(row.catalogItemId);
    if (cur) {
      cur.totalQuantity += row.totalQuantity;
      cur.estimatedTotal = cur.totalQuantity * cur.estimatedUnitPrice;
    } else {
      map.set(row.catalogItemId, {
        catalogItemId: row.catalogItemId,
        itemName: row.itemName,
        unit: row.unit,
        estimatedUnitPrice: row.estimatedUnitPrice,
        totalQuantity: row.totalQuantity,
        estimatedTotal: row.estimatedTotal,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.itemName.localeCompare(b.itemName, 'ko'));
}

export function formatAggregateCsv(
  byDepartment: DeptAggregateRow[],
  byItem: ItemAggregateRow[]
): string {
  const lines: string[] = [];
  lines.push('구분,부서,품목,단위,수량,추정단가,추정합계');
  for (const row of byDepartment) {
    lines.push(
      [
        '부서별',
        csvEscape(row.departmentName),
        csvEscape(row.itemName),
        csvEscape(row.unit),
        String(row.totalQuantity),
        String(row.estimatedUnitPrice),
        String(row.estimatedTotal),
      ].join(',')
    );
  }
  for (const row of byItem) {
    lines.push(
      [
        '품목합계',
        '',
        csvEscape(row.itemName),
        csvEscape(row.unit),
        String(row.totalQuantity),
        String(row.estimatedUnitPrice),
        String(row.estimatedTotal),
      ].join(',')
    );
  }
  const grand = byItem.reduce((sum, r) => sum + r.estimatedTotal, 0);
  lines.push(['총계', '', '', '', '', '', String(grand)].join(','));
  return lines.join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
