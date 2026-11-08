/**
 * Piano Academy Mobile Quick Action Helpers
 *
 * 모바일 한 손 엄지손가락 전용 4대 핵심 업무 정의 및 핸들러 유틸리티.
 */

export type QuickActionId = 'new_student' | 'check_in' | 'pay_tuition' | 'practice_room';

export interface QuickActionItem {
  id: QuickActionId;
  title: string;
  subtitle: string;
  badge?: string;
  iconType: 'user_plus' | 'check_circle' | 'credit_card' | 'piano';
  themeColor: 'indigo' | 'emerald' | 'violet' | 'amber';
  targetTab?: string;
}

export const PIANO_QUICK_ACTIONS: readonly QuickActionItem[] = [
  {
    id: 'new_student',
    title: '신규 원생 즉시 등록',
    subtitle: '이름·연락처만 넣고 30초 만에 간편 등록',
    badge: '원터치',
    iconType: 'user_plus',
    themeColor: 'indigo',
  },
  {
    id: 'check_in',
    title: '지금 도착한 원생 출결 체크',
    subtitle: '오늘 출석부로 직행하여 1초 출결 체크',
    iconType: 'check_circle',
    themeColor: 'emerald',
    targetTab: 'attendance',
  },
  {
    id: 'pay_tuition',
    title: '수강료 즉시 수납',
    subtitle: '미납 확인 및 현장 카드/계좌이체 즉시 수납',
    iconType: 'credit_card',
    themeColor: 'violet',
    targetTab: 'tuition',
  },
  {
    id: 'practice_room',
    title: '피아노 연습실 빈방 배정',
    subtitle: '연습실 현황 확인 및 연습 시간 기록',
    iconType: 'piano',
    themeColor: 'amber',
    targetTab: 'practice',
  },
] as const;

/**
 * 퀵 액션 클릭 시 취할 동작(탭 이동 또는 폼 모달 오픈)을 결정합니다.
 */
export function resolveQuickActionBehavior(actionId: QuickActionId): {
  openStudentForm: boolean;
  navTab: string | null;
} {
  switch (actionId) {
    case 'new_student':
      return { openStudentForm: true, navTab: null };
    case 'check_in':
      return { openStudentForm: false, navTab: 'attendance' };
    case 'pay_tuition':
      return { openStudentForm: false, navTab: 'tuition' };
    case 'practice_room':
      return { openStudentForm: false, navTab: 'practice' };
    default:
      return { openStudentForm: false, navTab: null };
  }
}
