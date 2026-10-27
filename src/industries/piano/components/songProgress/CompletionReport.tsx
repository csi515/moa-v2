import type { FC } from 'react';
import { Share2 } from 'lucide-react';
import type { SongProgressRow } from './songProgressTypes';
import { SONG_PROGRESS_COPY } from './songProgressTypes';

interface CompletionReportProps {
  rows: SongProgressRow[];
  studentName: string;
  stampCount: number;
  onShare?: () => void;
  /** granted_by → 표시명 (없으면 생략) */
  granterNameById?: Map<string, string>;
}

function formatGrantedAt(row: SongProgressRow): string {
  const iso = row.granted_at || row.approved_at;
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** 완곡 리포트 카드 — 타임라인 + 공유 */
export const CompletionReport: FC<CompletionReportProps> = ({
  rows,
  studentName,
  stampCount,
  onShare,
  granterNameById,
}) => {
  return (
    <section className="bg-gradient-to-br from-indigo-50 via-white to-amber-50 rounded-2xl border border-indigo-100 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900">{SONG_PROGRESS_COPY.reportTitle}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {studentName} · 완곡 {rows.length}곡 · 스탬프 {stampCount}개
          </p>
        </div>
        {onShare && rows.length > 0 && (
          <button
            type="button"
            onClick={onShare}
            className="min-h-[44px] px-3 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-indigo-50"
          >
            <Share2 className="w-3.5 h-3.5" />
            {SONG_PROGRESS_COPY.shareCta}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">아직 승인·수여된 완곡이 없습니다.</p>
      ) : (
        <ol className="relative border-l-2 border-indigo-200 ml-2 space-y-3 pl-4">
          {rows.map((r) => {
            const granterId = r.granted_by || r.approved_by;
            const granter =
              granterId && granterNameById?.get(granterId)
                ? granterNameById.get(granterId)
                : null;
            return (
              <li key={r.id} className="relative">
                <span className="absolute -left-[1.35rem] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
                <p className="text-sm font-bold text-slate-900">
                  {r.book_name} · {r.song_title}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {formatGrantedAt(r)} · 스탬프 +{r.stamps_awarded}
                  {granter ? ` · ${granter} 선생님` : ''}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
