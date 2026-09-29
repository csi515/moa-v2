import {
  POINT_TRANSACTION_TYPE_LABELS,
  type PointTransactionType,
} from '@/capabilities/commerce';

/** Retail 사업자 고객·포인트 조회 문구 */
export const RETAIL_CUSTOMER_COPY = {
  listTitle: '고객',
  listDescription: '고객을 선택해 상세·포인트를 확인합니다',
  searchPlaceholder: '고객명·전화 검색',
  noOrg: '사업장을 선택해 주세요',
  loadError: '고객을 불러오지 못했습니다',
  emptyTitle: '등록된 고객이 없습니다',
  emptyDescription: '판매 시 고객을 등록하면 여기에 표시됩니다',
  emptyFilterTitle: '검색 결과가 없습니다',
  emptyFilterDescription: '이름이나 전화번호를 바꿔 보세요',
  phoneNone: '전화 없음',
  balanceLabel: '포인트',
  pointsUnit: 'P',

  detailTitle: '고객 상세',
  detailBack: '목록',
  detailName: '이름',
  detailPhone: '전화번호',
  detailPointsMenu: '포인트 전체 보기',
  detailPointsHint: '적립·사용 내역을 확인합니다',
  detailLoadError: '고객 정보를 불러오지 못했습니다',
  detailCoreSection: '기본 정보',
  detailPurchaseSection: '구매',
  detailPurchaseCount: '총 구매 건수',
  detailLatestAmount: '최근 구매 금액',
  detailRecentPurchases: '최근 구매',
  detailPurchaseEmpty: '구매 내역이 없습니다',
  detailPurchaseCountUnit: '건',
  detailPointsSection: '포인트',
  detailPointsBalance: '현재 포인트',
  detailRecentPoints: '최근 포인트 거래',
  detailPointsEmpty: '포인트 거래가 없습니다',
  detailSaleOpen: '판매 상세',
  detailLoading: '불러오는 중…',

  pointsTitle: '포인트',
  pointsBack: '고객 상세',
  pointsBalance: '현재 포인트',
  pointsLoadError: '포인트 내역을 불러오지 못했습니다',
  pointsEmptyTitle: '포인트 내역이 없습니다',
  pointsEmptyDescription: '적립·사용 내역이 생기면 여기에 표시됩니다',
  pointsEmptyFilterTitle: '해당 유형의 내역이 없습니다',
  pointsEmptyFilterDescription: '필터를 바꿔 보세요',
  pointsDate: '날짜',
  pointsAmount: '금액',
  pointsType: '유형',
  pointsSale: '관련 판매',
  pointsSaleNone: '-',
  pointsSaleOpen: '판매 보기',
  pointsBalanceAfter: '거래 후 잔액',
  filterAll: '전체',
  filterEarn: POINT_TRANSACTION_TYPE_LABELS.earn,
  filterRedeem: POINT_TRANSACTION_TYPE_LABELS.redeem,
} as const;

export type CustomerPointsTypeFilter = 'ALL' | Extract<PointTransactionType, 'earn' | 'redeem'>;

export const CUSTOMER_POINTS_TYPE_TABS: Array<{
  id: CustomerPointsTypeFilter;
  label: string;
}> = [
  { id: 'ALL', label: RETAIL_CUSTOMER_COPY.filterAll },
  { id: 'earn', label: RETAIL_CUSTOMER_COPY.filterEarn },
  { id: 'redeem', label: RETAIL_CUSTOMER_COPY.filterRedeem },
];
