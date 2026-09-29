import { getCoreClient } from '@/lib/supabase';

/** 로그인 계정 영구 삭제 (App Store 5.1.1 대응). 원장 계정은 RPC에서 차단될 수 있음. */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await getCoreClient().rpc('delete_my_account');
  if (error) throw error;
}
