import React from 'react';
import { PassesManagementView, type PassRecord } from '@/capabilities/passes';

export type { PassRecord };

/**
 * PassesListPage
 * 
 * Capability 경계 원칙에 따라 실질적인 업무 로직 및 데이터 접근은
 * `@/capabilities/passes` (PassesManagementView & passesService)로 위임하고
 * 라우트 엔트리포인트 호환성을 유지합니다.
 */
export const PassesListPage: React.FC = () => {
  return <PassesManagementView />;
};

export default PassesListPage;
