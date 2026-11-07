import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, Music, Sparkles } from 'lucide-react';
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
  { value: 'absent', label: '결석' },
  { value: 'make_up', label: '보강' },
  { value: 'early_leave', label: '조퇴' },
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

/**
 * 피아노 수업 노트 모달 (실무 맞춤형 초슬림 3초 기록)
 * 핵심 3대 항목(수업곡, 피드백, 과제) 우선 노출 + 상세 항목 접이식 토글
 */
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
  const [showDetails, setShowDetails] = useState(false);
  const datalistId = useMemo(() => `lesson-songs-${student?.id || 'x'}`, [student?.id]);

  useEffect(() => {
    if (!isOpen || !student) return;
    const initialForm: LessonSessionForm = {
      status: existingStatus || 'present',
      songTitle: existingLesson?.songTitle || inProgressSong || '',
      progress: existingLesson?.progress || '',
      lessonContent: existingLesson?.lessonContent || '',
      strengths: existingLesson?.strengths || '',
      weaknesses: existingLesson?.weaknesses || '',
      homework: existingLesson?.homework || homeworkHint || '',
      nextPlan: existingLesson?.nextPlan || '',
      memo: existingLesson?.memo || '',
    };
    setForm(initialForm);

    // 상세 항목에 이미 데이터가 있으면 자동으로 펼침
    if (
      initialForm.weaknesses ||
      initialForm.nextPlan ||
      initialForm.memo ||
      initialForm.progress
    ) {
      setShowDetails(true);
    } else {
      setShowDetails(false);
    }
  }, [isOpen, student, existingLesson, existingStatus, homeworkHint, inProgressSong]);

  if (!student) return null;

  const isAbsent = form.status === 'absent';
  const suggestionChips = songSuggestions.slice(0, 6);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${student.name} · 수업 기록`} maxWidth="md">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSave(form);
        }}
        className="space-y-4 p-5 pb-6"
      >
        {/* 상단 학생 요약 카드 */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0">
              {student.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {student.name} {student.level ? <span className="text-slate-400 font-normal">({student.level})</span> : null}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {date} {classItem ? `· ${classItem.name}` : ''}
              </p>
            </div>
          </div>
          {classItem?.room && (
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md shrink-0">
              {classItem.room}
            </span>
          )}
        </div>

        {/* 1. 출석 상태 선택 바 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">출석 상태</label>
          <div className="grid grid-cols-5 gap-1.5">
            {ATT_OPTIONS.map((opt) => {
              const active = form.status === opt.value;
              const isOptAbsent = opt.value === 'absent';
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, status: opt.value }))}
                  className={`min-h-[44px] rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    active
                      ? isOptAbsent
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 결석인 경우: 결석 사유만 간단히 입력 */}
        {isAbsent ? (
          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100 space-y-2">
            <FormField label="결석 사유 및 메모">
              <input
                className={`${FORM_CONTROL_CLASS} bg-white`}
                value={form.memo}
                onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
                placeholder="예: 감기 몸살로 오늘 결석"
                autoFocus
              />
            </FormField>
            <p className="text-[11px] text-rose-700">
              결석 저장 후 보강 일정 관리 화면으로 바로 연결할 수 있습니다.
            </p>
          </div>
        ) : (
          /* 3. 출석/수업 진행인 경우: 3대 핵심 입력 필드 */
          <div className="space-y-3.5">
            {/* 핵심 1: 오늘 친 곡 / 교재 */}
            <div>
              <FormField label="오늘 배운 곡 / 교재" required>
                <div className="relative">
                  <input
                    className={`${FORM_CONTROL_CLASS} font-semibold`}
                    list={datalistId}
                    value={form.songTitle}
                    onChange={(e) => setForm((prev) => ({ ...prev, songTitle: e.target.value }))}
                    placeholder="예: 바이엘 2권 45p, 체르니 100 12번"
                    required
                  />
                  <Music className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </FormField>

              {/* 자주 쓰는 추천 곡 칩 (원클릭 자동 입력) */}
              {suggestionChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  <span className="text-[10px] text-slate-400 font-bold mr-0.5">추천:</span>
                  {suggestionChips.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, songTitle: s }))}
                      className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 핵심 2: 학부모 공유 수업 피드백 */}
            <FormField label="오늘 수업 피드백 (학부모 앱 전달)">
              <textarea
                className={`${FORM_CONTROL_CLASS} min-h-[68px] resize-y`}
                value={form.strengths || form.lessonContent}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    strengths: e.target.value,
                    lessonContent: e.target.value,
                  }))
                }
                placeholder="예: 오른손 스타카토 타건이 아주 또렷해졌어요! 양손 연습도 씩씩하게 잘했습니다."
              />
            </FormField>

            {/* 핵심 3: 이번 주 과제 (가정 연습 안내) */}
            <FormField label="이번 주 연습 과제">
              <input
                className={FORM_CONTROL_CLASS}
                value={form.homework}
                onChange={(e) => setForm((prev) => ({ ...prev, homework: e.target.value }))}
                placeholder="예: 45페이지 4째 마디 천천히 3번 복습하기"
              />
            </FormField>

            {/* 상세 항목 접이식 토글 */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDetails((prev) => !prev)}
                className="w-full py-2 px-3 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>상세 기록 (보완점, 다음 시간 곡, 내부 메모)</span>
                {showDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showDetails && (
                <div className="mt-2.5 p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
                  <FormField label="연습 포인트 / 보완점">
                    <input
                      className={`${FORM_CONTROL_CLASS} bg-white`}
                      value={form.weaknesses}
                      onChange={(e) => setForm((prev) => ({ ...prev, weaknesses: e.target.value }))}
                      placeholder="예: 왼손 반주 음량을 조금 더 부드럽게 조절하기"
                    />
                  </FormField>

                  <FormField label="다음 시간 예정 곡">
                    <input
                      className={`${FORM_CONTROL_CLASS} bg-white`}
                      list={datalistId}
                      value={form.nextPlan}
                      onChange={(e) => setForm((prev) => ({ ...prev, nextPlan: e.target.value }))}
                      placeholder="다음 수업에 나갈 진도 곡"
                    />
                  </FormField>

                  <FormField label="학원 내부 메모 (학부모 비공개)">
                    <input
                      className={`${FORM_CONTROL_CLASS} bg-white`}
                      value={form.memo}
                      onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))}
                      placeholder="선생님만 확인하는 내부 전달사항"
                    />
                  </FormField>
                </div>
              )}
            </div>

            <datalist id={datalistId}>
              {songSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        )}

        {/* 하단 취소 / 저장 버튼 */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[46px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="submit"
            className={`flex-[1.5] min-h-[46px] rounded-xl text-white text-sm font-bold shadow-xs transition-colors cursor-pointer ${
              isAbsent ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isAbsent ? '결석 저장' : '수업 노트 저장'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
