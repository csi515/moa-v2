import type { FC, MouseEvent } from 'react';
import { CheckCircle2, ChevronRight, MapPin, Users, XCircle, FileText, Edit3 } from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus, ClassItem, LessonRecord, Student } from '@/types';

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: '출석',
  late: '지각',
  early_leave: '조퇴',
  absent: '결석',
  make_up: '보강',
};

export type TodayLessonSessionTarget = {
  student: Student;
  classItem: ClassItem;
};

interface TodayLessonClassListProps {
  classes: ClassItem[];
  students: Student[];
  currentHm: string;
  uncheckedOnly: boolean;
  findAttendance: (studentId: string, classId: string) => AttendanceRecord | undefined;
  findLesson: (studentId: string, classId: string) => LessonRecord | undefined;
  onOpenSession: (target: TodayLessonSessionTarget) => void;
  onQuickStatus: (
    e: MouseEvent,
    student: Student,
    classItem: ClassItem,
    status: 'present' | 'absent'
  ) => void;
}

export const TodayLessonClassList: FC<TodayLessonClassListProps> = ({
  classes,
  students,
  currentHm,
  uncheckedOnly,
  findAttendance,
  findLesson,
  onOpenSession,
  onQuickStatus,
}) => (
  <div className="space-y-3">
    {uncheckedOnly && (
      <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
        아직 출결이 없는 학생만 표시합니다.
      </p>
    )}
    {classes.map((cls) => {
      const enrolled = students.filter((s) => s.classIds?.includes(cls.id));
      const classDone = enrolled.filter((s) => !!findAttendance(s.id, cls.id)).length;
      const isNow =
        !!cls.startTime &&
        !!cls.endTime &&
        cls.startTime <= currentHm &&
        currentHm < cls.endTime;
      const isNext =
        !isNow &&
        !!cls.startTime &&
        cls.startTime > currentHm &&
        classes.find((c) => c.startTime && c.startTime > currentHm)?.id === cls.id;

      return (
        <section
          key={cls.id}
          className={`rounded-2xl border bg-white overflow-hidden shadow-xs ${
            isNow
              ? 'border-indigo-300 ring-1 ring-indigo-200'
              : isNext
                ? 'border-emerald-200'
                : 'border-slate-200'
          }`}
        >
          <div
            className={`px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 ${
              isNow ? 'bg-indigo-50' : isNext ? 'bg-emerald-50/70' : 'bg-slate-50/80'
            }`}
          >
            <div className="min-w-0 flex items-start gap-3">
              <div className="shrink-0 w-14 text-center">
                <p className="font-mono text-sm font-black text-indigo-700">{cls.startTime}</p>
                <p className="text-[10px] text-slate-400">~{cls.endTime}</p>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-slate-900 truncate">{cls.name}</p>
                  {isNow && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                      진행 중
                    </span>
                  )}
                  {isNext && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                      다음
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {cls.room}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Users className="w-3 h-3" />
                    {classDone}/{enrolled.length}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {enrolled.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">배정된 학생이 없습니다</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {enrolled
                .filter((student) => !uncheckedOnly || !findAttendance(student.id, cls.id))
                .map((student) => {
                  const att = findAttendance(student.id, cls.id);
                  const lesson = findLesson(student.id, cls.id);
                  const done = !!att;

                  return (
                    <li key={student.id}>
                      <div className="flex items-stretch gap-1 px-2 sm:px-3 py-2 min-h-[60px]">
                        <button
                          type="button"
                          onClick={() => onOpenSession({ student, classItem: cls })}
                          className="flex-1 text-left flex items-center gap-2.5 min-w-0 hover:bg-indigo-50/50 active:bg-indigo-50 rounded-xl px-1.5 py-1 transition-colors cursor-pointer"
                        >
                          <span
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                              done
                                ? att?.status === 'absent'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-700'
                                : 'bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            {student.name.slice(0, 1)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 truncate">{student.name}</p>
                              {done && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                    att?.status === 'absent'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {STATUS_LABEL[att!.status]}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {lesson?.songTitle
                                ? `🎵 ${lesson.songTitle}`
                                : done
                                ? '노트 미작성 · 클릭하여 기록'
                                : '미처리 · 원탭 출석 또는 클릭'}
                            </p>
                          </div>
                        </button>

                        {/* 출석 처리 전: 원클릭 [출석] / [결석] */}
                        {!done ? (
                          <div className="flex items-center gap-1 shrink-0 pr-1">
                            <button
                              type="button"
                              onClick={(e) => onQuickStatus(e, student, cls, 'present')}
                              className="min-h-[44px] min-w-[50px] px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                              aria-label={`${student.name} 즉시 출석`}
                            >
                              출석
                            </button>
                            <button
                              type="button"
                              onClick={(e) => onQuickStatus(e, student, cls, 'absent')}
                              className="min-h-[44px] min-w-[44px] px-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                              aria-label={`${student.name} 결석`}
                            >
                              <XCircle className="w-4 h-4 mx-auto sm:hidden" />
                              <span className="hidden sm:inline">결석</span>
                            </button>
                          </div>
                        ) : (
                          /* 출석 처리 후: 직관적인 [노트 작성/수정] 버튼 */
                          <div className="flex items-center shrink-0 pr-1">
                            <button
                              type="button"
                              onClick={() => onOpenSession({ student, classItem: cls })}
                              className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                lesson?.songTitle
                                  ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              }`}
                              aria-label={`${student.name} 수업 노트`}
                            >
                              {lesson?.songTitle ? (
                                <>
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">노트 수정</span>
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="hidden sm:inline">노트 작성</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>
      );
    })}
  </div>
);
