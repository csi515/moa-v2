/**
 * 앱 사용법 안내 공통 카피.
 * Wizard = 설정 시드, Quest = 첫 업무, Empty = 화면 내 30초 가이드.
 */

import { getIndustryCategoryForType } from '@/core/industry/types';
import { isRetailIndustry } from '@/core/industry/industryUi';

export const EDUCATION_ROLE_BLURB = {
  wizard: '사업장 운영에 필요한 기본 설정을 한 번에 채웁니다.',
  quest: '첫 고객·일정·출결·수납처럼 바로 쓸 업무를 순서대로 안내합니다.',
  emptyGuide: '이 화면이 비어 있을 때 30초 안에 시작하는 방법을 보여 줍니다.',
  featureHelp: '현재 화면의 기능 설명과 사용 팁을 엽니다.',
} as const;

export type PostCreateNextStep = {
  id: string;
  title: string;
  detail: string;
};

/** 사업장 개설 직후 “다음에 할 일” (진입 전 안내) — 업종 id 직접 비교 없이 category/헬퍼 사용 */
export function getPostCreateNextSteps(
  industryType: string,
  customerWord = '고객'
): PostCreateNextStep[] {
  const category = getIndustryCategoryForType(industryType);

  if (isRetailIndustry(industryType) || category === 'food') {
    return [
      { id: 'product', title: '판매 상품 등록', detail: '이름·가격·바코드를 등록합니다.' },
      { id: 'stock', title: '초기 재고 맞추기', detail: '매장에 있는 수량을 입력합니다.' },
      { id: 'pos', title: 'POS 계산대 점검', detail: '결제 화면을 한 번 열어봅니다.' },
    ];
  }

  if (category === 'education' || category === 'lesson') {
    return [
      { id: 'student', title: `첫 ${customerWord} 등록`, detail: '연락처와 기본 정보를 등록합니다.' },
      { id: 'timetable', title: '레슨 시간표 배치', detail: '요일·시간에 일정을 넣습니다.' },
      { id: 'tuition', title: '수강료 수납 확인', detail: '청구서를 만들고 입금을 처리합니다.' },
    ];
  }

  if (category === 'fitness') {
    return [
      { id: 'member', title: `첫 ${customerWord} 등록`, detail: '연락처와 수강 목적을 남깁니다.' },
      { id: 'pass', title: '이용권 만들기', detail: '횟수제·기간제 요금제를 등록합니다.' },
      { id: 'booking', title: '수업 예약 오픈', detail: '캘린더에 첫 슬롯을 엽니다.' },
    ];
  }

  return [
    { id: 'entity', title: `첫 ${customerWord} 등록`, detail: '기본 정보로 장부를 시작합니다.' },
    { id: 'setup', title: '이용권·요금·시설 점검', detail: '업종에 맞는 첫 설정을 확인합니다.' },
    { id: 'team', title: '직원 초대(선택)', detail: '함께 쓸 동료를 초대합니다.' },
  ];
}

export const STAFF_INVITE_AFTERCARE = {
  title: '합류 후 다음에 할 일',
  steps: [
    '워크스페이스에 들어가면 배정된 메뉴만 보입니다.',
    '출결·고객·예약 등 권한에 맞는 업무부터 확인하세요.',
    '설정 변경이 필요하면 사업주(관리자)에게 요청하세요.',
  ],
} as const;
