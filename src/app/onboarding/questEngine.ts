/**
 * Business Onboarding Quest Engine (Getting Started)
 *
 * 사업주가 사업장에 처음 들어왔을 때 감동을 느낄 수 있도록
 * 업종 프리셋 및 결합된 핵심 Capability에 맞춰
 * 최적의 3~4개 첫걸음 퀘스트를 동적으로 산출하고 진척도를 관리한다.
 */

import { getIndustryPreset } from '@/app/presets/presetRegistry';
import type { IndustryPresetDefinition } from '@/core/presets/types';

export type QuestIconType =
  | 'user'
  | 'ticket'
  | 'calendar'
  | 'building'
  | 'package'
  | 'clock'
  | 'file'
  | 'sparkles';

export interface QuestItem {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  targetTab: string;
  icon: QuestIconType;
  actionText: string;
  helpTip?: string;
}

export interface QuestProgressState {
  completedQuestIds: string[];
  totalQuests: number;
  completedCount: number;
  progressPercent: number;
  isAllCompleted: boolean;
}

/**
 * 업종별 커스텀 퀘스트 프리셋 (대표 6대 업종)
 */
const VERTICAL_QUEST_PRESETS: Record<string, Omit<QuestItem, 'stepNumber'>[]> = {
  // 필라테스 & 요가
  pilates: [
    {
      id: 'register_first_member',
      title: '첫 회원 등록하기',
      description: '회원의 연락처와 수강 목적을 등록하여 관리를 시작합니다.',
      targetTab: 'students',
      icon: 'user',
      actionText: '회원 등록 바로가기',
      helpTip: '회원 등록 시 수강 목적(체형 교정, 재활 등)을 기록해두면 맞춤 수업에 유용합니다.',
    },
    {
      id: 'create_lesson_pass',
      title: '레슨 이용권 만들기',
      description: '개인 1:1 레슨권 및 그룹 수강권을 생성하여 회원에게 부여합니다.',
      targetTab: 'passes',
      icon: 'ticket',
      actionText: '이용권 생성 바로가기',
      helpTip: '횟수제(10회/20회) 또는 기간제(1개월 무제한) 이용권을 자유롭게 설정할 수 있습니다.',
    },
    {
      id: 'invite_instructor',
      title: '강사 초대 및 시간표 배정',
      description: '함께 수업을 진행할 전담 강사를 초대하고 담당 수업을 배정합니다.',
      targetTab: 'shifts',
      icon: 'calendar',
      actionText: '강사/근무 관리 바로가기',
      helpTip: '강사 계정에 수업 배정 및 정산 권한을 안전하게 부여할 수 있습니다.',
    },
    {
      id: 'open_booking_slot',
      title: '첫 수업 예약 오픈',
      description: '회원이 예약할 수 있는 수업 스케줄을 캘린더에 오픈합니다.',
      targetTab: 'bookings',
      icon: 'sparkles',
      actionText: '예약 캘린더 바로가기',
      helpTip: '정원과 룸을 설정하면 회원이 모바일로 실시간 예약할 수 있습니다.',
    },
  ],

  // 스터디카페 & 독서실
  study_cafe: [
    {
      id: 'setup_seat_room',
      title: '좌석 및 사물함 배치도 확인',
      description: '운영 중인 개방형 좌석, 1인 집중실, 사물함의 번호와 배치를 등록합니다.',
      targetTab: 'seat-rooms',
      icon: 'building',
      actionText: '좌석/사물함 설정',
      helpTip: '좌석 상태(사용중/비어있음/정비중)를 실시간으로 모니터링할 수 있습니다.',
    },
    {
      id: 'create_time_pass',
      title: '시간제 요금제 등록',
      description: '당일 시간권, 정기권, 시간 충전권 등 매장의 요금제를 등록합니다.',
      targetTab: 'passes',
      icon: 'clock',
      actionText: '요금제 등록 바로가기',
      helpTip: '시간 초과 시 자동 분당 추가 과금 규칙을 미리 설정해 둘 수 있습니다.',
    },
    {
      id: 'configure_kiosk_access',
      title: '출입 키오스크 연동',
      description: '회원 출입을 위한 바코드/PIN 키패드 출입 관리를 활성화합니다.',
      targetTab: 'attendance',
      icon: 'sparkles',
      actionText: '출입 관리 바로가기',
      helpTip: '태블릿이나 전용 키오스크 화면에서 회원이 직접 전화번호로 입실할 수 있습니다.',
    },
  ],

  // 피아노 & 음악학원 — wave-1 E2E 딥링크: 학생 → 시간표 → 출결 → 수납
  piano: [
    {
      id: 'register_first_student',
      title: '첫 원생 등록하기',
      description: '원생의 기본 정보와 보호자 연락처, 레슨 희망 곡을 등록합니다.',
      targetTab: 'students',
      icon: 'user',
      actionText: '원생 등록 바로가기',
      helpTip: '보호자 연락처를 등록하면 학부모 안심 등하원 알림 및 청구서 발송이 가능합니다.',
    },
    {
      id: 'create_regular_class',
      title: '레슨 시간표에 원생 배치',
      description: '정규 레슨 요일·시간을 지정하고 원생을 시간표 칸에 배치합니다.',
      targetTab: 'timetable',
      icon: 'calendar',
      actionText: '시간표 바로가기',
      helpTip: '1:1 개인 레슨 시간표와 그룹 이론 수업 시간을 구분하여 편성할 수 있습니다.',
    },
    {
      id: 'check_first_attendance',
      title: '오늘 출결 확인하기',
      description: '시간표에 배치된 원생의 등원·결석을 처리합니다.',
      targetTab: 'attendance',
      icon: 'clock',
      actionText: '출결 바로가기',
      helpTip: '등원 처리 시 학부모 알림을 보낼 수 있습니다.',
    },
    {
      id: 'issue_first_invoice',
      title: '첫 수강료 수납 처리',
      description: '이번 달 교습비 청구서를 확인하고 입금·납부완료를 처리합니다.',
      targetTab: 'tuition',
      icon: 'ticket',
      actionText: '수납 바로가기',
      helpTip: '청구서 생성 시 교재비나 콩쿠르 참가비 항목을 함께 추가할 수 있습니다.',
    },
  ],

  // 소매점 & 편집샵
  retail: [
    {
      id: 'register_first_product',
      title: '첫 판매 상품 등록하기',
      description: '판매할 상품의 이름, 판매가, 매입원가, 바코드를 등록합니다.',
      targetTab: 'inventory',
      icon: 'package',
      actionText: '상품 등록 바로가기',
      helpTip: '바코드를 등록하면 스마트폰 카메라나 바코드 스캐너로 즉시 검색할 수 있습니다.',
    },
    {
      id: 'receive_initial_stock',
      title: '초기 재고 입고 확인',
      description: '매장에 진열된 상품의 현재 수량을 입력하여 실재고를 맞춥니다.',
      targetTab: 'inventory',
      icon: 'building',
      actionText: '재고 입고 바로가기',
      helpTip: '안전재고 수량을 설정해두면 재고 소진 임박 시 자동으로 알림을 받습니다.',
    },
    {
      id: 'open_pos_register',
      title: 'POS 계산대 열기',
      description: '손님 결제와 영수증 발행을 위한 판매 포스 화면을 점검합니다.',
      targetTab: 'sales',
      icon: 'ticket',
      actionText: '판매 POS 바로가기',
      helpTip: '현금, 카드, 포인트 복합 결제를 간편하게 처리할 수 있습니다.',
    },
  ],

  // 피부관리 & 에스테틱
  skin: [
    {
      id: 'register_first_client',
      title: '첫 고객 등록하기',
      description: '고객의 피부 타입, 알레르기 주의사항, 연락처를 등록합니다.',
      targetTab: 'students',
      icon: 'user',
      actionText: '고객 등록 바로가기',
      helpTip: '피부 민감도나 복용 약물 정보를 메모해두면 안전한 케어가 가능합니다.',
    },
    {
      id: 'create_treatment_chart',
      title: '피부 시술 맞춤 차트 작성',
      description: '관리 프로그램(수분, 미백, 리프팅 등) 및 회차별 관리 계획을 수립합니다.',
      targetTab: 'treatment-chart',
      icon: 'file',
      actionText: '시술 차트 바로가기',
      helpTip: '관리 전/후 사진과 사용된 앰플을 회차별로 기록할 수 있습니다.',
    },
    {
      id: 'assign_therapist_shift',
      title: '전담 테라피스트 배정',
      description: '베드 룸 배정과 함께 고객을 담당할 관리사를 지정합니다.',
      targetTab: 'shifts',
      icon: 'calendar',
      actionText: '근무/배정 바로가기',
      helpTip: '관리사별 인센티브와 일일 관리 배정 현황을 한눈에 파악합니다.',
    },
  ],

  // 카페 & 음식점
  restaurant_cafe: [
    {
      id: 'setup_table_layout',
      title: '테이블 및 좌석 배치도 설정',
      description: '매장의 홀 테이블 번호와 룸 구역을 설정합니다.',
      targetTab: 'seat-rooms',
      icon: 'building',
      actionText: '테이블 배치 설정',
      helpTip: '테이블별 현재 착석 시간과 주문 현황이 실시간으로 동기화됩니다.',
    },
    {
      id: 'register_menu_recipe',
      title: '메뉴 및 레시피 원가 등록',
      description: '시그니처 메뉴와 원재료 BOM(원가 소모)을 등록합니다.',
      targetTab: 'recipes',
      icon: 'package',
      actionText: '레시피/메뉴 바로가기',
      helpTip: '메뉴 판매 시 식자재가 자동으로 차감되어 실질 마진을 파악할 수 있습니다.',
    },
    {
      id: 'connect_kitchen_display',
      title: '주방 주문 모니터(KDS) 연동',
      description: '주방에서 주문을 접수하고 조리 완료를 알리는 KDS 화면을 실행합니다.',
      targetTab: 'table-order-kds',
      icon: 'sparkles',
      actionText: '주방 KDS 바로가기',
      helpTip: '조리 순서와 테이블별 대기 시간을 주방 화면에서 실시간으로 확인합니다.',
    },
  ],
};

