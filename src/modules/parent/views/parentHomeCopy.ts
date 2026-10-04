import type { IndustryType } from '@/core/industry/types';
import { normalizeIndustryType } from '@/core/industry/types';
import {
  getCustomerLabel,
  getFeeLabel,
  getPlaceLabel,
  isAppointmentIndustry,
  isDaycareIndustry,
  isGymIndustry,
  isSkinClinicIndustry,
  showsTextbooksLink,
} from '@/core/industry/industryUi';

/**
 * 보호자 홈이 어떤 전용 화면을 쓸지.
 * 업종 id 문자열이 아니라 이미 있는 플래그로만 고른다.
 * 플래그 조합이 같으면 기존과 같은 컴포넌트(같은 데이터·같은 이동 탭)다.
 */
export type ParentHomeLayout = 'daycare' | 'gym' | 'skin' | 'pilates' | 'piano' | 'fallback';

export function parentHomeLayout(
  industryType: IndustryType | string | null | undefined,
): ParentHomeLayout {
  const industry = normalizeIndustryType(industryType);
  if (isDaycareIndustry(industry)) return 'daycare';
  if (isGymIndustry(industry)) return 'gym';
  if (isSkinClinicIndustry(industry)) return 'skin';
  if (isAppointmentIndustry(industry)) return 'pilates';
  if (showsTextbooksLink(industry)) return 'piano';
  return 'fallback';
}

export type ParentHomeFallbackSection = {
  id: 'attendance' | 'tuition';
  title: string;
};

export type ParentHomeFallbackCopy = {
  hint: string;
  attendanceLabel: string;
  feeActionLabel: string;
  /** 공통 홈에 그리는 섹션. 과제·연주회·교재는 넣지 않는다. */
  sections: readonly ParentHomeFallbackSection[];
};

/**
 * daycare/gym/pilates/skin/piano가 아닌 업종의 홈 문구.
 * 장소·고객·비용 이름은 매니페스트 라벨만 쓴다. 학원이라는 단어를 직접 박지 않는다.
 * showsTextbooksLink 업종은 피아노 홈이라 이 문구를 쓰지 않는다.
 */
export function parentHomeFallbackCopy(
  industryType: IndustryType | string | null | undefined,
): ParentHomeFallbackCopy | null {
  if (parentHomeLayout(industryType) !== 'fallback') return null;
  const industry = normalizeIndustryType(industryType);
  const place = getPlaceLabel(industry);
  const customer = getCustomerLabel(industry);
  const fee = getFeeLabel(industry);
  const attendanceLabel = '출결';
  return {
    hint: `${place} ${customer}의 출결·${fee}·안내는 아래 메뉴에서 확인할 수 있습니다.`,
    attendanceLabel,
    feeActionLabel: fee,
    sections: [
      { id: 'attendance', title: attendanceLabel },
      { id: 'tuition', title: fee },
    ],
  };
}
