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
import { useParentPortal } from '@/core/parent/context/ParentPortalContext';
import { ParentIndustryAdapter } from '@/capabilities/parent/ParentIndustryAdapter';
import { getParentStudentStampViewSlot, getParentPortalTabSlot } from './slots/parentPortalSlots';
import './slots/initParentPortalSlots';
import { RetailCustomerPointsView } from './views/RetailCustomerPointsView';
import { RetailCustomerPurchasesView } from './views/RetailCustomerPurchasesView';

export function ParentPortalTabs({
  tab,
  student,
  organizationId,
  industryTypeProp,
  industryType: rawIndustryType,
  readOnly = false,
  showToast = () => {},
  onNavigate,
  onRefresh,
  onSwitchChild,
}: {
  tab: ParentPortalTab;
  student: Student;
  organizationId: string;
  industryTypeProp?: IndustryType | string | null;
  industryType?: IndustryType | string | null;
  readOnly?: boolean;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
  onNavigate: (t: ParentPortalTab) => void;
  onRefresh: () => void;
  onSwitchChild?: () => void;
}) {
  const { portalTree } = useParentPortal();
  const industryType = (rawIndustryType || industryTypeProp || '') as string;
  const isRetail = normalizeIndustryType(industryType) === 'retail';

  const stampChildren = useMemo(() => {
    return (portalTree?.children || [])
      .filter((c) => c.enrollments?.some((e) => e.organizationId === organizationId))
      .map((c) => ({
        id: c.studentId,
        name: c.displayName,
      }));
  }, [portalTree?.children, organizationId]);

  // 커스텀 탭 슬롯 검사
  const CustomTabSlot = getParentPortalTabSlot(tab);
  if (CustomTabSlot) {
    return (
      <CustomTabSlot
        student={student}
        organizationId={organizationId}
        readOnly={readOnly}
        showToast={showToast}
        onRefresh={onRefresh}
        onNavigate={onNavigate}
        industryType={industryType}
      />
    );
  }

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
      return (
        <ParentTuitionView
          student={student}
          industryType={industryType}
        />
      );
    case 'assignments':
      return (
        <ParentAssignmentsView
          student={student}
          readOnly={readOnly}
          showToast={showToast}
          onRefresh={onRefresh}
        />
      );
    case 'progress':
      return <ParentProgressView student={student} />;
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
    case 'stamps': {
      if (isRetail) {
        return <RetailCustomerPointsView student={student} />;
      }
      const StampView = getParentStudentStampViewSlot();
      if (!StampView) return null;
      return (
        <StampView
          key={student.id}
          organizationId={organizationId}
          childrenOptions={stampChildren}
          initialCustomerId={student.id}
          onToast={showToast}
        />
      );
    }
    case 'reports':
      if (isRetail) {
        return <RetailCustomerPurchasesView student={student} />;
      }
      return <ParentReportsView student={student} />;
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
      if (
        ParentIndustryAdapter.getPolicy(industryType).bookingVariant === 'pilates' ||
        ParentIndustryAdapter.getPolicy(industryType).bookingVariant === 'skin'
      ) {
        return (
          <PilatesParentBookingsView
            student={student}
            variant={
              (ParentIndustryAdapter.getPolicy(industryType).bookingVariant as 'pilates' | 'skin') ||
              'pilates'
            }
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
