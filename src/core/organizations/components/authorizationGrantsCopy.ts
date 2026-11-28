export const AUTHORIZATION_GRANTS_COPY = {
  title: '담당 범위 할당',
  description:
    '직원별로 지점·고객 등 스코프를 지정합니다. 미할당 시 기본은 전 범위이며, 조직 설정에서 fail-closed를 켤 수 있습니다.',
  member: '구성원',
  permission: '권한',
  scopeType: '범위 유형',
  scopeId: '범위 ID',
  add: '할당 추가',
  remove: '해제',
  empty: '할당된 범위가 없습니다.',
  loadError: '권한 할당을 불러오지 못했습니다.',
  saved: '권한 할당을 저장했습니다.',
  removed: '권한 할당을 해제했습니다.',
  selectMember: '구성원을 선택하세요',
  orgWide: '조직 전체',
  location: '지점',
  customer: '고객',
  resource: '자원',
  scopeFailClosedLabel: '스코프 미배정 시 차단 (fail-closed)',
  scopeFailClosedHint:
    '켜면 지점/고객 스코프에 명시 배정이 없는 직원은 해당 범위 데이터에 접근할 수 없습니다.',
} as const;
