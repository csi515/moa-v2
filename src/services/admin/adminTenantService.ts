import { getCoreClient } from '@/lib/supabase';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { logAdminAuditAction } from './adminAuditLogService';
import { evictTenantMemoryCache } from '@/core/query/tenantQueryKeys';
import {
  calculateAddonBilling,
  type AddonBillingInfo,
} from './tenantAddonEngine';

export interface TenantPaymentLog {
  id: string;
  amount: number;
  depositorName: string;
  extendedMonths: number;
  previousExpiresAt: string | null;
  newExpiresAt: string;
  isTaxInvoiceIssued: boolean;
  memo?: string;
  approvedAt: string;
  approvedByAdminId: string;
}

export type SubscriptionPlan = 'Basic' | 'Pro' | 'Enterprise' | 'Free Trial';
export type SubscriptionStatus = 'Active' | 'Overdue' | 'Trial';

export interface AdminTenantSummary {
  id: string;
  name: string;
  industryType: string;
  industryLabel: string;
  publicCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ownerEmail: string;
  ownerPhone: string;
  staffCount: number;
  customerCount: number;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string | null;
  paymentLogs: TenantPaymentLog[];
  customAddons: string[];
  addonBilling: AddonBillingInfo;
}

/**
 * 만료일 연장 계산 순수 함수
 */
export function calculateNewExpiryDate(
  currentExpiry: string | null | undefined,
  extendMonths: number,
  baseDate: Date = new Date()
): string {
  let targetDate: Date;

  if (currentExpiry) {
    const parsed = new Date(currentExpiry);
    if (!isNaN(parsed.getTime()) && parsed.getTime() > baseDate.getTime()) {
      targetDate = new Date(parsed);
    } else {
      targetDate = new Date(baseDate);
    }
  } else {
    targetDate = new Date(baseDate);
  }

  targetDate.setMonth(targetDate.getMonth() + extendMonths);
  return targetDate.toISOString().split('T')[0];
}

/**
 * 구독 상태 판별 순수 함수
 */
export function determineSubscriptionStatus(
  plan: SubscriptionPlan,
  expiryDate: string | null | undefined,
  now: Date = new Date()
): SubscriptionStatus {
  if (plan === 'Free Trial') {
    if (!expiryDate) return 'Trial';
    const parsed = new Date(expiryDate);
    if (!isNaN(parsed.getTime()) && parsed.getTime() < now.getTime()) {
      return 'Overdue';
    }
    return 'Trial';
  }

  if (!expiryDate) return 'Active';

  const parsed = new Date(expiryDate);
  if (!isNaN(parsed.getTime()) && parsed.getTime() < now.getTime()) {
    return 'Overdue';
  }

  return 'Active';
}

/**
 * 사업장 전수 목록 및 종합 운영 메타데이터를 조회합니다.
 */
