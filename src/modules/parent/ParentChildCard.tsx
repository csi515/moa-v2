import React from 'react';
import { Building2, ChevronRight, Pencil } from 'lucide-react';
import { GUARDIAN_RELATIONSHIP_LABELS } from '@/core/parent/types';
import { getPlaceLabel } from '@/core/industry/industryUi';
import {
  ACTIVE_ENROLLMENT_STATUSES,
  INACTIVE_ENROLLMENT_STATUSES,
  type GlobalStudent,
} from '@/core/parent/types/globalParent';

export const ParentChildCard: React.FC<{
  child: GlobalStudent;
  onSelect: () => void;
  onEdit: () => void;
}> = ({ child, onSelect, onEdit }) => {
  const academyCount = child.enrollments.length;
  const activeCount = child.enrollments.filter((e) =>
    ACTIVE_ENROLLMENT_STATUSES.includes(e.status)
  ).length;
  const inactiveCount = child.enrollments.filter((e) =>
    INACTIVE_ENROLLMENT_STATUSES.includes(e.status)
  ).length;
  const unlinked = academyCount === 0;
  const placeLabels = [...new Set(child.enrollments.map((item) => getPlaceLabel(item.industryType)))];
  const placeLabel = placeLabels.length === 1 ? placeLabels[0] : '연결';

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors text-left min-h-[44px]"
    >
      <div className="min-w-0">
        <p className="font-black text-slate-900 truncate">{child.displayName}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {GUARDIAN_RELATIONSHIP_LABELS[child.relationship]}
          {child.isPrimary && ' · 대표 보호자'}
        </p>
        <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          {unlinked
            ? '미연결 · 눌러서 연결 요청'
            : `${placeLabel} ${activeCount}/${academyCount}${inactiveCount > 0 ? ` · 기록 ${inactiveCount}` : ''}`}
        </p>
      </div>
      <span className="flex items-center gap-1 shrink-0">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              onEdit();
            }
          }}
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-slate-500"
          aria-label="자녀 정보 수정"
        >
          <Pencil className="w-4 h-4" />
        </span>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </span>
    </button>
  );
};
