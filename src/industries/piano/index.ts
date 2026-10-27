// Piano module views
export {
  StudentListView,
  StudentDetailModal,
  StudentFormModal,
} from '@/capabilities/roster';
export { ParentManagementView } from '@/core/parent/components/ParentManagementView';
export { TeacherManagementView } from '@/core/staff/components/TeacherManagementView';
export { AcademyCalendarView } from './components/calendar/AcademyCalendarView';
export { WorkplaceSettingsView, AcademySettingsView } from '@/core/organizations/components/WorkplaceSettingsView';
export { ClassManagementView, WeeklyTimetableView } from '@/capabilities/scheduling';
export { TuitionManagementView, UnpaidManagementView } from '@/capabilities/billing';
export { ConsultationRecordsView } from '@/capabilities/consultation';
export { DashboardView } from './components/dashboard/DashboardView';
/** @legacy `lessons` 딥링크는 출결 허브로 연결. 화면 코드는 회귀·참조용 유지 */
export { LessonsHubView } from './components/lessons/LessonsHubView';
export { LessonRecordsView } from './components/lessons/LessonRecordsView';
export { TodayLessonView } from './components/lessons/TodayLessonView';
export { PracticeRecordsView } from './components/practice/PracticeRecordsView';
export { ResourceManagementView } from './components/resources/ResourceManagementView';
export { MakeupManagementView } from './components/makeup/MakeupManagementView';
export { RecitalManagementView } from './components/recitals/RecitalManagementView';
export { RecitalService } from './services/recitalService';
export { TextbookManagementView } from './components/textbooks/TextbookManagementView';
export { ExpenseManagementView } from './components/expenses/ExpenseManagementView';
export {
  CurriculumManagementView,
  AssignmentsManagementView,
  AchievementsManagementView,
  ReportsManagementView,
} from './components/education/EducationManagementView';
export {
  StudentStampBoard,
  DirectorApprovalModal,
  TeacherDirectPassModal,
  ParentStudentStampView,
  CompletionReport,
  SongProgressStaffView,
  songProgressService,
} from './components/songProgress';

// Module config
export { pianoModuleLabels, type ModuleLabels } from './config/labels';
export { ModuleLabelsProvider, useModuleLabels } from './config/ModuleLabelsProvider';
