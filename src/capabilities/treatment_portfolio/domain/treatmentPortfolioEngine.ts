/**
 * 시술 스타일북 & 객단가 업셀링 갤러리 도메인 엔진 (Pure Functions)
 *
 * 적용 업종: 헤어샵(hair_salon), 바버샵(barber_shop), 네일샵(nail_salon), 피부관리실(skin_clinic), 펫미용
 *
 * 주요 기능:
 *  1. 카테고리별 시술 스타일 룩북 및 비포/애프터 비교 모델링
 *  2. 단백질 영양, 파츠, 앰플 등 추가 옵션 선택에 따른 실시간 객단가 업셀링 견적 자동 산출
 *  3. 시술 카테고리 및 디자이너별 필터링
 */

export type StyleCategory =
  | 'hair_cut'
  | 'hair_perm'
  | 'hair_color'
  | 'nail_art'
  | 'skin_care'
  | 'pet_groom';

export interface UpsellOption {
  id: string;
  name: string; // e.g. "시세이도 수분 단백질 클리닉", "스와로브스키 풀스톤 파츠"
  price: number;
  additionalMinutes: number;
}

export interface PortfolioStyleItem {
  id: string;
  title: string; // e.g. "시그니처 빌드펌 & 페이스라인 컷"
  category: StyleCategory;
  designerName: string;
  basePrice: number;
  estimatedMinutes: number;
  coverImageUrl?: string;
  beforeAfterPhotos?: {
    before: string;
    after: string;
  };
  upsellOptions: UpsellOption[];
  description: string;
}

export interface StyleQuotation {
  styleId: string;
  styleTitle: string;
  basePrice: number;
  selectedUpsellOptions: UpsellOption[];
  totalUpsellAmount: number;
  finalEstimatedPrice: number;
  totalEstimatedMinutes: number;
}

/**
 * 1. 선택한 스타일 및 업셀링 옵션 합산 견적 산출 (순수 함수)
 */
export function calculateStyleQuotation(
  style: PortfolioStyleItem,
  selectedOptionIds: readonly string[]
): StyleQuotation {
  const chosenOptions: UpsellOption[] = [];
  let totalUpsellAmount = 0;
  let additionalMinutes = 0;

  for (const opt of style.upsellOptions) {
    if (selectedOptionIds.includes(opt.id)) {
      chosenOptions.push(opt);
      totalUpsellAmount += opt.price;
      additionalMinutes += opt.additionalMinutes;
    }
  }

  const finalEstimatedPrice = style.basePrice + totalUpsellAmount;
  const totalEstimatedMinutes = style.estimatedMinutes + additionalMinutes;

  return {
    styleId: style.id,
    styleTitle: style.title,
    basePrice: style.basePrice,
    selectedUpsellOptions: chosenOptions,
    totalUpsellAmount,
    finalEstimatedPrice,
    totalEstimatedMinutes,
  };
}

/**
 * 2. 카테고리 및 검색어 기반 스타일 룩북 필터링 (순수 함수)
 */
export function filterPortfolio(
  items: readonly PortfolioStyleItem[],
  category?: string,
  searchQuery?: string
): PortfolioStyleItem[] {
  return items.filter((item) => {
    if (category && category !== 'ALL' && item.category !== category) {
      return false;
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.designerName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}
