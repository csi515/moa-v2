import type { ReactNode } from 'react';
import { UserCircle } from 'lucide-react';
import type { NavMenuItem } from '@/core/auth/navUtils';

const icon = (node: ReactNode) => node;

/** 전 역할 공통 '내 계정' 메뉴 */
export function accountNavItem(size: 'sm' | 'lg' = 'lg'): NavMenuItem {
  const className = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return {
    tab: 'account',
    label: '내 계정',
    icon: icon(<UserCircle className={className} />),
  };
}
