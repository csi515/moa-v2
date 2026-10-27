# 피아노·리테일 로드맵 조치 로그 (Phase 0~3)

> 기준: 피아노·리테일 개선 로드맵 Phase 0~3  
> 일자: 2026-10-22

## Phase 0 — 셸·내비 단일화
- `Layout`: 전용 모듈 + `/workspace` 경로에서 Refine Sidebar/`MobileBottomDock` 숨김
- `ModuleAppShell`: `omitHeader`/`nested`로 App Header와 이중 헤더 방지
- `moduleChromeRegistry` + `GenericIndustryShell`: Piano/Retail(및 타 전용 모듈) Sidebar·BottomNav 마운트
- `resolveModuleIndustry` / Core `sharedModuleBindings`: apparel·convenience → retail 모듈

## Phase 1 — 피아노 정합
- `passConfig`: 서버 권위 회차권 카피로 수정
- `practice-rooms` / `seat-rooms` / `spaces` → `PracticeRoomBookingView` 통일
- optional cap(`retention`, `shuttle`, `family-tree`, `supplies`) 설정 부가 + viewMap
- `resources`를 설정 부가「자료 카탈로그」로 재노출

## Phase 2 — 리테일 제품
- 직원 탭: `RetailStaffHubView` → Core `MemberList`
- `ledger_simple` → `LedgerClosingView` + 내비·설정 진입
- 점주/캐셔 권한·POS↔장부 분리 안내 카피

## Phase 3 — 파생 프리셋
- apparel/convenience: retail 모듈·플러그인 공유 (`SHARED_MODULE_BY_INDUSTRY`)
- `sizeColorSkuSupport` / `shiftHandoverCashCount` UI 반영
- readiness: `retail` → verified, apparel/convenience → isolated
