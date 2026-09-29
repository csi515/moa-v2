import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import { Modal, FormField, FORM_CONTROL_CLASS } from '@/shared/components';
import type { AttendanceStatus, ClassItem, LessonRecord, Student } from '@/types';

export type LessonSessionForm = {
  status: AttendanceStatus;
  songTitle: string;
  progress: string;
  lessonContent: string;
  strengths: string;
  weaknesses: string;
  homework: string;
  nextPlan: string;
  memo: string;
};

const ATT_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: '출석' },
  { value: 'late', label: '지각' },
  { value: 'early_leave', label: '조퇴' },
  { value: 'absent', label: '결석' },
  { value: 'make_up', label: '보강' },
];

const EMPTY_FORM: LessonSessionForm = {
  status: 'present',
  songTitle: '',
  progress: '',
  lessonContent: '',
  strengths: '',
  weaknesses: '',
  homework: '',
  nextPlan: '',
  memo: '',
};

interface LessonSessionModalProps {
  isOpen: boolean;
  student: Student | null;
  classItem: ClassItem | null;
  date: string;
  existingLesson: LessonRecord | null;
  existingStatus: AttendanceStatus | null;
  songSuggestions?: string[];
  homeworkHint?: string;
  inProgressSong?: string;
  onClose: () => void;
  onSave: (form: LessonSessionForm) => void;
}

/** 출석 → 노트 → 과제 → 다음곡 원스톱 세션 모달 */
export const LessonSessionModal: FC<LessonSessionModalProps> = ({
  isOpen,
  student,
  classItem,
  date,
  existingLesson,
  existingStatus,
  songSuggestions = [],
  homeworkHint = '',
  inProgressSong = '',
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<LessonSessionForm>(EMPTY_FORM);
  const datalistId = useMemo(() => `lesson-songs-${student?.id || 'x'}`, [student?.id]);

  useEffect(() => {
    if (!isOpen || !student) return;
    setForm({
      status: existingStatus || 'present',
      songTitle: existingLesson?.songTitle || inProgressSong || '',
      progress: existingLesson?.progress || '',
      lessonContent: existingLesson?.lessonContent || '',
      strengths: existingLesson?.strengths || '',
      weaknesses: existingLesson?.weaknesses || '',
      homework: existingLesson?.homework || homeworkHint || '',
      nextPlan: existingLesson?.nextPlan || '',
      memo: existingLesson?.memo || '',
    });
  }, [isOpen, student, existingLesson, existingStatus, homeworkHint, inProgressSong]);

  if (!student) return null;

  const skipLessonFields = form.status === 'absent';
  const suggestionChips = songSuggestions.slice(0, 6);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${student.name} · 오늘 수업`} maxWidth="lg">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSave(form);
        }}
        className="space-y-5 p-5 pb-6"
      >
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5">
          <p className="text-xs text-slate-600 font-medium">
            {date}
            {classItem ? ` · ${classItem.name} (${classItem.startTime}–${classItem.endTime})` : ''}
          </p>
          {student.level && (
            <p className="text-[11px] text-slate-400 mt-0.5">레벨 · {student.level}</p>
          )}
          {!skipLessonFields && (
            <p className="text-[11px] text-indigo-600 font-semibold mt-1.5">
              출석 → 노트 → 과제 → 다음곡
            </p>
          )}
        </div>

        <section className="space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">1 · 출석</p>
          <div className="grid grid-cols-5 gap-1.5">
            {ATT_OPTIONS.map((opt) => {
              const active = form.status === opt.value;
              const absent = opt.value === 'absent';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, status: opt.value }))}
                  className={`min-h-[48px] rounded-xl text-[11px] sm:text-xs font-bold border transition-colors ${
                    active
                      ? absent
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {!skipLessonFields && (
          <>
            <section className="space-y-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                2 · 수업 노트
              </p>
              <FormField label="수업 곡 / 교재" required>
                <input
                  className={FORM_CONTROL_CLASS}
                  list={datalistId}
                  value={form.songTitle}
                  onChange={(e) => setForm((prev) => ({ ...prev, songTitle: e.target.value }))}
                  placeholder="예: 체르니 100 25번"
                  required
                />
              </FormField>
              {suggestionChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestionChips.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, songTitle: s }))}
                      className="min-h-[36px] px-2.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <FormField label="진도">
                <input
                  className={FORM_CONTROL_CLASS}
                  value={form.progress}
                  onChange={(e) => setForm((prev) => ({ ...prev, progress: e.target.value }))}
                  placeholder="오늘 진도 요약"
                />
              </FormField>
              <FormField label="수업 내용">
                <textarea
                  className={`${FORM_CONTROL_CLASS} min-h-[72px] resize-y`}
                  value={form.lessonContent}
                  onChange={(e) => setForm((prev) => ({ ...prev, lessonContent: e.target.value }))}
                  placeholder="오늘 지도한 내용"
                />
              </FormField>
            </section>

            <section className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5">
              <div>
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">
                  3 · 학부모 공유 · 과제
                </p>
                <p className="text-[11px] text-indigo-600/80 mt-0.5">
                  잘한 점·보완점·과제는 학부모 앱에 표시됩니다
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="잘한 점">
                  <textarea
                    className={`${FORM_CONTROL_CLASS} min-h-[64px] resize-y bg-white`}
                    value={form.strengths}
                    onChange={(e) => setForm((prev) => ({ ...prev, strengths: e.target.value }))}
                    placeholder="칭찬할 점"
                  />
                </FormField>
                <FormField label="보완점">
                  <textarea
                    className={`${FORM_CONTROL_CLASS} min-h-[64px] resize-y bg-white`}
                    value={form.weaknesses}
                    onChange={(e) => setForm((prev) => ({ ...prev, weaknesses: e.target.value }))}
                    placeholder="연습 포인트"
                  />
                </FormField>
              </div>
              <FormField label="이번 주 과제">
                <textarea
                  className={`${FORM_CONTROL_CLASS} min-h-[72px] resize-y bg-white`}
                  value={form.homework}
                  onChange={(e) => setForm((prev) => ({ ...prev, homework: e.target.value }))}
                  placeholder="연습 지시사항"
                />
              </FormField>
            </section>

            <section className="space-y-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                4 · 다음 곡
              </p>
              <FormField label="다음 곡 / 다음 계획">
                <input
                  className={FORM_CONTROL_CLASS}
                  list={datalistId}
                  value={form.nextPlan}
                  onChange={(e) => setForm((prev) => ({ ...prev, nextPlan: e.target.value }))}
                  placeholder="다음 수업에서 할 곡"
                />
              </FormField>
              {suggestionChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestionChips.map((s) => (
                    <button
                      key={`next-${s}`}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, nextPlan: s }))}
                      className="min-h-[36px] px-2.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <FormField label="메모 (학원 내부)">
                <input
                  className={FORM_CONTROL_CLASS}
                  value={form.memo}
                  onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
                  placeholder="학부모에게 보이지 않습니다"
                />
              </FormField>
            </section>

            <datalist id={datalistId}>
              {songSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </>
        )}

        {skipLessonFields && (
          <FormField label="결석 메모">
            <input
              className={FORM_CONTROL_CLASS}
              value={form.memo}
              onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
              placeholder="결석 사유 등"
            />
          </FormField>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="submit"
            className={`flex-[1.4] min-h-[48px] rounded-xl text-white text-sm font-bold shadow-sm ${
              skipLessonFields ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {skipLessonFields ? '결석 저장 · 보강으로' : '저장하기'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
