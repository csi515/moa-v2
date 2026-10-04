import React from 'react';
import type { IndustryType } from '@/core/industry/types';
import type { ParentPortalTab } from '@/types/education';
import type { Student } from '@/types';
import { GymParentHome } from './GymParentHome';
import { PianoParentHome } from './PianoParentHome';
import { PilatesParentHome } from './PilatesParentHome';
import { DaycareParentHome } from './DaycareParentHome';
import { parentHomeFallbackCopy, parentHomeLayout } from './parentHomeCopy';

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
  const layout = parentHomeLayout(industryType);
  if (layout === 'daycare') {
    return (
      <DaycareParentHome
        student={student}
        organizationId={organizationId}
        readOnly={readOnly}
        onNavigate={onNavigate}
      />
    );
  }
  if (layout === 'gym') {
    return (
      <GymParentHome
        student={student}
        organizationId={organizationId}
        onNavigate={onNavigate}
      />
    );
  }
  if (layout === 'pilates' || layout === 'skin') {
    return (
      <PilatesParentHome
        student={student}
        organizationId={organizationId}
        onNavigate={onNavigate}
        variant={layout === 'skin' ? 'skin' : 'pilates'}
      />
    );
  }
  if (layout === 'piano') {
    return (
      <PianoParentHome
        student={student}
        organizationId={organizationId}
        onNavigate={onNavigate}
      />
    );
  }

  const fallback = parentHomeFallbackCopy(industryType);
  const hint = fallback?.hint ?? '';
  const attendanceLabel = fallback?.attendanceLabel ?? '출결';
  const feeActionLabel = fallback?.feeActionLabel ?? '';

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
        <p className="font-bold text-slate-900">{student.name}</p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {hint}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="min-h-[44px] rounded-xl bg-slate-50 text-sm font-bold text-slate-800"
        >
          {attendanceLabel}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('tuition')}
          className="min-h-[44px] rounded-xl bg-slate-50 text-sm font-bold text-slate-800"
        >
          {feeActionLabel}
        </button>
      </div>
    </div>
  );
}
