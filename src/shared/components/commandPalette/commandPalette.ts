import { isChosungQuery } from '@/core/customers/chosungSearch';

export type CommandItem = {
  id: string;
  label: string;
  chosung?: string;
  group: 'member' | 'menu' | 'action';
  href: string;
};

export function isPaletteShortcut(event: { metaKey: boolean; ctrlKey: boolean; key: string }): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
}

export function filterCommands(query: string, items: CommandItem[]): CommandItem[] {
  const compact = query.trim();
  if (!compact) return items;
  if (isChosungQuery(compact)) {
    return items.filter((item) => (item.chosung ?? '').startsWith(compact) || item.label.includes(compact));
  }
  return items.filter((item) => item.label.toLowerCase().includes(compact.toLowerCase()));
}

export function moveCommandIndex(current: number, length: number, direction: 1 | -1): number {
  if (length === 0) return 0;
  return (current + direction + length) % length;
}

export const COMMAND_CATALOG: CommandItem[] = [
  { id: 'member-kim', label: '김민수', chosung: 'ㄱㅁㅅ', group: 'member', href: '/customers' },
  { id: 'member-lee', label: '이서연', chosung: 'ㅇㅅㅇ', group: 'member', href: '/customers' },
  { id: 'menu-schedule', label: '시간표', chosung: 'ㅅㄱㅍ', group: 'menu', href: '/booking/week' },
  { id: 'menu-attendance', label: '출결 패드', chosung: 'ㅊㄱㅍㄷ', group: 'menu', href: '/kiosk/attendance' },
  { id: 'menu-billing', label: '수납 장부', chosung: 'ㅅㄴㅈㅂ', group: 'menu', href: '/billing' },
  { id: 'menu-settings', label: '매장 설정', chosung: 'ㅁㅈㅅㅈ', group: 'menu', href: '/workspace/settings' },
  { id: 'menu-intranet', label: '사내 업무 스위트', chosung: 'ㅅㄴㅇㅁㅅㅌ', group: 'menu', href: '/workspace/intranet' },
  { id: 'menu-approvals', label: '전자 결재', chosung: 'ㅈㅈㄱㅈ', group: 'menu', href: '/workspace/approvals' },
  { id: 'menu-org', label: '조직도·직급', chosung: 'ㅈㅈㄷㅈㄱ', group: 'menu', href: '/workspace/organization' },
  { id: 'menu-rnd', label: '연구소 포털', chosung: 'ㅇㄱㅅㅍㅌ', group: 'menu', href: '/rnd' },
  { id: 'action-member', label: '새 회원 등록', chosung: 'ㅅㅎㅇㄷㄹ', group: 'action', href: '/customers/create' },
  { id: 'action-checkin', label: '오늘 출석 체크', chosung: 'ㅇㄴㅊㅅㅊㅋ', group: 'action', href: '/kiosk/attendance' },
  { id: 'action-unpaid', label: '미납 원비 확인', chosung: 'ㅁㄴㅇㅂㅎㅇ', group: 'action', href: '/billing' },
];
