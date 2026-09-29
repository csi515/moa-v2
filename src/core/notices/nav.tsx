import type { ReactNode } from 'react';
import { Megaphone } from 'lucide-react';
import type { NavMenuItem } from '@/core/auth/navUtils';
import { NOTICE_COPY } from './noticeUi';

/** 사이드바/하단 네비용 안내장 메뉴 항목 */
export function noticesNavItem(
  size: 'sm' | 'lg' = 'sm',
  label: string = NOTICE_COPY.navLabel
): NavMenuItem {
  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return {
    tab: 'notices',
    label,
    icon: <Megaphone className={iconSize} /> as ReactNode,
  };
}
