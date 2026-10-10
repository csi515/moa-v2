import React from 'react';
import {
  registerParentPortalTabSlot,
  type GenericParentPortalTabSlotProps,
} from './parentPortalSlots';
import { ParentCareJournalView } from '../views/ParentCareJournalView';
import { ParentMedicationView } from '../views/ParentMedicationView';
import { ParentIncidentView } from '../views/ParentIncidentView';
import { ParentPickupListView } from '../views/ParentPickupListView';
import { ParentShuttleView } from '../views/ParentShuttleView';
import { PilatesParentBookingsView } from '../views/PilatesParentBookingsView';
import { ParentAssignmentsView } from '../views/ParentAssignmentsView';
import { ParentProgressView } from '../views/ParentProgressView';
import { ParentReportsView } from '../views/ParentReportsView';

let initialized = false;

export function initParentPortalTabSlots(): void {
  if (initialized) return;
  initialized = true;

  // 어린이집 전용 탭 슬롯
  registerParentPortalTabSlot('journals', (props: GenericParentPortalTabSlotProps) => (
    <ParentCareJournalView student={props.student} />
  ));

  registerParentPortalTabSlot('medications', (props: GenericParentPortalTabSlotProps) => (
    <ParentMedicationView
      student={props.student}
      readOnly={props.readOnly}
      showToast={props.showToast}
      onRefresh={props.onRefresh}
    />
  ));

  registerParentPortalTabSlot('incidents', (props: GenericParentPortalTabSlotProps) => (
    <ParentIncidentView student={props.student} />
  ));

  registerParentPortalTabSlot('pickups', (props: GenericParentPortalTabSlotProps) => (
    <ParentPickupListView
      student={props.student}
      readOnly={props.readOnly}
      showToast={props.showToast}
      onRefresh={props.onRefresh}
    />
  ));

  registerParentPortalTabSlot('shuttle', (props: GenericParentPortalTabSlotProps) => (
    <ParentShuttleView
      student={props.student}
      readOnly={props.readOnly}
      showToast={props.showToast}
      onRefresh={props.onRefresh}
    />
  ));

  // 피아노/학습 특화 탭 슬롯
  registerParentPortalTabSlot('assignments', (props: GenericParentPortalTabSlotProps) => (
    <ParentAssignmentsView
      student={props.student}
      readOnly={props.readOnly}
      showToast={props.showToast}
      onRefresh={props.onRefresh}
    />
  ));

  registerParentPortalTabSlot('progress', (props: GenericParentPortalTabSlotProps) => (
    <ParentProgressView
      student={props.student}
      organizationId={props.organizationId}
      industryType={props.industryType}
      readOnly={props.readOnly}
      showToast={props.showToast}
      onRefresh={props.onRefresh}
    />
  ));

  registerParentPortalTabSlot('reports', (props: GenericParentPortalTabSlotProps) => (
    <ParentReportsView student={props.student} />
  ));

  // 예약형(필라테스/피부) 탭 슬롯
  registerParentPortalTabSlot('pilates_bookings', (props: GenericParentPortalTabSlotProps) => (
    <PilatesParentBookingsView
      student={props.student}
      variant={props.variant || 'pilates'}
    />
  ));
}

// 자동 초기화
initParentPortalTabSlots();
