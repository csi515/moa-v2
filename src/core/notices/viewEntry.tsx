import type { ReactNode } from 'react';
import { ParentNoticeView } from './ParentNoticeView';

/** 업종 VIEW_MAP에 공통으로 붙이는 안내장 엔트리 */
export const noticesViewEntry: Record<'notices', () => ReactNode> = {
  notices: () => <ParentNoticeView />,
};
