# Phase 2 구현 스펙 — 프리셋·온보딩 데이터화

> **상태:** 앱 구현 완료 (단기 JSON 로더) · 중기 DB 테이블은 후속  
> **상위 로드맵:** [MOA_AGNOSTIC_ERP_ROADMAP.md](./MOA_AGNOSTIC_ERP_ROADMAP.md)  
> **헌법:** [rules/7_AGNOSTIC_CONFIGURATION.md](./rules/7_AGNOSTIC_CONFIGURATION.md) · [6_PRESET_LIFECYCLE](./rules/6_PRESET_LIFECYCLE.md)

---

## 1. 목적

- 프리셋/퀘스트/시드 확장을 **버전드 데이터(JSON)** 로 주입
- `CreateOrganizationWizard` ↔ `QuickSetupPage` 시드 **패리티**
- 레거시 `AcademyOpenQuestWidget` → `questEngine` / `GettingStartedQuestWidget` 단일 경로

---

## 2. 단기 산출물

| 경로 | 역할 |
| :--- | :--- |
| `src/app/presets/data/verticalQuests.json` | 업종별 첫걸음 퀘스트 템플릿 |
| `src/app/presets/data/seedPacks.json` | 기본 분류·allocation/tax 정책 스텁 |
| `src/app/presets/data/presets/*.json` | JSON 전용 프리셋 (동일 id 시 TS 덮어씀) |
| `src/app/presets/presetDataLoader.ts` | 로더·시드 병합 |
| `src/app/onboarding/organizationPresetSeed.ts` | `create_organization_with_preset` + field_definitions + 분류 시드 |

### 병합 규칙

1. TS 카테고리 프리셋 로드 → JSON 프리셋 **덮어쓰기**
2. 시드 팩 정책 키는 org settings에 **없을 때만** 주입 (멱등)
3. Wizard 재실행/시드 재호출은 unique·soft-delete 규칙으로 덮어쓰지 않음

---

## 3. 전용 모듈 예외 목록

다음 업종은 **전용 `src/industries/*` 크롬**을 쓰지만, 온보딩 시드는 공통 `organizationPresetSeed`를 사용한다.

| 프리셋 id | 모듈 | 비고 |
| :--- | :--- | :--- |
| `piano` | piano | Director 홈은 GettingStartedQuestWidget만 사용 |
| `retail` | retail | seedPack 기본 분류 시드 |
| `apparel` | retail (공유) | retail 모듈 파생 |
| `convenience` | retail (공유) | retail 모듈 파생 |
| `daycare` | daycare | 전용 care UI |
| `bath` / `sauna_jjimjilbang` | bath | 스키마 특화 잔존 |

기존 Capability만 쓰는 수직은 JSON 프리셋(+카탈로그 id)만으로 온보딩 가능해야 한다.  
예: `craft_workshop_data` (`hiddenInMoa: true`, 검증용).

---

## 4. 게이트

- [x] Wizard가 `create_organization_with_preset` 경로 사용
- [x] QuickSetup과 동일 시드 헬퍼 공유
- [x] 퀘스트 JSON SSOT + questEngine 로드
- [x] AcademyOpenQuestWidget 폐기(shim) · 피아노 홈 중복 제거
- [x] 전용 모듈 예외 문서화
- [ ] 중기: `platform.industry_presets` 테이블 + 관리자 동기화

---

## 5. 검증

```bash
npx tsx src/app/presets/presetDataLoader.test.ts
npx tsx src/app/onboarding/questEngine.test.ts
npx tsx src/core/onboarding/AcademyOpenQuestWidget.test.ts
npx tsc --noEmit
```
