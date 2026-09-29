import type { FC } from 'react';
import type { TodayCareClose } from '../dailyClose';

const COPY = {
  title: '오늘 할 일',
  journals: '알림장 없음',
  write: '작성',
  meds: '투약 대기',
  meal: '오늘 보존식 미기록',
  empty: '오늘 등원 원아의 알림장·투약·보존식은 닫혀 있습니다.',
} as const;

export const DailyCloseList: FC<{
  close: TodayCareClose;
  onWriteJournal: (studentId: string) => void;
  onOpenMedications: () => void;
  onOpenMeals: () => void;
}> = ({ close, onWriteJournal, onOpenMedications, onOpenMeals }) => {
  const quiet =
    close.missingJournals.length === 0 &&
    close.pendingMedications.length === 0 &&
    !close.mealSampleMissing;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <p className="text-xs font-bold text-slate-500">{COPY.title}</p>
      {quiet ? <p className="text-sm text-slate-400">{COPY.empty}</p> : null}

      {close.missingJournals.length > 0 && (
        <div>
          <p className="text-xs font-bold text-amber-800 mb-2">
            {COPY.journals} {close.missingJournals.length}명
          </p>
          <div className="flex flex-wrap gap-2">
            {close.missingJournals.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => onWriteJournal(student.id)}
                className="px-3 py-2 min-h-[44px] rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-slate-800"
              >
                {student.name} {COPY.write}
              </button>
            ))}
          </div>
        </div>
      )}

      {close.pendingMedications.length > 0 && (
        <button
          type="button"
          onClick={onOpenMedications}
          className="w-full text-left px-3 py-3 min-h-[44px] rounded-xl bg-amber-50 border border-amber-200"
        >
          <p className="text-xs font-bold text-amber-800">
            {COPY.meds} {close.pendingMedications.length}건
          </p>
          <p className="text-[11px] text-amber-800 mt-1">
            {close.pendingMedications
              .map((item) => `${item.studentName} ${item.medicineName}`)
              .join(' · ')}
          </p>
        </button>
      )}

      {close.mealSampleMissing && (
        <button
          type="button"
          onClick={onOpenMeals}
          className="w-full text-left px-3 py-3 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
        >
          {COPY.meal}
        </button>
      )}
    </div>
  );
};
