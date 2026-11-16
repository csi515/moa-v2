import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type { PublicOrgInfo, ConsultationSubmission } from '@/core/public/types';

function asOrgRows(data: unknown): PublicOrgInfo[] {
  if (Array.isArray(data)) return data as PublicOrgInfo[];
  if (data && typeof data === 'object') return [data as PublicOrgInfo];
  return [];
}

/**
 * Public organization discovery service
 * These functions can be called without authentication
 */
export const publicOrgService = {
  /**
   * Search public organizations by name, code, or address
   */
  async searchOrganizations(query: string, industryType?: string): Promise<PublicOrgInfo[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('서비스 연결이 설정되지 않았습니다');
    }
    const { data, error } = await getCoreClient().rpc('search_public_organizations', {
      p_query: query,
      p_industry_type: industryType || null,
      p_limit: 20,
    });

    if (error) {
      console.error('Failed to search organizations:', error);
      throw new Error('조직 검색에 실패했습니다');
    }

    return asOrgRows(data);
  },

  /**
   * Get organization details by public code
   */
  async getOrganizationByCode(code: string): Promise<PublicOrgInfo | null> {
    if (!isSupabaseConfigured()) {
      throw new Error('서비스 연결이 설정되지 않았습니다');
    }
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;

    const { data, error } = await getCoreClient().rpc('get_public_organization_by_code', {
      p_code: normalized,
    });

    if (error) {
      console.error('Failed to fetch organization:', error);
      throw new Error('조직 정보를 가져오는데 실패했습니다');
    }

    return asOrgRows(data)[0] || null;
  },

  /**
   * Get organization details by public code or vanity slug safely
   */
  async getOrganizationBySlugOrCode(slugOrCode: string): Promise<PublicOrgInfo | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    const clean = slugOrCode.trim();
    if (!clean) return null;

    // 1. If 8 alphanumeric characters, try direct public_code match first
    if (clean.length === 8 && /^[A-Za-z0-9]+$/.test(clean)) {
      try {
        const org = await this.getOrganizationByCode(clean);
        if (org) return org;
      } catch {
        // Fall back to search
      }
    }

    // 2. Search by query and match slug or public_code
    try {
      const list = await this.searchOrganizations(clean);
      const exact = list.find(
        (o) =>
          (o.slug && o.slug.toLowerCase() === clean.toLowerCase()) ||
          (o.public_code && o.public_code.toUpperCase() === clean.toUpperCase())
      );
      if (exact) return exact;
      if (list.length > 0) return list[0];
    } catch {
      // ignore
    }

    return null;
  },

  /**
   * Submit consultation request (no auth required)
   */
  async submitConsultation(
    orgId: string,
    submission: ConsultationSubmission
  ): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new Error('서비스 연결이 설정되지 않았습니다');
    }
    const { data, error } = await getCoreClient().rpc('submit_public_consultation', {
      p_org_id: orgId,
      p_contact_name: submission.contact_name,
      p_contact_phone: submission.contact_phone,
      p_message: submission.message,
      p_preferred_time: submission.preferred_time || null,
    });

    if (error) {
      console.error('Failed to submit consultation:', error);
      throw new Error('상담 신청에 실패했습니다');
    }

    return data as string;
  },

  /**
   * Get organization operating hours (public read)
   */
  async getOrganizationOperatingHours(
    orgId: string,
    signal?: AbortSignal
  ): Promise<PublicOperatingHour[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    const cleanId = orgId.trim();
    if (!cleanId) return [];

    try {
      const client = getCoreClient();
      let query = client
        .from('tenant_operating_hours')
        .select('*')
        .eq('tenant_id', cleanId);

      if (signal) {
        query = query.abortSignal(signal);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return (data as Array<Record<string, unknown>>).map((row) => ({
        day_of_week: Number(row.day_of_week ?? 0),
        open_time: String(row.open_time || row.start_time || '09:00'),
        close_time: String(row.close_time || row.end_time || '22:00'),
        is_closed: Boolean(row.is_closed || (row.is_active !== undefined ? !row.is_active : false)),
      }));
    } catch {
      return [];
    }
  },
};

export interface PublicOperatingHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

