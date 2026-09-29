import type { ParentNoticeKind } from './types';

export interface NoticeTemplate {
  id: string;
  label: string;
  kind: ParentNoticeKind;
  title: string;
  message: string;
}

/** 업종별 안내 템플릿 (사업장·요금 용어 주입) */
export function buildNoticeTemplates(placeWord: string, feeWord: string): NoticeTemplate[] {
  return [
    {
      id: 'prepare',
      label: '준비물 안내',
      kind: 'announcement',
      title: '준비물 안내',
      message: `안녕하세요. 아래 준비물을 챙겨 주세요.\n· (준비물 입력)\n협조해 주셔서 감사합니다.`,
    },
    {
      id: 'holiday',
      label: '휴강·일정 안내',
      kind: 'notice',
      title: '휴강 일정 안내',
      message: `안녕하세요. 아래 일정에 ${placeWord}이(가) 쉽니다.\n· 휴강일: (날짜 입력)\n· 사유: (사유 입력)\n문의는 ${placeWord}으로 연락 부탁드립니다.`,
    },
    {
      id: 'event',
      label: '행사 안내',
      kind: 'announcement',
      title: '행사 안내장',
      message: `안녕하세요. ${placeWord} 행사 일정을 안내드립니다.\n· 일시: (날짜·시간)\n· 장소: (장소)\n많은 관심 부탁드립니다.`,
    },
    {
      id: 'tuition',
      label: `${feeWord} 안내`,
      kind: 'notice',
      title: `${feeWord} 납부 안내`,
      message: `안녕하세요. 이번 달 ${feeWord} 납부 안내드립니다.\n납부 기한 내 수납 부탁드리며, 문의는 ${placeWord}으로 연락 주세요.`,
    },
  ];
}

import { getPlaceLabel } from '@/core/industry/industryUi';

/** 업종 → 사업장/요금 용어 */
export function getNoticePlaceWords(industry: string | null | undefined): {
  placeWord: string;
  feeWord: string;
} {
  const placeWord = getPlaceLabel(industry);
  if (industry === 'daycare') return { placeWord, feeWord: '보육료' };
  if (industry === 'skin_clinic') return { placeWord, feeWord: '이용료' };
  return { placeWord, feeWord: '수강료' };
}
