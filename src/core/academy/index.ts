/**
 * Legacy aggregation. 새 업무 기능은 여기 두지 않는다.
 * students/classes → roster, parents → parent staff UI, timetable/schedule/calendar → scheduling,
 * consultations → consultation, enrollments → enrollment, tuition/unpaid → billing,
 * customers → core/customer, teachers → core/staff(예정), settings → organization + capability settings.
 */

export { StudentListView } from './components/students/StudentListView';
export { StudentDetailModal } from './components/students/StudentDetailModal';
export { StudentFormModal } from './components/students/StudentFormModal';
export { ParentManagementView } from './components/parents/ParentManagementView';
export { GuardianEnrollmentRequestsView } from './components/enrollments';
export { ClassManagementView } from './components/classes/ClassManagementView';
export { WeeklyTimetableView } from './components/timetable/WeeklyTimetableView';
export { ConsultationRecordsView } from './components/consultations/ConsultationRecordsView';
export { TuitionManagementView } from './components/tuition/TuitionManagementView';
export { UnpaidManagementView } from './components/unpaid/UnpaidManagementView';
export { TeacherManagementView } from './components/teachers/TeacherManagementView';
export { AcademyCalendarView } from './components/calendar/AcademyCalendarView';
export { ClassScheduleHubView } from './components/schedule/ClassScheduleHubView';
export { CustomerHubView } from './components/customers/CustomerHubView';
export { SettingsHubView } from './components/settings/SettingsHubView';
export { AcademySettingsView } from './components/settings/AcademySettingsView';
export {
  ACADEMY_ROOM_KIND_LABEL,
  createAcademyRoom,
  formatAcademyRoomLabel,
  getAcademyRoomNames,
  getConfiguredRooms,
  getPracticeRoomNames,
} from './utils/academyRooms';
export {
  isMonthlyBillingStudent,
  isSessionPassBillingStudent,
  resolveDefaultBillingMode,
} from './utils/billingMode';
