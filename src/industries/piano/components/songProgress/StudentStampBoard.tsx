import { useCallback, useEffect, useMemo, useRef, useState, type FC, type FormEvent } from 'react';
import { Music2, Sparkles } from 'lucide-react';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { isSupabaseConfigured } from '@/lib/supabase';
import { songProgressService } from './songProgressService';
import { fireSongCompletionConfetti, shareSongCelebration } from './songProgressEffects';
import {
  DEFAULT_STAMP_BOARD_SIZE,
  SONG_BOOK_OPTIONS,
  SONG_PROGRESS_COPY,
  type SongProgressRow,
} from './songProgressTypes';
import { CompletionReport } from './CompletionReport';

interface StudentStampBoardProps {
  organizationId: string;
  customerId: string;
  studentName: string;
  /** 스탬프 칸 수 (20 | 30) */
  boardSize?: 20 | 30;
  canRequest?: boolean;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

/** 학생/학부모 — 디지털 스탬프판 + 완곡 신청 */
export const StudentStampBoard: FC<StudentStampBoardProps> = ({
  organizationId,
  customerId,
  studentName,
  boardSize = DEFAULT_STAMP_BOARD_SIZE,
  canRequest = true,
  onToast,
}) => {
  const [rows, setRows] = useState<SongProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookName, setBookName] = useState<string>(SONG_BOOK_OPTIONS[0]);
  const [songTitle, setSongTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const prevApprovedRef = useRef<number | null>(null);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured()) {
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
    void reload();
    const t = window.setInterval(() => void reload(), 30_000);
    return () => window.clearInterval(t);
  }, [reload]);

  useEffect(() => {
    if (!organizationId || !customerId || !isSupabaseConfigured()) return;
    return songProgressService.subscribeForCustomer(organizationId, customerId, () => {
      void reload();
    });
  }, [organizationId, customerId, reload]);

  const stampCount = useMemo(() => songProgressService.totalStamps(rows), [rows]);
  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === 'PENDING').length,
    [rows]
  );

  useEffect(() => {
    if (prevApprovedRef.current === null) {
      prevApprovedRef.current = stampCount;
      return;
    }
    if (stampCount > prevApprovedRef.current) {
      fireSongCompletionConfetti();
      onToast?.('완곡 승인! 스탬프가 찍혔어요 🎉', 'success');
    }
    prevApprovedRef.current = stampCount;
  }, [stampCount, onToast]);

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim()) {
      onToast?.('곡명을 입력해 주세요.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await songProgressService.request({
        organizationId,
        customerId,
        bookName,
        songTitle: songTitle.trim(),
      });
      setSongTitle('');
      onToast?.('완곡 신청을 보냈습니다. 선생님 승인을 기다려 주세요.', 'success');
      await reload();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '신청 실패', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    const latest = rows.find((r) => r.status === 'APPROVED');
    const result = await shareSongCelebration({
      studentName,
      bookName: latest?.book_name || bookName,
      songTitle: latest?.song_title || '완곡곡',
      stampCount,
    });
    if (result === 'shared') onToast?.('공유했습니다.', 'success');
    else if (result === 'copied') onToast?.('축하 문구를 복사했습니다.', 'info');
    else onToast?.('이 기기에서는 공유를 지원하지 않습니다.', 'warning');
  };

  if (!isSupabaseConfigured()) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        Supabase 연결 후 완곡 스탬프를 사용할 수 있습니다.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-400 text-center py-6">스탬프판 불러오는 중...</p>;
  }

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Music2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900">{SONG_PROGRESS_COPY.stampTitle}</h3>
              <p className="text-[11px] text-slate-500">
                모은 스탬프 <span className="font-bold text-indigo-700">{stampCount}</span>개
                {pendingCount > 0 ? ` · 승인 대기 ${pendingCount}` : ''}
              </p>
            </div>
          </div>
          {stampCount > 0 && (
            <button
              type="button"
              onClick={() => void handleShare()}
              className="shrink-0 min-h-[44px] px-3 rounded-xl text-xs font-bold border border-indigo-200 text-indigo-700 hover:bg-indigo-50 inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {SONG_PROGRESS_COPY.shareCta}
            </button>
          )}
        </div>

        <div
          className="grid gap-1.5 sm:gap-2"
          style={{ gridTemplateColumns: `repeat(${boardSize <= 20 ? 5 : 6}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: boardSize }, (_, i) => {
            const filled = i < stampCount;
            return (
              <div
                key={i}
                className={`aspect-square rounded-xl border flex items-center justify-center text-lg transition-transform ${
                  filled
                    ? 'bg-indigo-50 border-indigo-200 scale-[1.02]'
                    : 'bg-slate-50 border-slate-100 text-slate-200'
                }`}
                aria-label={filled ? `스탬프 ${i + 1}` : `빈 칸 ${i + 1}`}
              >
                {filled ? '🎹' : '○'}
              </div>
            );
          })}
        </div>
      </section>

      {canRequest && (
        <form
          onSubmit={(e) => void handleRequest(e)}
          className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
        >
          <h3 className="text-sm font-black text-slate-900">완곡 신청</h3>
          <FormField label="교재" required>
            <select
              className={FORM_CONTROL_CLASS}
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
            >
              {SONG_BOOK_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="곡명" required>
            <input
              className={FORM_CONTROL_CLASS}
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="예: No. 5"
              maxLength={100}
            />
          </FormField>
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold"
          >
            {submitting ? '신청 중...' : SONG_PROGRESS_COPY.requestCta}
          </button>
        </form>
      )}

      <CompletionReport
        rows={rows.filter((r) => r.status === 'APPROVED')}
        studentName={studentName}
        stampCount={stampCount}
        onShare={() => void handleShare()}
      />
    </div>
  );
};
