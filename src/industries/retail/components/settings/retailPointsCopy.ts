/** 포인트 설정 UI 문구 */
export const RETAIL_POINTS_COPY = {
  settingsTitle: '설정',
  settingsDescription: '사업장 설정',
  menuCustomerPoints: '고객/포인트',
  menuCustomerPointsHint: '포인트 사용·적립률을 설정합니다',
  pointsTitle: '포인트 적립',
  pointsDescription: '사업장 단위 포인트 설정입니다. 판매 적립 계산은 아직 연결되지 않습니다.',
  back: '뒤로',
  useLabel: '포인트 사용',
  useHint: '끄면 매장에서 포인트를 사용하지 않습니다.',
  earnLabel: '포인트 적립',
  earnHint: '켜면 구매 금액의 기본 적립률로 포인트를 쌓을 수 있습니다.',
  rateLabel: '기본 적립률',
  rateUnit: '%',
  rateHint: (min: number, max: number) =>
    `${min}% ~ ${max}% (소수 첫째 자리까지)`,
  pointValue: '1P = 1원',
  example: (rate: number, points: number) =>
    `예: 적립률 ${rate}% · 10,000원 구매 → ${points}P`,
  save: '저장',
  saving: '저장 중…',
  saved: '포인트 설정이 저장되었습니다.',
  saveError: '포인트 설정 저장에 실패했습니다.',
  noOrg: '사업장을 선택해 주세요',
  needAdmin: '원장·관리자만 포인트 설정을 변경할 수 있습니다.',
} as const;