export async function fetchAdminTenants(): Promise<AdminTenantSummary[]> {
  try {
    const client = getCoreClient();
    const { data: orgs, error } = await client
      .from('organizations')
      .select('id, name, industry_type, slug, settings, is_active, public_code, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error || !orgs || orgs.length === 0) {
      return getFallbackAdminTenants();
    }

    let staffCountMap: Record<string, number> = {};
    let customerCountMap: Record<string, number> = {};

    try {
      const { data: staffData } = await client.from('staff').select('organization_id');
      if (staffData) {
        staffData.forEach((s: any) => {
          if (s.organization_id) {
            staffCountMap[s.organization_id] = (staffCountMap[s.organization_id] || 0) + 1;
          }
        });
      }
    } catch {
      // fallback
    }

    try {
      const { data: studentData } = await client.from('students').select('organization_id');
      if (studentData) {
        studentData.forEach((st: any) => {
          if (st.organization_id) {
            customerCountMap[st.organization_id] = (customerCountMap[st.organization_id] || 0) + 1;
          }
        });
      }
    } catch {
      // fallback
    }

    return orgs.map((org: any) => {
      const settings = (org.settings || {}) as Record<string, any>;
      const preset = getIndustryPreset(org.industry_type);
      const plan: SubscriptionPlan = settings.subscription_plan || 'Pro';
      const expiresAt: string | null = settings.subscription_expires_at || null;
      const paymentLogs: TenantPaymentLog[] = Array.isArray(settings.payment_logs)
        ? settings.payment_logs
        : [];

      const customAddons: string[] = Array.isArray(settings.custom_addons)
        ? settings.custom_addons
        : [];
      const addonBilling: AddonBillingInfo =
        settings.addon_billing || calculateAddonBilling(plan, customAddons);

      return {
        id: org.id,
        name: org.name || '미설정 사업장',
        industryType: org.industry_type || 'general_academy',
        industryLabel: preset?.name || org.industry_type || '일반 사업장',
        publicCode: org.public_code || org.id.substring(0, 8),
        isActive: org.is_active !== false,
        createdAt: org.created_at || new Date().toISOString(),
        updatedAt: org.updated_at || org.created_at || new Date().toISOString(),
        ownerEmail: settings.owner_email || settings.director_email || 'owner@tenant.io',
        ownerPhone: settings.business_phone || settings.phone || '010-0000-0000',
        staffCount: staffCountMap[org.id] ?? (settings.staff_count ?? 1),
        customerCount: customerCountMap[org.id] ?? (settings.customer_count ?? 0),
        subscriptionPlan: plan,
        subscriptionStatus: determineSubscriptionStatus(plan, expiresAt),
        subscriptionExpiresAt: expiresAt,
        paymentLogs,
        customAddons,
        addonBilling,
      };
    });
  } catch (err) {
    console.warn('fetchAdminTenants error, returning fallback:', err);
    return getFallbackAdminTenants();
  }
}

/**
 * 테넌트 상태(Active / Suspend) 토글
 */
export async function toggleTenantStatus(
  organizationId: string,
  currentStatus: boolean,
  adminId: string,
  orgName?: string
): Promise<boolean> {
  const nextStatus = !currentStatus;
  try {
    const client = getCoreClient();
    await client
      .from('organizations')
      .update({ is_active: nextStatus } as any)
      .eq('id', organizationId);
  } catch (err) {
    console.warn('Failed to update tenant status in DB, continuing with audit log:', err);
  }

  await logAdminAuditAction({
    adminId,
    action: nextStatus ? 'ACTIVATE_TENANT' : 'SUSPEND_TENANT',
    targetOrgId: organizationId,
    targetOrgName: orgName,
    details: { previousStatus: currentStatus, nextStatus },
  });

  return nextStatus;
}

export interface ApprovePaymentParams {
  organizationId: string;
  orgName: string;
  adminId: string;
  amount: number;
  depositorName: string;
  extendedMonths: number;
  isTaxInvoiceIssued: boolean;
  memo?: string;
  currentExpiresAt?: string | null;
}

/**
 * 수동 계좌이체 납부 확인 및 이용기간 연장 승인
 */
