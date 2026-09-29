import React from 'react';
import { normalizeIndustryType, type IndustryType } from '@/core/industry/types';
import type { ParentPortalTab } from '@/types/education';
import type { Student } from '@/types';
import { GymParentHome } from './GymParentHome';
import { PianoParentHome } from './PianoParentHome';
import { PilatesParentHome } from './PilatesParentHome';
import { DaycareParentHome } from './DaycareParentHome';

const GENERIC_HOME_HINT = '출결·수납·안내는 아래 메뉴에서 확인할 수 있습니다.';
const GENERIC_HOME_ATTENDANCE = '출결';
const GENERIC_HOME_TUITION = '수납';

export function ParentHomeView({
  student,
  organizationId,
  readOnly = false,
  onNavigate,
  industryType = 'piano',
}: {
  student: Student;
  organizationId: string;
  readOnly?: boolean;
  onNavigate: (t: ParentPortalTab) => void;
  industryType?: IndustryType | string;
}) {
  const industry = normalizeIndustryType(industryType);
  if (industry === 'daycare') {
    return (
      <DaycareParentHome
        student={student}
        organizationId={organizationId}
        readOnly={readOnly}
        onNavigate={onNavigate}
      />
    );
  }
  if (industry === 'gym') {
    return (
      <GymParentHome
        student={student}
        organizationId={organizationId}
        onNavigate={onNavigate}
      />
    );
  }
  if (industry === 'pilates' || industry === 'skin_clinic') {
    return (
      <PilatesParentHome
        student={student}
        organizationId={organizationId}
        onNavigate={onNavigate}
        variant={industry === 'skin_clinic' ? 'skin' : 'pilates'}
      />
    );
  }
  if (industry === 'piano') {
    return (
      <PianoParentHome
        student={student}
        organizationId={organizationId}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
        <p className="font-bold text-slate-900">{student.name}</p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {GENERIC_HOME_HINT}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="min-h-[44px] rounded-xl bg-slate-50 text-sm font-bold text-slate-800"
        >
          {GENERIC_HOME_ATTENDANCE}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('tuition')}
          className="min-h-[44px] rounded-xl bg-slate-50 text-sm font-bold text-slate-800"
        >
          {GENERIC_HOME_TUITION}
        </button>
      </div>
    </div>
  );
}
