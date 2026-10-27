import { useMemo, type FC } from 'react';
import { Clock } from 'lucide-react';
import type { ClassItem, Student } from '@/types';
import { DirectorSectionEmpty } from './DirectorSectionEmpty';

interface DirectorTodayScheduleSectionProps {
  todayClasses: ClassItem[];
  students: Student[];
  onOpenSchedule: () => void;
}

/** 원장 홈 — 오늘 정규 수업 일정 (정렬은 부모 훅에서 완료) */
export const DirectorTodayScheduleSection: FC<DirectorTodayScheduleSectionProps> = ({
  todayClasses,
  students,
  onOpenSchedule,
}) => {
  const rows = useMemo(() => {
    return todayClasses.map((cls) => {
      const enrolled = students.filter(
        (s) => s.status === 'active' && (s.classIds || []).includes(cls.id)
      ).length;
      return { cls, enrolled };
    });
  }, [todayClasses, students]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
            오늘 일정
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {rows.length > 0 ? `오늘 정규 수업 ${rows.length}개` : '오늘 예정 수업 없음'}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSchedule}
          className="text-xs font-bold text-indigo-600 min-h-[44px] px-1 shrink-0"
        >
          시간표 보기
        </button>
      </div>

      {rows.length === 0 ? (
        <DirectorSectionEmpty className="py-5">
          오늘 예정된 정규 수업이 없습니다.
        </DirectorSectionEmpty>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ cls, enrolled }) => (
            <li
              key={cls.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50/70 min-h-[52px]"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-indigo-700 tabular-nums">
                  {cls.startTime}
                  {cls.endTime ? ` – ${cls.endTime}` : ''}
                </p>
                <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{cls.name}</p>
                {cls.teacherName && (
                  <p className="text-[11px] text-slate-500 truncate">{cls.teacherName}</p>
                )}
              </div>
              <span className="shrink-0 text-[11px] font-bold text-slate-600 tabular-nums">
                {enrolled}/{cls.capacity}명
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
