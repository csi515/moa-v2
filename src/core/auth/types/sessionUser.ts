import type { MemberRole } from '@/lib/supabase/database.types';

/** 조직 멤버 역할. DB `member_role`과 동일 */
export type UserRole = MemberRole;

export interface User {
  id: string;
  name: string;
  role: UserRole;
  staffId?: string | null;
  parentCustomerId?: string | null;
  email: string;
}
