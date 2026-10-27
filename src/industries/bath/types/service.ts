/** 인적 서비스 분류. 시간·가격은 별도 컬럼. */
export const BATH_SERVICE_CATEGORIES = ['scrub', 'massage', 'other'] as const;
export type BathServiceCategory = (typeof BATH_SERVICE_CATEGORIES)[number];

export const BATH_SERVICE_CATEGORY_LABELS: Record<BathServiceCategory, string> = {
  scrub: '세신',
  massage: '마사지',
  other: '기타',
};

export type BathService = {
  id: string;
  organizationId: string;
  name: string;
  category: BathServiceCategory;
  durationMinutes: number;
  basePrice: number;
  requiresStaff: boolean;
  requiresResource: boolean;
  /** 판매 SKU가 있을 때만. 서비스 자체가 Product가 아님. */
  productId?: string;
  resourceIds: string[];
  staffIds: string[];
  active: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BathServiceWriteInput = {
  name: string;
  category: BathServiceCategory;
  durationMinutes: number;
  basePrice?: number;
  requiresStaff?: boolean;
  requiresResource?: boolean;
  productId?: string | null;
  active?: boolean;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

export type BathServiceListQuery = {
  active?: boolean;
  category?: BathServiceCategory;
};

/** Customer → Service → Resource → Staff → Time Slot 의 슬롯 골격 */
export type BathServiceTimeSlot = {
  serviceId: string;
  resourceId?: string;
  staffId?: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
};
