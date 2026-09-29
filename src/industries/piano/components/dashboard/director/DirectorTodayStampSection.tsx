import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Stamp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StudentService } from '@/core/students';
import { isSupabaseConfigured } from '@/lib/supabase';
import { songProgressService } from '../../songProgress/songProgressService';
import { fireSongCompletionConfetti } from '../../songProgress/songProgressEffects';
import { SONG_PROGRESS_COPY, type SongProgressRow } from '../../songProgress/songProgressTypes';

interface DirectorTodayStampSectionProps {
  onOpenHub?: () => void;
}

/** 원장 홈 — 완곡 승인 대기 + 칭찬 스탬프 꾹 */
export const DirectorTodayStampSection: FC<DirectorTodayStampSectionProps> = ({ onOpenHub }) => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const [pending, setPending] = useState<SongProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of StudentService.getStudents()) {
      map.set(s.id, s.name);
    }
    return map;
  }, [pending.length]);

  const reload = useCallback(async () => {
    if (!orgId || !isSupabaseConfigured()) {
      setPending([]);
      setLoading(false);
      return;
    }
    try {
      const list = await songProgressService.listPending(orgId);
      setPending(list);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void reload();
    const t = window.setInterval(() => void reload(), 20_000);
    return () => window.clearInterval(t);
  }, [reload]);

  const handleApprove = async (row: SongProgressRow) => {
    setBusyId(row.id);
    try {
      await songProgressService.approve(row.id, 1);
      fireSongCompletionConfetti();
      const name = nameById.get(row.customer_id) || '학생';
      showToast(`${name} · ${row.book_name} ${row.song_title} 스탬프!`, 'success');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '승인 실패', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Stamp className="w-4 h-4 text-amber-600" />
            완곡·스탬프 요청
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">대기 {pending.length}건</p>
        </div>
        {onOpenHub && (
          <button
            type="button"
            onClick={onOpenHub}
            className="text-xs font-bold text-indigo-600 min-h-[44px] px-1"
          >
            수동 수여
          </button>
        )}
      </div>

      {!isSupabaseConfigured() ? (
        <p className="text-xs text-slate-400 text-center py-6">Supabase 연결 후 사용할 수 있습니다.</p>
      ) : loading ? (
        <p className="text-xs text-slate-400 text-center py-6">불러오는 중...</p>
      ) : pending.length === 0 ? (
        <div className="text-center py-6 space-y-1">
          <p className="text-xs text-slate-400">{SONG_PROGRESS_COPY.pendingEmpty}</p>
          <p className="text-[11px] text-slate-400">수업 중 수여는 학생 상세 · 완곡 스탬프에서</p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-[280px] overflow-y-auto">
          {pending.map((row) => (
            <li
              key={row.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-100 bg-amber-50/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {nameById.get(row.customer_id) || '학생'}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {row.book_name} · {row.song_title}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => void handleApprove(row)}
                className="shrink-0 min-h-[48px] px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold disabled:opacity-50"
              >
                칭찬 스탬프 꾹
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
