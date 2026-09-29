import type { DayOfWeek, StaffWorkWindow, Teacher } from '@/types';

const DAYS: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];

function windowFor(windows: StaffWorkWindow[], staffId: string): StaffWorkWindow {
  return (
    windows.find((item) => item.staffId === staffId) || {
      staffId,
      days: [],
      startTime: '10:00',
      endTime: '19:00',
    }
  );
}

/** 관리사별 요일·시간. 요일이 없으면 근무 제한 없음 */
export function StaffHoursFields({
  teachers,
  windows,
  onChange,
}: {
  teachers: Teacher[];
  windows: StaffWorkWindow[];
  onChange: (next: StaffWorkWindow[]) => void;
}) {
  const update = (staffId: string, patch: Partial<StaffWorkWindow>) => {
    const current = windowFor(windows, staffId);
    const next = windows.filter((item) => item.staffId !== staffId);
    onChange([...next, { ...current, ...patch, staffId }]);
  };

  if (teachers.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-slate-800">관리사 근무시간</p>
      <p className="text-[11px] text-slate-500">요일을 고르지 않으면 겹침만 검사합니다.</p>
      {teachers.map((teacher) => {
        const item = windowFor(windows, teacher.id);
        return (
          <div key={teacher.id} className="rounded-xl bg-white border border-slate-200 p-3 space-y-2">
            <p className="text-xs font-bold text-slate-800">{teacher.name}</p>
            <div className="flex flex-wrap gap-1">
              {DAYS.map((day) => {
                const on = item.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      update(teacher.id, {
                        days: on ? item.days.filter((value) => value !== day) : [...item.days, day],
                      })
                    }
                    className={`min-h-[44px] min-w-[44px] rounded-lg text-xs font-bold ${
                      on ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={item.startTime}
                onChange={(e) => update(teacher.id, { startTime: e.target.value })}
                className="px-2 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
                aria-label={`${teacher.name} 시작`}
              />
              <input
                type="time"
                value={item.endTime}
                onChange={(e) => update(teacher.id, { endTime: e.target.value })}
                className="px-2 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
                aria-label={`${teacher.name} 종료`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
