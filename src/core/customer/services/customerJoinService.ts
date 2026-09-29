import { getCoreClient, supabase } from '@/lib/supabase';
import type { CustomerJoinRequest, JoinRequestType } from '@/types';
import type { Json } from '@/lib/supabase/database.types';

export interface SubmitJoinRequestParams {
  orgId: string;
  applicantName: string;
  applicantPhone?: string;
  applicantEmail?: string;
  requestType?: JoinRequestType;
  message?: string;
  customerMetadata?: Record<string, unknown>;
}

/**
 * 고객 가입 신청·승인 Service.
 * RPC/테이블 접근은 getCoreClient()를 사용한다 (ARCHITECTURE 표준).
 */
export const customerJoinService = {
  async submitJoinRequest(params: SubmitJoinRequestParams): Promise<string> {
    const { data, error } = await getCoreClient().rpc('submit_customer_join_request' as never, {
      p_org_id: params.orgId,
      p_applicant_name: params.applicantName,
      p_applicant_phone: params.applicantPhone || null,
      p_applicant_email: params.applicantEmail || null,
      p_request_type: params.requestType || 'membership',
      p_message: params.message || null,
      p_customer_metadata: (params.customerMetadata as Json) || null,
    } as never);

    if (error) {
      console.error('Failed to submit join request:', error);
      if (error.message.includes('already a member')) {
        throw new Error('이미 해당 조직의 회원입니다');
      } else if (error.message.includes('pending request')) {
        throw new Error('이미 가입 신청이 진행 중입니다');
      }
      throw new Error('가입 신청에 실패했습니다');
    }

    return data as string;
  },

  async getMyJoinRequests(): Promise<CustomerJoinRequest[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { data, error } = await getCoreClient().rpc('list_my_customer_join_requests' as never);

    if (!error && data) {
      const rows = (typeof data === 'string' ? JSON.parse(data) : data) as CustomerJoinRequest[];
      return Array.isArray(rows) ? rows : [];
    }

    // RPC 미적용 환경 폴백
    const { data: fallback, error: fallbackError } = await getCoreClient()
      .from('customer_join_requests')
      .select('*')
      .eq('applicant_user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (fallbackError) {
      console.error('Failed to fetch join requests:', fallbackError);
      throw new Error('가입 신청 목록을 가져오는데 실패했습니다');
    }

    return (fallback || []) as CustomerJoinRequest[];
  },

  async cancelMyJoinRequest(requestId: string): Promise<void> {
    const { error } = await getCoreClient().rpc('cancel_my_customer_join_request' as never, {
      p_request_id: requestId,
    } as never);

    if (error) {
      console.error('Failed to cancel join request:', error);
      if (error.message.includes('Only pending')) {
        throw new Error('대기 중인 신청만 취소할 수 있습니다');
      }
      throw new Error('가입 신청 취소에 실패했습니다');
    }
  },

  async getOrgJoinRequests(
    orgId: string,
    status?: string,
    requestType?: JoinRequestType
  ): Promise<CustomerJoinRequest[]> {
    let query = getCoreClient()
      .from('customer_join_requests')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }
    if (requestType) {
      query = query.eq('request_type', requestType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch organization join requests:', error);
      throw new Error('가입 신청 목록을 가져오는데 실패했습니다');
    }

    return (data || []) as CustomerJoinRequest[];
  },

  async approveJoinRequest(requestId: string, role: 'customer' | 'member' = 'customer'): Promise<void> {
    const { error } = await getCoreClient().rpc('approve_customer_join_request' as never, {
      p_request_id: requestId,
      p_role: role,
    } as never);

    if (error) {
      console.error('Failed to approve join request:', error);
      throw new Error('가입 승인에 실패했습니다');
    }
  },

  async rejectJoinRequest(requestId: string, reason?: string): Promise<void> {
    const { error } = await getCoreClient().rpc('reject_customer_join_request' as never, {
      p_request_id: requestId,
      p_reject_reason: reason || null,
    } as never);

    if (error) {
      console.error('Failed to reject join request:', error);
      throw new Error('가입 반려에 실패했습니다');
    }
  },
};
