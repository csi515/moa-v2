import React, { useMemo } from 'react';
import type { ParentPortalTab } from '@/types/education';
import type { Student } from '@/types';
import type { IndustryType } from '@/core/industry/types';
import { ParentHomeView } from './views/ParentHomeView';
import { ParentAttendanceView } from './views/ParentAttendanceView';
import { ParentTuitionView } from './views/ParentTuitionView';
import { ParentAssignmentsView } from './views/ParentAssignmentsView';
import { ParentProgressView } from './views/ParentProgressView';
import { ParentReportsView } from './views/ParentReportsView';
import { ParentEventsView } from './views/ParentEventsView';
import { ParentNoticesView } from './views/ParentNoticesView';
import { ParentCareJournalView } from './views/ParentCareJournalView';
import { ParentMedicationView } from './views/ParentMedicationView';
import { ParentIncidentView } from './views/ParentIncidentView';
import { ParentPickupListView } from './views/ParentPickupListView';
import { ParentScheduleView } from './views/ParentScheduleView';
import { ParentBookingsView } from './views/ParentBookingsView';
import { PilatesParentBookingsView } from './views/PilatesParentBookingsView';
import { ParentShuttleView } from './views/ParentShuttleView';
import { ParentMoreView } from './views/ParentMoreView';
import { normalizeIndustryType } from '@/core/industry/types';
import { isAppointmentIndustry } from '@/core/industry/industryUi';
import { useParentPortal } from '@/core/parent/context/ParentPortalContext';
import { ParentStudentStampView } from '@/industries/piano/components/songProgress';

export function ParentPortalTabs({
  tab,
  student,
  organizationId,
  readOnly = false,
  showToast,
  onRefresh,
  onNavigate,
  industryType = 'piano',
  onSwitchChild,
}: {
  tab: ParentPortalTab;
  student: Student;
  organizationId: string;
  readOnly?: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onRefresh: () => void;
  onNavigate: (t: ParentPortalTab) => void;
  industryType?: IndustryType | string;
  onSwitchChild?: () => void;
}) {
  const industry = normalizeIndustryType(industryType);
  const { portalTree } = useParentPortal();

  const stampChildren = useMemo(() => {
    const fromTree = (portalTree?.children ?? [])
      .map((child) => {
        const enr = child.enrollments.find((e) => e.organizationId === organizationId);
        if (!enr) return null;
        return { id: enr.customerId || child.studentId, name: child.displayName };
      })
      .filter((c): c is { id: string; name: string } => Boolean(c));
    if (fromTree.length > 0) return fromTree;
    return [{ id: student.id, name: student.name }];
  }, [portalTree?.children, organizationId, student.id, student.name]);

  switch (tab) {
    case 'home':
      return (
        <ParentHomeView
          student={student}
          organizationId={organizationId}
          readOnly={readOnly}
          onNavigate={onNavigate}
          industryType={industryType}
        />
      );
    case 'attendance':
      return (
        <ParentAttendanceView
          student={student}
          organizationId={organizationId}
          industryType={industryType}
        />
      );
    case 'tuition':
      return <ParentTuitionView student={student} industryType={industryType} />;
    case 'assignments':
      return <ParentAssignmentsView student={student} readOnly={readOnly} showToast={showToast} onRefresh={onRefresh} />;
    case 'progress':
      return (
        <ParentProgressView
          student={student}
          organizationId={organizationId}
          industryType={industryType}
          readOnly={readOnly}
          showToast={showToast}
          onRefresh={onRefresh}
        />
      );
    case 'stamps':
      return (
        <ParentStudentStampView
          key={student.id}
          organizationId={organizationId}
          childrenOptions={stampChildren}
          initialCustomerId={student.id}
          onToast={showToast}
        />
      );
    case 'reports':
      return <ParentReportsView student={student} />;
    case 'events':
      return <ParentEventsView student={student} industryType={industryType} />;
    case 'notices':
      return (
        <ParentNoticesView
          student={student}
          organizationId={organizationId}
          industryType={industryType}
        />
      );
    case 'journals':
      return <ParentCareJournalView student={student} />;
    case 'medications':
      return (
        <ParentMedicationView
          student={student}
          readOnly={readOnly}
          showToast={showToast}
          onRefresh={onRefresh}
        />
      );
    case 'incidents':
      return <ParentIncidentView student={student} />;
    case 'pickups':
      return (
        <ParentPickupListView
          student={student}
          readOnly={readOnly}
          showToast={showToast}
          onRefresh={onRefresh}
        />
      );
    case 'schedule':
      return <ParentScheduleView student={student} organizationId={organizationId} />;
    case 'bookings':
      if (isAppointmentIndustry(industry)) {
        return (
          <PilatesParentBookingsView
            student={student}
            variant={industry === 'skin_clinic' ? 'skin' : 'pilates'}
          />
        );
      }
      return <ParentBookingsView student={student} />;
    case 'shuttle':
      return (
        <ParentShuttleView
          student={student}
          readOnly={readOnly}
          showToast={showToast}
          onRefresh={onRefresh}
        />
      );
    case 'more':
      return (
        <ParentMoreView
          onNavigate={onNavigate}
          onSwitchChild={onSwitchChild}
          industryType={industryType}
        />
      );
    default:
      return null;
  }
}
