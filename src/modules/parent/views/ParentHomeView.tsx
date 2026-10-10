import React from 'react';
import type { IndustryType } from '@/core/industry/types';
import type { ParentPortalTab } from '@/types/education';
import type { Student } from '@/types';
import { UnifiedPortalHome } from './UnifiedPortalHome';
import './industryHomeWidgets';

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
  return (
    <UnifiedPortalHome
      student={student}
      organizationId={organizationId}
      readOnly={readOnly}
      onNavigate={onNavigate}
      industryType={industryType}
    />
  );
}

