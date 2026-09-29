/** 공개 조직 정보 (로그인 불필요) */
export interface PublicOrgInfo {
  id: string;
  name: string;
  industry_type: string;
  public_code: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  email?: string | null;
  description?: string | null;
  business_hours?: string | null;
  representative_name?: string | null;
  is_active: boolean;
}

export interface ConsultationSubmission {
  contact_name: string;
  contact_phone: string;
  message: string;
  preferred_time?: string;
}
