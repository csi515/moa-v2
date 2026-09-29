// Piano module views
export {
  StudentListView,
  StudentDetailModal,
  StudentFormModal,
  ParentManagementView,
  ClassManagementView,
  WeeklyTimetableView,
  ConsultationRecordsView,
  TuitionManagementView,
  UnpaidManagementView,
  TeacherManagementView,
  AcademyCalendarView,
  AcademySettingsView,
} from '@/core/academy';
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
export { PianoAppContent } from './PianoAppContent';

// Module config
export { pianoModuleLabels, type ModuleLabels } from './config/labels';
export { ModuleLabelsProvider, useModuleLabels } from './config/ModuleLabelsProvider';
