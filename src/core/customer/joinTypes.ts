/** 가입 신청 상태 */
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** 가입 신청 타입 */
export type JoinRequestType = 'membership' | 'trial' | 'consultation';

/** 고객 가입 신청 */
export interface CustomerJoinRequest {
  id: string;
  organization_id: string;
  /** list_my_customer_join_requests RPC에서 채움 */
  organization_name?: string | null;
  organization_public_code?: string | null;
  applicant_user_id: string;
  applicant_name: string;
  applicant_phone: string | null;
  applicant_email: string | null;
  request_type: JoinRequestType;
  message: string | null;
  customer_metadata: Record<string, unknown>;
  status: JoinRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}
