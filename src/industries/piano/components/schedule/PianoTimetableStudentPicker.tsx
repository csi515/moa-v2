import type { FC } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import type { Student } from '@/types';

interface PianoTimetableStudentPickerProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  students: Student[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (student: Student) => void;
  onClose: () => void;
  excludeIds?: Set<string>;
}

/** 터치용 학생 선택 시트 */
export const PianoTimetableStudentPicker: FC<PianoTimetableStudentPickerProps> = ({
  isOpen,
  title,
  subtitle,
  students,
  searchQuery,
  onSearchChange,
  onSelect,
  onClose,
  excludeIds,
}) => {
  if (!isOpen) return null;

  const q = searchQuery.trim().toLowerCase();
  const list = students.filter((s) => {
    if (excludeIds?.has(s.id)) return false;
    if (!q) return true;
    return s.name.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-100 text-slate-400"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="학생 이름 검색"
              className="w-full pl-9 pr-3 py-2.5 min-h-[44px] text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {list.length === 0 ? (
            <li className="p-8 text-center text-sm text-slate-400">선택할 학생이 없습니다</li>
          ) : (
            list.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  onClick={() => onSelect(student)}
                  className="w-full text-left px-4 py-3 min-h-[56px] hover:bg-indigo-50/60 flex items-center gap-3"
                >
                  <span className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold text-sm text-slate-900">{student.name}</span>
                    <span className="block text-[11px] text-slate-400 truncate">
                      {[student.school, student.grade].filter(Boolean).join(' · ') || '학생'}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
