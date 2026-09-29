/** 피아노 완곡 게이미피케이션 — 타입·상수 */

export type SongProgressStatus = 'IN_PROGRESS' | 'PENDING' | 'APPROVED';

export interface SongProgressRow {
  id: string;
  organization_id: string;
  customer_id: string;
  book_name: string;
  song_title: string;
  status: SongProgressStatus;
  stamps_awarded: number;
  requested_at: string;
  approved_at: string | null;
  approved_by?: string | null;
  granted_at?: string | null;
  granted_by?: string | null;
  memo?: string | null;
  customers?: { name: string } | null;
}

export const SONG_BOOK_OPTIONS = [
  '바이엘 1권',
  '바이엘 2권',
  '바이엘 3권',
  '체르니 100번',
  '체르니 30번',
  '체르니 40번',
  '하농',
  '부르크뮐러 25',
  '소나티네',
  '기타',
] as const;

export const SONG_PROGRESS_COPY = {
  requestCta: '선생님, 완곡했어요!',
  approveCta: '참 잘했어요 스탬프 꾹!',
  approveBulkCta: '선택 일괄 승인',
  grantCta: '완곡 수동 수여',
  grantSubmitCta: '완곡 등록 & 스탬프 부여',
  shareCta: '축하 카드 공유하기',
  shareParentCta: '학부모 카톡으로 성취 카드 전송',
  pendingEmpty: '대기 중인 완곡 신청이 없습니다.',
  stampTitle: '나의 완곡 스탬프판',
  mirrorTitle: '자녀 완곡 스탬프',
  reportTitle: '완곡 리포트',
} as const;

/** 빠른 번호 칩 (1–20) */
export const SONG_NUMBER_QUICK = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
] as const;

export function formatSongNumberTitle(n: number | string): string {
  const num = typeof n === 'number' ? n : parseInt(String(n).replace(/\D/g, ''), 10);
  if (!Number.isFinite(num) || num < 1) return '';
  return `No. ${num}`;
}

export const DEFAULT_STAMP_BOARD_SIZE = 20;

export type StampChildOption = { id: string; name: string };
