/**
 * 특허 및 지식재산권(IP) 자산 관리 순수 도메인 엔진 (Pure Domain Engine)
 *
 * 1. 발명 신고 접수 및 공동 발명자 지분율(100%) 검증
 * 2. 사내 특허 심의위원회 워크플로 및 등급(A/B/C) 부여
 * 3. 직무발명 보상금(출원/등록) 지급 및 발명자별 지분율 배분 계산
 */

export interface PatentInventor {
  inventorId: string;
  inventorName: string;
  department: string;
  sharePercentage: number; // 발명 지분율 (%)
}

export type PatentReviewGrade = 'A' | 'B' | 'C';

export const PATENT_GRADE_DESCRIPTIONS: Record<PatentReviewGrade, string> = {
  A: '해외출원 추진 (PCT/해외 개별국 진입 추천 및 전략 특허)',
  B: '국내출원 추진 (국내 특허청 단독 출원 및 권리화)',
  C: '노하우 보관 (영업비밀 보호 및 사내 기술 자산화)',
};

export type PatentReviewStatus = 'review_pending' | 'approved' | 'rejected';
export type PatentLifecycleStatus =
  | 'draft'
  | 'review_pending'
  | 'review_completed'
  | 'applied'
  | 'registered'
  | 'rejected'
  | 'abandoned';

export interface PatentReview {
  reviewDate: string;
  reviewerName: string;
  status: PatentReviewStatus;
  grade?: PatentReviewGrade;
  reviewComments: string;
}

export interface InventionRewardItem {
  type: 'application' | 'registration';
  totalRewardAmount: number; // 총 지급 보상금
  isPaid: boolean;
  paidDate?: string;
  distributions: Array<{
    inventorId: string;
    inventorName: string;
    sharePercentage: number;
    allocatedAmount: number;
  }>;
}

export interface PatentAsset {
  id: string;
  inventionTitle: string; // 발명 명칭
  summary: string; // 발명 요약
  techField: string; // 기술 분야 (예: 신소재, AI/SW, 정밀기계)
  receiptDate: string; // 사내 접수일
  inventors: PatentInventor[];
  status: PatentLifecycleStatus;
  review?: PatentReview;
  applicationNumber?: string; // 출원 번호
  applicationDate?: string; // 출원 일자
  registrationNumber?: string; // 등록 번호
  registrationDate?: string; // 등록 일자
  applicationReward?: InventionRewardItem; // 출원 보상금
  registrationReward?: InventionRewardItem; // 등록 보상금
  /** 공보·출원 문서 URL */
  documentUrls?: string[];
  auditEvidence?: {
    recordedAt: string;
    actor: string;
    action: string;
  };
}

/**
 * 1. 공동 발명자 지분율 합계 100% 검증
 */
export function validateInventorShareSum(inventors: PatentInventor[]): {
  isValid: boolean;
  totalShare: number;
  errorMessage?: string;
} {
  if (!inventors || inventors.length === 0) {
    return {
      isValid: false,
      totalShare: 0,
      errorMessage: '최소 1명 이상의 발명자가 등록되어야 합니다.',
    };
  }

  // 지분율 합계 산출 (부동소수점 오차 보정: 소수점 2자리 반올림)
  const totalShare = Number(
    inventors.reduce((sum, inv) => sum + (Number(inv.sharePercentage) || 0), 0).toFixed(2)
  );

  if (totalShare !== 100) {
    return {
      isValid: false,
      totalShare,
      errorMessage: `발명자 지분율 합계는 반드시 100%이어야 합니다. (현재 합계: ${totalShare}%)`,
    };
  }

  return {
    isValid: true,
    totalShare: 100,
  };
}

/**
 * 2. 신규 발명 신고서 생성 (사내 접수)
 */