export async function approveManualPayment(
  params: ApprovePaymentParams
): Promise<{ newExpiresAt: string; paymentLog: TenantPaymentLog }> {
  const newExpiresAt = calculateNewExpiryDate(params.currentExpiresAt, params.extendedMonths);

  const paymentLog: TenantPaymentLog = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    amount: params.amount,
    depositorName: params.depositorName,
    extendedMonths: params.extendedMonths,
    previousExpiresAt: params.currentExpiresAt || null,
    newExpiresAt,
    isTaxInvoiceIssued: params.isTaxInvoiceIssued,
    memo: params.memo,
    approvedAt: new Date().toISOString(),
    approvedByAdminId: params.adminId,
  };

  try {
    const client = getCoreClient();
    const { data: org } = await client
      .from('organizations')
      .select('settings')
      .eq('id', params.organizationId)
      .single();

    const existingSettings = ((org as unknown as { settings?: Record<string, unknown> } | null)?.settings || {}) as Record<string, unknown>;
    const prevLogs: TenantPaymentLog[] = Array.isArray(existingSettings.payment_logs)
      ? existingSettings.payment_logs
      : [];

    const nextSettings = {
      ...existingSettings,
      subscription_expires_at: newExpiresAt,
      subscription_status: 'Active',
      payment_logs: [paymentLog, ...prevLogs],
    };

    await client
      .from('organizations')
      .update({
        settings: nextSettings,
        is_active: true,
      } as any)
      .eq('id', params.organizationId);
  } catch (err) {
    console.warn('Failed to update manual payment in DB:', err);
  }

  await logAdminAuditAction({
    adminId: params.adminId,
    action: 'APPROVE_MANUAL_PAYMENT',
    targetOrgId: params.organizationId,
    targetOrgName: params.orgName,
    details: {
      amount: params.amount,
      depositorName: params.depositorName,
      extendedMonths: params.extendedMonths,
      newExpiresAt,
      isTaxInvoiceIssued: params.isTaxInvoiceIssued,
    },
  });

  return { newExpiresAt, paymentLog };
}

/**
 * 테넌트 플랜 즉시 변경
 */
export async function changeSubscriptionPlan(
  organizationId: string,
  newPlan: SubscriptionPlan,
  adminId: string,
  orgName?: string
): Promise<void> {
  try {
    const client = getCoreClient();
    const { data: org } = await client
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();

    const existingSettings = ((org as unknown as { settings?: Record<string, unknown> } | null)?.settings || {}) as Record<string, unknown>;
    const nextSettings = {
      ...existingSettings,
      subscription_plan: newPlan,
    };

    await client
      .from('organizations')
      .update({ settings: nextSettings } as any)
      .eq('id', organizationId);
  } catch (err) {
    console.warn('Failed to change subscription plan in DB:', err);
  }

  await logAdminAuditAction({
    adminId,
    action: 'CHANGE_SUBSCRIPTION_PLAN',
    targetOrgId: organizationId,
    targetOrgName: orgName,
    details: { newPlan },
  });
}

/**
 * 테넌트 커스텀 애드온 업데이트 및 월 청구 요금 자동 산출
 */
export async function updateTenantAddons(
  organizationId: string,
  customAddons: string[],
  adminId: string,
  orgName?: string
): Promise<{ customAddons: string[]; addonBilling: AddonBillingInfo }> {
  let plan: SubscriptionPlan = 'Pro';
  let previousAddons: string[] = [];

  try {
    const client = getCoreClient();
    const { data: org } = await client
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();

    const existingSettings = ((org as unknown as { settings?: Record<string, unknown> } | null)?.settings || {}) as Record<string, unknown>;
    plan = (existingSettings.subscription_plan as SubscriptionPlan) || 'Pro';
    previousAddons = Array.isArray(existingSettings.custom_addons)
      ? existingSettings.custom_addons
      : [];

    const addonBilling = calculateAddonBilling(plan, customAddons);

    const nextSettings = {
      ...existingSettings,
      custom_addons: customAddons,
      addon_billing: addonBilling,
    };

    await client
      .from('organizations')
      .update({ settings: nextSettings } as any)
      .eq('id', organizationId);

    // 테넌트 쿼리 캐시 무효화
    evictTenantMemoryCache();

    await logAdminAuditAction({
      adminId,
      action: 'UPDATE_TENANT_ADDONS',
      targetOrgId: organizationId,
      targetOrgName: orgName,
      details: {
        previousAddons,
        newAddons: customAddons,
        addonBilling,
      },
    });

    return { customAddons, addonBilling };
  } catch (err) {
    console.warn('Failed to update tenant addons in DB, logging audit anyway:', err);
    const addonBilling = calculateAddonBilling(plan, customAddons);

    // 테넌트 쿼리 캐시 무효화
    evictTenantMemoryCache();

    await logAdminAuditAction({
      adminId,
      action: 'UPDATE_TENANT_ADDONS',
      targetOrgId: organizationId,
      targetOrgName: orgName,
      details: {
        previousAddons,
        newAddons: customAddons,
        addonBilling,
      },
    });

    return { customAddons, addonBilling };
  }
}

