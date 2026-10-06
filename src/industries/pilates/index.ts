export { ModuleLabelsProvider, useModuleLabels } from './config/ModuleLabelsProvider';
export { pilatesModuleLabels, type ModuleLabels } from './config/labels';
export { PilatesDashboardView } from './components/dashboard/PilatesDashboardView';
export { MemberListView } from './components/members/MemberListView';
export { InstructorListView } from './components/instructors/InstructorListView';
export { PassManagementView } from './components/passes/PassManagementView';
/** 실물 상품 판매용 Core 연결 (회원권·예약과 분리). UI 없음. */
export {
  pilatesMerchandiseService,
  PILATES_MERCHANDISE_DOMAIN,
  type PilatesMerchandiseSaleInput,
  type PilatesMerchandiseProduct,
  type PilatesMerchandiseCustomer,
} from './services/merchandise';
