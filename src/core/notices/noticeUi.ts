import { PIN_ATTENDANCE_PARENT_COPY } from '@/core/attendance/attendanceNotifyCopy';
import type { ModuleLabels } from '@/core/labels';
import type { NoticeTargetMode } from './types';

/** accent.icon → soft badge / edit button (Tailwind 정적 클래스) */
export function noticeAccentClasses(iconClass: string): {
  soft: string;
  softHover: string;
  edit: string;
  active: string;
} {
  if (iconClass.includes('teal')) {
    return {
      soft: 'bg-teal-50 text-teal-700',
      softHover: 'hover:border-teal-200 hover:bg-teal-50/50',
      edit: 'text-teal-700 hover:bg-teal-50',
      active: 'bg-teal-600 text-white',
    };
  }
  if (iconClass.includes('orange')) {
    return {
      soft: 'bg-orange-50 text-orange-700',
      softHover: 'hover:border-orange-200 hover:bg-orange-50/50',
      edit: 'text-orange-700 hover:bg-orange-50',
      active: 'bg-orange-600 text-white',
    };
  }
  if (iconClass.includes('sky')) {
    return {
      soft: 'bg-sky-50 text-sky-700',
      softHover: 'hover:border-sky-200 hover:bg-sky-50/50',
      edit: 'text-sky-700 hover:bg-sky-50',
      active: 'bg-sky-600 text-white',
    };
  }
  return {
    soft: 'bg-indigo-50 text-indigo-700',
    softHover: 'hover:border-indigo-200 hover:bg-indigo-50/50',
    edit: 'text-indigo-700 hover:bg-indigo-50',
    active: 'bg-indigo-600 text-white',
  };
}

/** 업종 라벨 기준 대상 표시 */
export function getNoticeTargetModeLabel(
  mode: NoticeTargetMode,
  labels: ModuleLabels
): string {
  if (mode === 'all') return `전체 ${labels.contact.singular}`;
  if (mode === 'class') return `특정 ${labels.service.singular}`;
  return `개별 ${labels.customer.singular}`;
}

export const NOTICE_COPY = {
  pageTitle: '안내장 · 가정통신문',
  pageDescription: (contactSingular: string) =>
    `${contactSingular} 포털에 안내장·가정통신문을 게시합니다 (앱 내 알림)`,
  emptyTitle: '등록된 안내가 없습니다',
  emptyDescription: '휴강·행사·준비물 등 안내장이나 가정통신문을 작성해 보세요.',
  parentSectionTitle: '알림 · 가정통신문',
  parentEmpty: '게시된 알림이 없습니다.',
  parentEmptyHint: PIN_ATTENDANCE_PARENT_COPY.noticesEmptyHint,
  navLabel: '안내장',
  daycareNavLabel: '가정통신문',
} as const;
