import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import { Music2 } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { songProgressService } from './songProgressService';
import { fireSongCompletionConfetti, shareSongCelebration } from './songProgressEffects';
import { CompletionReport } from './CompletionReport';
import {
  DEFAULT_STAMP_BOARD_SIZE,
  SONG_PROGRESS_COPY,
  type SongProgressRow,
  type StampChildOption,
} from './songProgressTypes';

interface ParentStudentStampViewProps {
  organizationId: string;
  childrenOptions: StampChildOption[];
  initialCustomerId?: string;
  boardSize?: 20 | 30;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/** 학부모 PWA — 자녀 완곡 스탬프 미러링 (Realtime, 신청 UI 없음) */
export const ParentStudentStampView: FC<ParentStudentStampViewProps> = ({
  organizationId,
  childrenOptions,
  initialCustomerId,
  boardSize = DEFAULT_STAMP_BOARD_SIZE,
  onToast,
}) => {
  const [customerId, setCustomerId] = useState(
    () => initialCustomerId || childrenOptions[0]?.id || ''
  );
  const [rows, setRows] = useState<SongProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const prevStampsRef = useRef<number | null>(null);

  const studentName = useMemo(
    () => childrenOptions.find((c) => c.id === customerId)?.name || '자녀',
    [childrenOptions, customerId]
  );

  const reload = useCallback(async () => {
    if (!organizationId || !customerId || !isSupabaseConfigured()) {
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      const list = await songProgressService.listForCustomer(organizationId, customerId);
      setRows(list);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '불러오기 실패', 'error');
    } finally {
      setLoading(false);
    }
  }, [organizationId, customerId, onToast]);

  useEffect(() => {
    if (initialCustomerId && childrenOptions.some((c) => c.id === initialCustomerId)) {
      setCustomerId(initialCustomerId);
      return;
    }
    if (!childrenOptions.some((c) => c.id === customerId) && childrenOptions[0]) {
      setCustomerId(childrenOptions[0].id);
    }
  }, [childrenOptions, customerId, initialCustomerId]);

  useEffect(() => {
    setLoading(true);
    prevStampsRef.current = null;
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!organizationId || !customerId || !isSupabaseConfigured()) return;
    const unsub = songProgressService.subscribeForCustomer(organizationId, customerId, () => {
      void reload();
    });
    const fallback = window.setInterval(() => void reload(), 30_000);
    return () => {
      unsub();
      window.clearInterval(fallback);
    };
  }, [organizationId, customerId, reload]);

  const stampCount = useMemo(() => songProgressService.totalStamps(rows), [rows]);
  const approved = useMemo(() => rows.filter((r) => r.status === 'APPROVED'), [rows]);
  const latestApproved = approved[0];

  useEffect(() => {
    if (prevStampsRef.current === null) {
      prevStampsRef.current = stampCount;
      return;
    }
    if (stampCount > prevStampsRef.current) {
      fireSongCompletionConfetti();
      onToast?.('새 완곡 스탬프가 도착했어요! 🎉', 'success');
    }
    prevStampsRef.current = stampCount;
  }, [stampCount, onToast]);

  const handleShare = async () => {
    if (!latestApproved) return;
    const result = await shareSongCelebration({
      studentName,
      bookName: latestApproved.book_name,
      songTitle: latestApproved.song_title,
      stampCount,
      teacherGrant: true,
    });
    if (result === 'shared') onToast?.('공유했습니다.', 'success');
    else if (result === 'copied') onToast?.('축하 문구를 복사했습니다. 카톡에 붙여넣어 주세요.', 'info');
    else onToast?.('이 기기에서는 공유를 지원하지 않습니다.', 'warning');
  };

  if (!isSupabaseConfigured()) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        Supabase 연결 후 스탬프판을 볼 수 있습니다.
      </p>
    );
  }

  if (childrenOptions.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">연결된 자녀가 없습니다.</p>
    );
  }

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Music2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900">{SONG_PROGRESS_COPY.mirrorTitle}</h3>
            <p className="text-[11px] text-slate-500">선생님 수여·승인 스탬프가 실시간으로 반영됩니다.</p>
          </div>
        </div>

        <label className="block text-xs font-bold text-slate-600">
          자녀 선택
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800"
          >
            {childrenOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-6">불러오는 중...</p>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              모은 스탬프 <span className="font-bold text-indigo-700">{stampCount}</span>개
            </p>
            <div
              className="grid gap-1.5 sm:gap-2"
              style={{
                gridTemplateColumns: `repeat(${boardSize <= 20 ? 5 : 6}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: boardSize }, (_, i) => {
                const filled = i < stampCount;
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-xl border flex items-center justify-center text-lg ${
                      filled
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-slate-50 border-slate-100 text-slate-200'
                    }`}
                    aria-label={filled ? `스탬프 ${i + 1}` : `빈 칸 ${i + 1}`}
                  >
                    {filled ? '🎹' : '○'}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {!loading && (
        <CompletionReport
          rows={approved}
          studentName={studentName}
          stampCount={stampCount}
          onShare={approved.length > 0 ? () => void handleShare() : undefined}
        />
      )}
    </div>
  );
};