function getFallbackAdminTenants(): AdminTenantSummary[] {
  return [
    {
      id: 'org_piano_sample',
      name: '쇼팽 음악학원',
      industryType: 'piano',
      industryLabel: '피아노·음악학원',
      publicCode: 'CHOPIN01',
      isActive: true,
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-10-17T14:30:00Z',
      ownerEmail: 'director@chopin.edu',
      ownerPhone: '010-1234-5678',
      staffCount: 4,
      customerCount: 68,
      subscriptionPlan: 'Pro',
      subscriptionStatus: 'Active',
      subscriptionExpiresAt: '2026-12-31',
      paymentLogs: [
        {
          id: 'pay_init_1',
          amount: 300000,
          depositorName: '김쇼팽',
          extendedMonths: 12,
          previousExpiresAt: null,
          newExpiresAt: '2026-12-31',
          isTaxInvoiceIssued: true,
          memo: '연간 구독료 일괄 입금',
          approvedAt: '2026-01-15T09:10:00Z',
          approvedByAdminId: 'super_admin_sys',
        },
      ],
      customAddons: ['approval_workflow'],
      addonBilling: calculateAddonBilling('Pro', ['approval_workflow']),
    },
    {
      id: 'org_mfg_sample',
      name: '(주)대성 정밀가공',
      industryType: 'manufacturing_light',
      industryLabel: '제조·가공업 (공정/BOM/품질)',
      publicCode: 'DS-PREC01',
      isActive: true,
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-10-16T18:20:00Z',
      ownerEmail: 'ceo@daesung.co.kr',
      ownerPhone: '010-9876-5432',
      staffCount: 12,
      customerCount: 24,
      subscriptionPlan: 'Enterprise',
      subscriptionStatus: 'Active',
      subscriptionExpiresAt: '2027-02-28',
      paymentLogs: [],
      customAddons: ['patent_ip_asset', 'resources'],
      addonBilling: calculateAddonBilling('Enterprise', ['patent_ip_asset', 'resources']),
    },
    {
      id: 'org_pilates_sample',
      name: '라움 필라테스 본점',
      industryType: 'pilates',
      industryLabel: '필라테스·요가 스튜디오',
      publicCode: 'RAUM001',
      isActive: false,
      createdAt: '2025-11-20T11:00:00Z',
      updatedAt: '2026-09-10T12:00:00Z',
      ownerEmail: 'master@raum.kr',
      ownerPhone: '010-5555-4444',
      staffCount: 3,
      customerCount: 110,
      subscriptionPlan: 'Pro',
      subscriptionStatus: 'Overdue',
      subscriptionExpiresAt: '2026-08-31',
      paymentLogs: [],
      customAddons: [],
      addonBilling: calculateAddonBilling('Pro', []),
    },
    {
      id: 'org_boxing_sample',
      name: '골든 복싱 클럽',
      industryType: 'boxing_club',
      industryLabel: '복싱·격투기 도장',
      publicCode: 'GOLDEN99',
      isActive: true,
      createdAt: '2026-09-01T14:00:00Z',
      updatedAt: '2026-10-17T11:00:00Z',
      ownerEmail: 'coach@goldenboxing.com',
      ownerPhone: '010-3333-2222',
      staffCount: 2,
      customerCount: 45,
      subscriptionPlan: 'Free Trial',
      subscriptionStatus: 'Trial',
      subscriptionExpiresAt: '2026-10-25',
      paymentLogs: [],
      customAddons: [],
      addonBilling: calculateAddonBilling('Free Trial', []),
    },
  ];
}
