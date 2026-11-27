import React, { useMemo, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { SearchField } from '@/shared/components/ui';
import type { CalendarStaffMember } from './calendarMembersService';

export interface StaffFilterContentProps {
  members: CalendarStaffMember[];
  currentUserId: string | null;
  selectedStaffIds: string[];
  isAllSelected: boolean;
  onSelectAll: () => void;
  onSelectMineOnly: () => void;
  onToggleStaff: (userId: string) => void;
  loading?: boolean;
}

/**
 * 캘린더 직원 멀티 선택 필터 패널 본문.
 * 데스크톱 좌측 사이드 패널과 모바일 드로어 모달에서 공용으로 사용합니다.
 */
export const StaffFilterContent: React.FC<StaffFilterContentProps> = ({
  members,
  currentUserId,
  selectedStaffIds,
  isAllSelected,
  onSelectAll,
  onSelectMineOnly,
  onToggleStaff,
  loading = false,
}) => {
  const [search, setSearch] = useState('');

  const sortedMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? members.filter(
          (m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
        )
      : members;

    // 본인 일정을 최상단에 우선 정렬
    return [...filtered].sort((a, b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      return a.name.localeCompare(b.name, 'ko');
    });
  }, [members, search, currentUserId]);

  const selectedSet = useMemo(() => new Set(selectedStaffIds), [selectedStaffIds]);
  const isMineOnly =
    Boolean(currentUserId) &&
    !isAllSelected &&
    selectedStaffIds.length === 1 &&
    selectedStaffIds[0] === currentUserId;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-slate-700" />
          <span className="text-xs font-bold text-slate-900">직원별 일정</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
          {isAllSelected ? `전체 ${members.length}명` : `${selectedStaffIds.length}/${members.length}명`}
        </span>
      </div>

      {/* 퀵 버튼: 내 일정만 / 전체 선택 */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={!currentUserId}
          onClick={onSelectMineOnly}
          className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-40 ${
            isMineOnly
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          내 일정만
        </button>
        <button
          type="button"
          onClick={onSelectAll}
          className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
            isAllSelected
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          전체 선택
        </button>
      </div>

      {/* 이름 검색 */}
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="직원 이름 검색"
        className="w-full"
      />

      {/* 직원 체크박스 리스트 */}
      <div className="space-y-1 max-h-72 md:max-h-[calc(100dvh-26rem)] overflow-y-auto pr-0.5">
        {loading ? (
          <p className="text-xs text-slate-400 py-4 text-center">직원 목록 불러오는 중...</p>
        ) : sortedMembers.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">일치하는 직원이 없습니다.</p>
        ) : (
          sortedMembers.map((member) => {
            const checked = isAllSelected || selectedSet.has(member.userId);
            const isMe = member.userId === currentUserId;
            return (
              <button
                key={member.userId}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => onToggleStaff(member.userId)}
                className={`w-full min-h-[44px] px-2.5 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                  checked
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50/70'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    checked
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  {checked && <Check className="w-3 h-3 stroke-[3]" />}
                </span>

                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: member.color }}
                  aria-hidden
                />

                <span className="min-w-0 flex-1 flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate">{member.name}</span>
                  {isMe && (
                    <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-bold shrink-0">
                      나
                    </span>
                  )}
                </span>

                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                  {member.role}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