/**
 * 44개 업종 프리셋 선언 및 결합된 Capability로부터
 * 동적으로 맞춤형 첫걸음 퀘스트를 생성하는 함수
 */
export function getPresetQuests(
  industryType?: string | null,
  customerWord: string = '고객',
  placeWord: string = '사업장'
): QuestItem[] {
  const normKey = (industryType || '').toLowerCase().trim();

  // 1. 대표 수기 프리셋이 있는 경우 1순위 사용 (맞춤 용어 실시간 치환)
  if (VERTICAL_QUEST_PRESETS[normKey]) {
    return VERTICAL_QUEST_PRESETS[normKey].map((q, idx) => ({
      ...q,
      stepNumber: idx + 1,
      title: q.title.replace(/회원|원생|고객/g, customerWord),
      description: q.description.replace(/회원|원생|고객/g, customerWord),
      actionText: q.actionText.replace(/회원|원생|고객/g, customerWord),
      helpTip: q.helpTip ? q.helpTip.replace(/회원|원생|고객/g, customerWord) : undefined,
    }));
  }

  // 2. 선언적 프리셋 정의 조회
  const preset: IndustryPresetDefinition | undefined = getIndustryPreset(normKey);
  const caps = preset?.capabilities ?? [];

  const quests: Omit<QuestItem, 'stepNumber'>[] = [];

  // [1단계] 첫 고객/원생 등록
  quests.push({
    id: 'register_first_entity',
    title: `첫 ${customerWord} 등록하기`,
    description: `${placeWord}을 이용할 첫 ${customerWord}의 연락처와 기본 정보를 등록합니다.`,
    targetTab: 'students',
    icon: 'user',
    actionText: `${customerWord} 등록하기`,
    helpTip: `등록된 ${customerWord} 정보를 바탕으로 모든 예약, 이용권, 수납이 연결됩니다.`,
  });

  // [2단계] 핵심 자원 또는 이용권 설정
  if (caps.includes('passes') || caps.includes('billing_invoicing')) {
    quests.push({
      id: 'setup_pass_or_billing',
      title: '이용권 및 요금제 등록',
      description: `${placeWord}에서 사용할 수강권, 이용권, 또는 정기 청구 기준을 등록합니다.`,
      targetTab: 'passes',
      icon: 'ticket',
      actionText: '이용권 등록하기',
      helpTip: '횟수제, 기간제 등 매장 정책에 맞는 다양한 요금제를 자유롭게 구성하세요.',
    });
  } else if (caps.includes('seat_room') || caps.includes('booking')) {
    quests.push({
      id: 'setup_space_resource',
      title: '공간 및 시설 배치 점검',
      description: '운영할 룸, 좌석, 시설의 위치와 수용 인원을 등록합니다.',
      targetTab: 'seat-rooms',
      icon: 'building',
      actionText: '시설 설정하기',
      helpTip: '시설별 운영 시간과 예약 단위를 설정할 수 있습니다.',
    });
  } else if (caps.includes('inventory')) {
    quests.push({
      id: 'setup_inventory_stock',
      title: '판매 상품 및 초기 재고 등록',
      description: '취급하는 상품 품목과 매장 재고 수량을 등록합니다.',
      targetTab: 'inventory',
      icon: 'package',
      actionText: '재고 등록하기',
      helpTip: '바코드와 원가를 등록하면 정확한 매입/매출 마진을 자동 추적합니다.',
    });
  } else {
    quests.push({
      id: 'setup_primary_service',
      title: `${placeWord} 기본 운영 기준 설정`,
      description: `${placeWord}의 운영 시간과 주요 서비스 항목을 설정합니다.`,
      targetTab: 'settings',
      icon: 'clock',
      actionText: '설정 바로가기',
      helpTip: '사업장 운영에 필요한 기본 규칙을 점검합니다.',
    });
  }

  // [3단계] 직원/파트너 또는 전문 업무 설정
  if (caps.includes('shift_schedule') || caps.includes('instructor_match')) {
    quests.push({
      id: 'invite_staff_members',
      title: '직원/강사 초대 및 근무표 배정',
      description: '함께 일할 직원이나 강사를 초대하고 근무 스케줄을 배정합니다.',
      targetTab: 'shifts',
      icon: 'calendar',
      actionText: '직원/근무 관리',
      helpTip: '직원별 역할 권한을 세분화하여 안전하게 매장을 관리하세요.',
    });
  } else if (caps.includes('treatment_chart') || caps.includes('curriculum_progress')) {
    quests.push({
      id: 'setup_record_chart',
      title: '전문 관리 차트 및 진도표 개설',
      description: `${customerWord}별 맞춤 이력과 진도 기록 양식을 확인합니다.`,
      targetTab: 'treatment-chart',
      icon: 'file',
      actionText: '차트/진도 관리',
      helpTip: '체계적인 맞춤 기록으로 고객 만족도를 높일 수 있습니다.',
    });
  } else if (caps.includes('attendance')) {
    quests.push({
      id: 'setup_attendance_check',
      title: '출입 및 출결 키패드 연동',
      description: '전화번호 뒷자리 또는 PIN으로 즉시 출결을 체크하도록 준비합니다.',
      targetTab: 'attendance',
      icon: 'sparkles',
      actionText: '출결 관리 바로가기',
      helpTip: '키오스크 모드를 켜면 고객이 직접 화면에서 출결을 체크합니다.',
    });
  } else {
    quests.push({
      id: 'explore_operations',
      title: `${placeWord} 전용 도구 살펴보기`,
      description: '결합된 맞춤 도구들을 확인하고 바로 실무에 적용해보세요.',
      targetTab: 'settings',
      icon: 'sparkles',
      actionText: '도구 둘러보기',
      helpTip: '언제든지 필요한 기능을 켜고 끌 수 있습니다.',
    });
  }

  // 번호 부여
  return quests.map((q, idx) => ({
    ...q,
    stepNumber: idx + 1,
  }));
}

/**
 * 퀘스트 완료 진척도 계산 순수 함수
 */
export function calculateQuestProgress(
  quests: QuestItem[],
  completedQuestIds: string[]
): QuestProgressState {
  const totalQuests = quests.length;
  const completedCount = quests.filter((q) => completedQuestIds.includes(q.id)).length;
  const progressPercent = totalQuests > 0 ? Math.round((completedCount / totalQuests) * 100) : 0;
  const isAllCompleted = totalQuests > 0 && completedCount === totalQuests;

  return {
    completedQuestIds,
    totalQuests,
    completedCount,
    progressPercent,
    isAllCompleted,
  };
}

/**
 * 로컬스토리지 키 생성
 */
export function getQuestStorageKey(organizationId?: string): string {
  return `moa_onboarding_quests_${organizationId || 'default'}`;
}
