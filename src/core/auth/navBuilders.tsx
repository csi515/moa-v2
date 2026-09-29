import type { ReactNode } from 'react';
import type { ModuleLabels } from '@/core/labels/types';
import type { NavMenuItem, NavMenuSection } from './navUtils';
import { BarChart3 } from 'lucide-react';

const icon = (node: ReactNode) => node;

/** 사이드바·하단 공통 섹션 빌더 */
export function buildNavSection(title: string, items: NavMenuItem[]): NavMenuSection {
  return { title, items };
}

/** 수납·재무 허브 진입용 단일 네비 아이템 */
export function buildFinanceNavItem(size: 'sm' | 'md' = 'sm'): NavMenuItem {
  const cls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return { tab: 'finance', label: '재무', icon: icon(<BarChart3 className={cls} />) };
}

/** @deprecated ModuleLabels는 @/core/labels/types 사용 */
export type { ModuleLabels };
