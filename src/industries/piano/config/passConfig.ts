import type { PassManagementConfig } from '@/capabilities/billing/ui/PassManagementView';

export const pianoPassConfig: PassManagementConfig = {
  accent: 'bg-indigo-600',
  accentHover: 'hover:bg-indigo-700',
  accentText: 'text-indigo-600',
  filterActive: 'bg-indigo-600 text-white',
  title: '회차권 관리',
  description:
    '레슨 회차권을 등록·관리합니다. 수강 형태가 회차권인 원생은 출석(레슨) 시 1회 차감됩니다. 이 기기에서만 저장되며 다른 기기·재무 모듈과 동기화되지 않습니다.',
  createLabel: '+ 회차권 등록',
  emptyTitle: '회차권이 없습니다',
  customerLabel: '원생',
  passName: '회차권',
  defaultPassLabel: '8회 레슨권',
  defaultTotalSessions: 8,
  preferSessionPassStudents: true,
  billingModeChangeNotice: '회차권이 등록되었고, 원생 수강 형태를 회차권으로 맞췄습니다.',
};
