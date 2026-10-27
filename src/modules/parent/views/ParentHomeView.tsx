import React from 'react';
import type { IndustryType } from '@/core/industry/types';
import type { ParentPortalTab } from '@/types/education';
import type { Student } from '@/types';
import { normalizeIndustryType } from '@/core/industry/types';
import { UnifiedPortalHome } from './UnifiedPortalHome';
import { RetailCustomerHome } from './RetailCustomerHome';
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
  const norm = normalizeIndustryType(industryType);
  if (norm === 'retail') {
    return (
      <RetailCustomerHome
        onNavigate={onNavigate as any}
      />
    );
  }

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
