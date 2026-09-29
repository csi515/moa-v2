/**
 * 기본 audit writer. 중요 mutation은 DB RPC를 같은 트랜잭션에서 호출한다.
 * 클라이언트 단독 insert는 쓰지 않는다.
 */
import { getCoreClient } from '@/lib/supabase';
import { buildAuditWriteArgs } from './auditArgs';
import type { WriteAuditLogInput } from './types';

export { buildAuditWriteArgs };

export async function writeAuditLog(input: WriteAuditLogInput): Promise<string> {
  const client = getCoreClient();
  const { data, error } = await client.rpc('append_audit_log', buildAuditWriteArgs(input) as never);
  if (error) throw new Error(error.message || '감사 기록에 실패했습니다.');
  if (!data) throw new Error('감사 기록에 실패했습니다.');
  return String(data);
}
