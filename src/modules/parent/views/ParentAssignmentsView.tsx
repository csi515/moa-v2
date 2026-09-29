import React from 'react';
import { StorageService } from '@/services/storage';
import { LessonService } from '@/core/lessons';
import type { Student } from '@/types';
import { CheckCircle2 } from 'lucide-react';
import { Section } from './shared';

export function ParentAssignmentsView({
  student,
  readOnly = false,
  showToast,
  onRefresh,
}: {
  student: Student;
  readOnly?: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onRefresh: () => void;
}) {
  const assignments = StorageService.getWeeklyAssignments(student.id);
  const lessonFeedback = LessonService.getLessonRecordsByStudent(student.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const handleConfirm = (assignmentId: string, itemId: string) => {
    StorageService.confirmAssignmentItem(assignmentId, itemId);
    showToast('과제 완료를 확인했습니다.', 'success');
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {assignments.length === 0 ? (
        <Section title="주간 과제">
          <p className="text-sm text-slate-400 text-center py-8">등록된 과제가 없습니다.</p>
        </Section>
      ) : (
        assignments.map((a) => (
          <Section key={a.id} title={a.title || `${a.weekStart} 주 과제`}>
            {a.teacherNotes && (
              <p className="text-xs text-slate-500 mb-3 leading-relaxed bg-slate-50 rounded-xl px-3 py-2">
                {a.teacherNotes}
              </p>
            )}
            <div className="space-y-2">
              {a.items.map((it) => (
                <div
                  key={it.id}
                  className={`rounded-2xl p-3.5 border ${
                    it.parentConfirmed
                      ? 'bg-emerald-50/50 border-emerald-100'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <p className="font-bold text-sm text-slate-900">{it.songTitle}</p>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{it.instructions}</p>
                  {it.targetMinutes && (
                    <p className="text-xs text-indigo-600 font-semibold mt-2">
                      목표 연습 · {it.targetMinutes}분/일
                    </p>
                  )}
                  {it.parentConfirmed ? (
                    <p className="text-xs text-emerald-700 mt-3 flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> 확인 완료
                    </p>
                  ) : readOnly ? (
                    <p className="text-xs text-slate-500 mt-3">
                      퇴원·졸업 기록은 확인만 가능합니다.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConfirm(a.id, it.id)}
                      className="mt-3 w-full min-h-[44px] px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                    >
                      연습 완료 확인
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Section>
        ))
      )}

      <Section title="수업 피드백">
        {lessonFeedback.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">아직 수업 피드백이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {lessonFeedback.map((l) => (
              <article
                key={l.id}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-slate-900">{l.songTitle}</p>
                  <p className="text-[11px] text-slate-400 font-mono shrink-0">{l.date}</p>
                </div>
                {l.progress && (
                  <p className="text-xs text-indigo-700 font-semibold">진도 · {l.progress}</p>
                )}
                {l.strengths && (
                  <div className="rounded-xl bg-emerald-50 px-3 py-2">
                    <p className="text-[11px] font-bold text-emerald-700">잘한 점</p>
                    <p className="text-sm text-slate-800 mt-0.5 leading-relaxed">{l.strengths}</p>
                  </div>
                )}
                {l.weaknesses && (
                  <div className="rounded-xl bg-amber-50 px-3 py-2">
                    <p className="text-[11px] font-bold text-amber-800">보완점</p>
                    <p className="text-sm text-slate-800 mt-0.5 leading-relaxed">{l.weaknesses}</p>
                  </div>
                )}
                {l.homework && (
                  <p className="text-sm text-indigo-900 bg-indigo-50 rounded-xl px-3 py-2 leading-relaxed">
                    <span className="font-bold">과제</span> · {l.homework}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
