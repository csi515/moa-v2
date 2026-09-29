import { getCoreClient } from '@/lib/supabase';

export const OWNER_BUSINESS_BLOCK_KEY = 'moa_owner_business_block';

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

interface StatusResponse {
  active?: boolean;
  matched?: boolean;
  statusCode?: string;
  statusName?: string;
  message?: string;
  error?: string;
}

interface OrgBusinessRow {
  biz_status: string | null;
  biz_checked_at: string | null;
  business_registration_number: string | null;
  settings: unknown;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function consumeOwnerBusinessBlockMessage(): string | null {
  try {
    const message = sessionStorage.getItem(OWNER_BUSINESS_BLOCK_KEY);
    if (message) sessionStorage.removeItem(OWNER_BUSINESS_BLOCK_KEY);
    return message;
  } catch {
    return null;
  }
}

export function rememberOwnerBusinessBlock(message: string): void {
  try {
    sessionStorage.setItem(OWNER_BUSINESS_BLOCK_KEY, message);
  } catch {
    /* ignore */
  }
}

function readBusinessNumber(row: Record<string, unknown>): string {
  const column = String(row.business_registration_number ?? '');
  if (digitsOnly(column).length === 10) return column;
  const settings = row.settings;
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    const fromSettings = String((settings as { businessNumber?: string }).businessNumber ?? '');
    if (digitsOnly(fromSettings).length === 10) return fromSettings;
  }
  return '';
}

function openingDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

/** 회원가입 진위확인 — 번호·대표자·개업일·상호 일치 */
export async function assertBusinessMatches(input: {
  businessNumber: string;
  representativeName: string;
  openingDate: string;
  businessName: string;
}): Promise<void> {
  const digits = digitsOnly(input.businessNumber);
  const startDate = openingDigits(input.openingDate);
  if (digits.length !== 10 || !input.representativeName.trim() || !/^\d{8}$/.test(startDate)) {
    throw new Error('사업자등록번호, 대표자 이름, 개업일자를 확인해 주세요.');
  }

  const { data, error } = await getCoreClient().functions.invoke<StatusResponse>(
    'verify-business-status',
    {
      body: {
        check: 'validate',
        businessNumber: digits,
        representativeName: input.representativeName.trim(),
        startDate,
        businessName: input.businessName.trim(),
      },
    }
  );

  if (error) {
    throw new Error('사업자 정보 일치 여부를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  if (!data?.matched || data.active === false) {
    throw new Error(data?.message || data?.error || '사업자 정보가 일치하지 않습니다.');
  }
}

export function ownerOperationBlockMessage(status?: string | null): string {
  if (status === '02') return '휴업 사업장은 운영 화면을 열 수 없습니다.';
  if (status === '03') return '폐업 사업장은 운영 화면을 열 수 없습니다.';
  return '계속사업자가 아니면 운영 화면을 열 수 없습니다.';
}

function isStale(checkedAt?: string | null): boolean {
  if (!checkedAt) return true;
  const time = new Date(checkedAt).getTime();
  return Number.isNaN(time) || Date.now() - time >= STALE_MS;
}

export async function saveOrganizationBusinessStatus(
  organizationId: string,
  bizStatus: string
): Promise<void> {
  const { error } = await getCoreClient()
    .from('organizations')
    .update({
      biz_status: bizStatus,
      biz_checked_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
  if (error) throw error;
}

async function lookupBusinessStatus(businessNumber: string): Promise<StatusResponse> {
  const digits = digitsOnly(businessNumber);
  if (digits.length !== 10 || /^0+$/.test(digits)) {
    throw new Error('사업자등록번호를 확인할 수 없습니다.');
  }
  const { data, error } = await getCoreClient().functions.invoke<StatusResponse>(
    'verify-business-status',
    { body: { businessNumber: digits } }
  );
  if (error || !data) {
    throw new Error('사업자 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  return data;
}

async function refreshOrganizationStatus(organizationId: string, businessNumber: string): Promise<void> {
  const data = await lookupBusinessStatus(businessNumber);
  const status = data.statusCode || (data.active ? '01' : '');
  if (!status) return;
  await saveOrganizationBusinessStatus(organizationId, status);
}

/**
 * 로그인 — DB 상태만 본다. 없는 값만 한 번 채우고, 7일 지난 건은 뒤에서 갱신.
 * 휴·폐업이어도 예외를 던지지 않는다. 운영을 막을 조직 id만 돌려준다.
 */
export async function listBlockedOwnerOrganizations(organizationIds: string[]): Promise<string[]> {
  const unique = [...new Set(organizationIds.filter(Boolean))];
  if (unique.length === 0) return [];

  const blocked: string[] = [];
  const stale: { organizationId: string; businessNumber: string }[] = [];

  for (const organizationId of unique) {
    const { data, error } = await getCoreClient()
      .from('organizations')
      .select('biz_status, biz_checked_at, business_registration_number, settings')
      .eq('id', organizationId)
      .maybeSingle();
    if (error || !data) continue;

    const row = data as OrgBusinessRow;
    const businessNumber = readBusinessNumber(row as unknown as Record<string, unknown>);
    let status = row.biz_status;

    if (!status) {
      try {
        const lookedUp = await lookupBusinessStatus(businessNumber);
        status = lookedUp.statusCode || (lookedUp.active ? '01' : '');
        if (status) await saveOrganizationBusinessStatus(organizationId, status);
      } catch {
        continue;
      }
    }

    if (status && status !== '01') {
      blocked.push(organizationId);
      continue;
    }

    if (status === '01' && isStale(row.biz_checked_at) && businessNumber) {
      stale.push({ organizationId, businessNumber });
    }
  }

  if (stale.length > 0) {
    void Promise.all(
      stale.map((item) => refreshOrganizationStatus(item.organizationId, item.businessNumber))
    ).catch(() => undefined);
  }

  return blocked;
}