export function createPatentInventionDeclaration(params: {
  inventionTitle: string;
  summary: string;
  techField: string;
  inventors: PatentInventor[];
  receiptDate?: string;
}): { patent: PatentAsset | null; error?: string } {
  if (!params.inventionTitle || params.inventionTitle.trim().length < 2) {
    return { patent: null, error: '발명 명칭은 2자 이상 필수 입력해야 합니다.' };
  }
  if (!params.summary || params.summary.trim().length < 5) {
    return { patent: null, error: '발명 요약은 5자 이상 필수 입력해야 합니다.' };
  }

  const shareValidation = validateInventorShareSum(params.inventors);
  if (!shareValidation.isValid) {
    return { patent: null, error: shareValidation.errorMessage };
  }

  const nowIso = new Date(Date.now()).toISOString();
  const receiptDate = params.receiptDate || nowIso.slice(0, 10);

  const patent: PatentAsset = {
    id: crypto.randomUUID(),
    inventionTitle: params.inventionTitle.trim(),
    summary: params.summary.trim(),
    techField: params.techField.trim() || '기타',
    receiptDate,
    inventors: params.inventors,
    status: 'review_pending',
    auditEvidence: {
      recordedAt: nowIso,
      actor: params.inventors[0]?.inventorName || '대표 발명자',
      action: 'SUBMIT_INVENTION_DECLARATION',
    },
  };

  return { patent };
}

/**
 * 3. 사내 특허 심의위원회 워크플로 (A/B/C 등급 부여)
 */
export function conductPatentReview(
  patent: PatentAsset,
  reviewParams: {
    reviewerName: string;
    status: PatentReviewStatus;
    grade?: PatentReviewGrade;
    reviewComments: string;
    reviewDate?: string;
  }
): { updatedPatent: PatentAsset; error?: string } {
  const { status, grade, reviewComments, reviewerName } = reviewParams;

  if (status === 'approved' && !grade) {
    return {
      updatedPatent: patent,
      error: '심의 승인 시에는 반드시 심의 등급(A: 해외출원, B: 국내출원, C: 노하우보관)을 부여해야 합니다.',
    };
  }

  const reviewDate = reviewParams.reviewDate || new Date(Date.now()).toISOString().slice(0, 10);
  const updatedPatent: PatentAsset = {
    ...patent,
    status: status === 'approved' ? 'review_completed' : 'rejected',
    review: {
      reviewDate,
      reviewerName,
      status,
      grade,
      reviewComments: reviewComments.trim(),
    },
  };

  return { updatedPatent };
}

/**
 * 4. 지분율에 따른 발명자별 직무발명 보상금 분배액 계산
 */
export function calculateInventorRewardDistribution(
  totalRewardAmount: number,
  inventors: PatentInventor[]
): Array<{
  inventorId: string;
  inventorName: string;
  sharePercentage: number;
  allocatedAmount: number;
}> {
  if (totalRewardAmount <= 0) return [];

  let allocatedSum = 0;
  const count = inventors.length;

  return inventors.map((inv, idx) => {
    // 마지막 발명자는 절사/단수 차이를 보정하여 1원 단위까지 일치
    let amount = Math.floor((totalRewardAmount * inv.sharePercentage) / 100);
    if (idx === count - 1) {
      amount = totalRewardAmount - allocatedSum;
    } else {
      allocatedSum += amount;
    }

    return {
      inventorId: inv.inventorId,
      inventorName: inv.inventorName,
      sharePercentage: inv.sharePercentage,
      allocatedAmount: amount,
    };
  });
}

/**
 * 5. 직무발명 보상금(출원/등록) 지급 처리 및 기록 갱신
 */
export function recordInventionRewardPayment(
  patent: PatentAsset,
  rewardType: 'application' | 'registration',
  params: {
    totalRewardAmount: number;
    paidDate?: string;
  }
): PatentAsset {
  const distributions = calculateInventorRewardDistribution(
    params.totalRewardAmount,
    patent.inventors
  );
  const paidDate = params.paidDate || new Date(Date.now()).toISOString().slice(0, 10);

  const rewardItem: InventionRewardItem = {
    type: rewardType,
    totalRewardAmount: params.totalRewardAmount,
    isPaid: true,
    paidDate,
    distributions,
  };

  if (rewardType === 'application') {
    return {
      ...patent,
      applicationReward: rewardItem,
    };
  } else {
    return {
      ...patent,
      registrationReward: rewardItem,
    };
  }
}
