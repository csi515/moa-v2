# 사무용품 월별 취합 (`office_supply_request`) Resolution

## MVP 범위 (구현됨)

- Capability id: `office_supply_request`
- 위임 권한: `office_supply_request:manage` (카탈로그·캠페인·취합)
- 임직원: org 멤버십만으로 본인 신청 (마감 전)
- 데이터: `office_supply_catalog_items`, `office_supply_campaigns`, `office_supply_request_lines`
- 마감: `status=closed` 또는 `now() >= deadline_at` → UI 잠금 + `upsert_office_supply_request_lines` 거부
- 부서 귀속: `department_members` 1순위 부서
- 취합: 부서×품목 / 품목 합계 + CSV 클립보드
- 프리셋: `personal_plant_ops` 기본 활성, 총무 역할에 manage 키
- 라우트: `/workspace/office-supply`, `/manage`, `/catalog`

## 6단계 승인 요약

`supply_restock`(안전재고·간이 PR)과 생명주기가 달라 신규 Capability로 분리. UX/권한은 `meal_survey` 패턴 차용.

## Phase 2 백로그

- 품목별 1인 상한 / 부서 예산 한도
- 마감 D-1 인앱 알림
- `ordered` / `received` 및 부서 배부 체크리스트
- 품절·대체품 메모
- 부서장 선승인
- `supply_restock` PO·재고 연동
- 전월 신청 복제
