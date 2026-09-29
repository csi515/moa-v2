import { useMemo } from 'react';
import { StorageService } from '@/services/storage';
import { useStorageRefresh } from '@/hooks';
import type { Student } from '@/types';
import { CARE_JOURNAL_MOOD_LABEL } from '@/industries/daycare/care';
import { Section } from './shared';

export function ParentCareJournalView({ student }: { student: Student }) {
  const refreshKey = useStorageRefresh();
  const journals = useMemo(
    () =>
      StorageService.getCareJournals()
        .filter((j) => j.studentId === student.id)
        .sort((a, b) => b.journalDate.localeCompare(a.journalDate) || b.updatedAt.localeCompare(a.updatedAt)),
    [student.id, refreshKey]
  );

  return (
    <Section title={`${student.name} 알림장`}>
      {journals.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">아직 작성된 알림장이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {journals.map((j) => (
            <article key={j.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/80">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-bold text-slate-900 font-mono">{j.journalDate}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700">
                  기분 {CARE_JOURNAL_MOOD_LABEL[j.mood]}
                </span>
              </div>
              <dl className="space-y-1.5 text-xs text-slate-600">
                <div>
                  <dt className="font-semibold text-slate-500">식사</dt>
                  <dd className="whitespace-pre-wrap">{j.meals || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">낮잠</dt>
                  <dd className="whitespace-pre-wrap">{j.nap || '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">활동</dt>
                  <dd className="whitespace-pre-wrap">{j.activities || '—'}</dd>
                </div>
                {j.bowel && (
                  <div>
                    <dt className="font-semibold text-slate-500">배변</dt>
                    <dd className="whitespace-pre-wrap">{j.bowel}</dd>
                  </div>
                )}
                {j.healthNote && (
                  <div>
                    <dt className="font-semibold text-slate-500">건강</dt>
                    <dd className="whitespace-pre-wrap text-amber-800">{j.healthNote}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-3 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-3">
                {j.teacherNote}
              </p>
              {j.teacherName && (
                <p className="text-[11px] text-slate-400 mt-2">작성 · {j.teacherName}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}
