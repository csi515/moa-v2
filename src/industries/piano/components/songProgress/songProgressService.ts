import type { RealtimeChannel } from '@supabase/supabase-js';
import { getPianoClient, supabase } from '@/lib/supabase';
import type { SongProgressRow, SongProgressStatus } from './songProgressTypes';

function client() {
  return getPianoClient();
}

function mapError(message: string, fallback: string): Error {
  if (/Already pending/i.test(message)) {
    return new Error('이미 같은 곡의 완곡 신청이 대기 중입니다.');
  }
  if (/Permission denied/i.test(message)) {
    return new Error('권한이 없습니다.');
  }
  if (/Only PENDING/i.test(message)) {
    return new Error('대기 중인 신청만 승인할 수 있습니다.');
  }
  if (/Not authenticated/i.test(message)) {
    return new Error('로그인이 필요합니다.');
  }
  if (/Customer not found/i.test(message)) {
    return new Error('해당 조직의 학생을 찾을 수 없습니다.');
  }
  if (/book_name and song_title are required/i.test(message)) {
    return new Error('교재와 곡명을 입력해 주세요.');
  }
  if (/too long/i.test(message)) {
    return new Error('교재명 또는 곡명이 너무 깁니다.');
  }
  return new Error(message || fallback);
}

/** piano.song_progress 서비스 */
export const songProgressService = {
  async listForCustomer(
    organizationId: string,
    customerId: string
  ): Promise<SongProgressRow[]> {
    const { data, error } = await client()
      .from('song_progress')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .order('requested_at', { ascending: false });
    if (error) throw new Error(error.message || '완곡 기록을 불러오지 못했습니다.');
    return (data || []) as SongProgressRow[];
  },

  async listPending(organizationId: string): Promise<SongProgressRow[]> {
    const { data, error } = await client()
      .from('song_progress')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'PENDING' satisfies SongProgressStatus)
      .order('requested_at', { ascending: true });
    if (error) throw new Error(error.message || '승인 대기 목록을 불러오지 못했습니다.');
    return (data || []) as SongProgressRow[];
  },

  async listApproved(
    organizationId: string,
    customerId: string
  ): Promise<SongProgressRow[]> {
    const { data, error } = await client()
      .from('song_progress')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .eq('status', 'APPROVED')
      .order('approved_at', { ascending: false });
    if (error) throw new Error(error.message || '완곡 리포트를 불러오지 못했습니다.');
    const rows = (data || []) as SongProgressRow[];
    return rows.sort((a, b) => {
      const ta = a.granted_at || a.approved_at || '';
      const tb = b.granted_at || b.approved_at || '';
      return tb.localeCompare(ta);
    });
  },

  async request(params: {
    organizationId: string;
    customerId: string;
    bookName: string;
    songTitle: string;
    memo?: string;
  }): Promise<string> {
    const { data, error } = await client().rpc('request_song_completion' as never, {
      p_org_id: params.organizationId,
      p_customer_id: params.customerId,
      p_book_name: params.bookName,
      p_song_title: params.songTitle,
      p_memo: params.memo ?? null,
    } as never);
    if (error) throw mapError(error.message, '완곡 신청에 실패했습니다.');
    return data as string;
  },

  async approve(progressId: string, stamps = 1): Promise<void> {
    const { error } = await client().rpc('approve_song_progress' as never, {
      p_progress_id: progressId,
      p_stamps: stamps,
    } as never);
    if (error) throw mapError(error.message, '승인에 실패했습니다.');
  },

  async approveBulk(progressIds: string[], stamps = 1): Promise<number> {
    const { data, error } = await client().rpc('approve_song_progress_bulk' as never, {
      p_progress_ids: progressIds,
      p_stamps: stamps,
    } as never);
    if (error) throw mapError(error.message, '일괄 승인에 실패했습니다.');
    return Number(data ?? 0);
  },

  /** 레슨 중 선생님 즉시 스탬프 수여 */
  async grantDirect(params: {
    organizationId: string;
    customerId: string;
    bookName: string;
    songTitle: string;
    stamps?: number;
  }): Promise<string> {
    const { data, error } = await client().rpc('grant_song_stamp_direct' as never, {
      p_org_id: params.organizationId,
      p_customer_id: params.customerId,
      p_book_name: params.bookName,
      p_song_title: params.songTitle,
      p_stamps: params.stamps ?? 1,
    } as never);
    if (error) throw mapError(error.message, '스탬프 수여에 실패했습니다.');
    return data as string;
  },

  /**
   * 학부모 미러용 Realtime (FCM 대체)
   * 채널은 root supabase 클라이언트에 붙인다.
   */
  subscribeForCustomer(
    organizationId: string,
    customerId: string,
    onChange: (payload: { eventType: string }) => void
  ): () => void {
    if (!supabase) return () => undefined;

    const channel: RealtimeChannel = supabase
      .channel(`song_progress:${organizationId}:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'piano',
          table: 'song_progress',
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          const row = (payload.new || payload.old) as { organization_id?: string } | undefined;
          if (row?.organization_id && row.organization_id !== organizationId) return;
          onChange({ eventType: payload.eventType });
        }
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  },

  totalStamps(rows: SongProgressRow[]): number {
    return rows
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + (r.stamps_awarded || 1), 0);
  },
};
