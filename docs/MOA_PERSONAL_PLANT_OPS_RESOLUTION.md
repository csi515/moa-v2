# personal_plant_ops 로드맵 조치 로그 (Phase 0~3)

> 일자: 2026-10-22

## Phase 0 — 신뢰성
- `GenericIndustryShell` defaultViewMap: `approval-workflow` / `approvals` → `ApprovalWorkflowManagementView`
- `CompanyAppLauncherDashboard`: 하드코딩 결재·가짜 statusText 제거, `approval_requests` pending 실조회

## Phase 1 — 프리셋↔런처
- 타일 `requiredAnyCapability` 게이트 + preset `hidden_capabilities` 반영
- 셔틀·feedbacks 타일 제거(미선언 cap)
- 결재·현장 자재·노경 건의 타일 추가
- `companyAppLauncherGate.test.ts`

## Phase 2 — 기업형 셸
- `CORPORATE_CHROME_PRESETS` + `shouldUseModuleChrome`로 Refine 독 숨김
- Generic 경로 `ModuleAppShell` + `filteredSections` 사이드·하단 내비
- 인트라넷 허브 `variant=hub`(앱 목록만)

## Phase 3 — 깊이·readiness
- `task_pipeline`: 빈 DB 샘플 시드 금지
- 사고 상세 CAPA → pipelines / approvals 딥링크
- inventory plant 카피「현장 자재」
- `readinessLevel: isolated`
