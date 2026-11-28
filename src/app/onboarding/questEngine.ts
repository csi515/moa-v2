/**
 * Business Onboarding Quest Engine (Getting Started)
 *
 * 업종 프리셋 JSON(`verticalQuests.json`) 및 Capability 조합으로
 * 첫걸음 퀘스트를 동적으로 산출한다.
 */

import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { getVerticalQuestTemplates } from '@/app/presets/presetDataLoader';
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

const VALID_ICONS = new Set<QuestIconType>([
  'user',
  'ticket',
  'calendar',
  'building',
  'package',
  'clock',
  'file',
  'sparkles',
]);

function asQuestIcon(raw: string | undefined): QuestIconType {
  if (raw && VALID_ICONS.has(raw as QuestIconType)) return raw as QuestIconType;
  return 'sparkles';
}

function applyCustomerWord(
  quests: Omit<QuestItem, 'stepNumber'>[],
  customerWord: string
): QuestItem[] {
  return quests.map((q, idx) => ({
    ...q,
    stepNumber: idx + 1,
    title: q.title.replace(/회원|원생|고객/g, customerWord),
    description: q.description.replace(/회원|원생|고객/g, customerWord),
    actionText: q.actionText.replace(/회원|원생|고객/g, customerWord),
    helpTip: q.helpTip
      ? q.helpTip.replace(/회원|원생|고객/g, customerWord)
      : undefined,
  }));
}

/**
 * 업종별 첫걸음 퀘스트.
 * 1) JSON verticalQuests  2) Capability 휴리스틱
 */
export function getPresetQuests(
  industryType?: string | null,
  customerWord: string = '고객',
  placeWord: string = '사업장'
): QuestItem[] {
  const normKey = (industryType || '').toLowerCase().trim();
  const templates = getVerticalQuestTemplates();

  if (templates[normKey]) {
    const mapped = templates[normKey].map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      targetTab: q.targetTab,
      icon: asQuestIcon(q.icon),
      actionText: q.actionText,
      helpTip: q.helpTip,
    }));
    return applyCustomerWord(mapped, customerWord);
  }

  const preset: IndustryPresetDefinition | undefined = getIndustryPreset(normKey);
  const caps = preset?.capabilities ?? [];
  const quests: Omit<QuestItem, 'stepNumber'>[] = [];

  quests.push({
    id: 'register_first_entity',
    title: `첫 ${customerWord} 등록하기`,
    description: `${placeWord}을 이용할 첫 ${customerWord}의 연락처와 기본 정보를 등록합니다.`,
    targetTab: 'students',
    icon: 'user',
    actionText: `${customerWord} 등록하기`,
    helpTip: `등록된 ${customerWord} 정보를 바탕으로 모든 예약, 이용권, 수납이 연결됩니다.`,
  });

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
      targetTab: 'retail',
      icon: 'package',
      actionText: '상품 등록하기',
      helpTip: '사양과 원가를 등록하면 정확한 매입/매출 마진을 추적하기 쉽습니다.',
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

  return quests.map((q, idx) => ({
    ...q,
    stepNumber: idx + 1,
  }));
}

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

export function getQuestStorageKey(organizationId?: string): string {
  return `moa_onboarding_quests_${organizationId || 'default'}`;
}
