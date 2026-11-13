# 1. Moa-v2 아키텍처 경계 및 모듈 규칙 (Architecture Boundaries)

> **문서 버전:** 2.0.0  
> **상위 헌법:** [AGENTS.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/AGENTS.md)  
> **상세 참조:** [docs/MOA_ARCHITECTURE_BOUNDARIES.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/MOA_ARCHITECTURE_BOUNDARIES.md), [docs/MOA_DEPENDENCY_RULES.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/MOA_DEPENDENCY_RULES.md)

---

## 1. Core – Capability – Preset 3계층 단일화

Moa-v2의 최종 아키텍처는 다음 3개 계층으로 단일화되며, **"Domain Capability" 같은 중간 계층은 일절 생성하지 않는다.**

```
1. Core        (인증, 테넌트 격리, 공통 권한 기반, 공통 설정, 확장 인터페이스)
      ↓
2. Capability  (독립 업무 영역, 업종 중립적 재사용 도메인 로직)
      ↓
3. Preset      (Capability + 설정 조합, 업종별 사업장 관리 프로그램 구성)
```

---

## 2. 계층별 핵심 경계 규칙

### 2.1 Core 규칙 (무지의 원칙 - Ignorance Principle)
- Core는 특정 업종이나 개별 Capability의 구체적인 업무 의미를 몰라야 한다.
- Core가 `attendance`, `booking`, `inventory`, `piano` 같은 개별 기능이나 업종을 직접 참조하는 구조를 새로 만들지 않는다.
- 단, Capability를 동적으로 등록하고 실행하기 위한 **일반적인 인터페이스(Generic Interface/Slot)**는 허용한다.

### 2.2 Capability 규칙 (업종 중립성 및 단일화)
- Capability는 독립적인 업무 영역을 담당하며, 다업종에서 동일한 본질의 업무는 **하나의 Capability를 재사용**한다.
- 업종 이름만 달라졌다는 이유로 새로운 Capability를 만들지 않는다.
- 업종별 차이는 설정(setupSchema), 옵션, 업무 규칙(businessRules)으로 표현하며, Capability 내부에서 특정 업종 분기(`if (industry === 'piano')`)를 누적하지 않는다.

### 2.3 Preset 규칙 (선언적 조합 및 위임)
- Preset은 필요한 Capability와 설정을 조합하여 업종별 프로그램을 구성한다.
- Preset 자체에 중복된 업무 로직을 구현하지 않고, 모든 비즈니스 실행은 결합된 Capability의 도메인 로직에 위임한다.

---

## 3. 식별자 체계 및 포털 격리 규격

1. **61개 원자적 번들 (`BundledPresetCapabilityId`) 및 9개 코어 식별자**:
   - `CAPABILITY_ALIASES` 체계를 통해 코어 식별자는 원자적 번들로 자동 매핑된다 (`billing` $\rightarrow$ `billing_invoicing`, `consultation` $\rightarrow$ `consultation_crm` 등).
2. **포털 경계 엄격 격리**:
   - 학부모 포털(`src/modules/parent`)은 사업장 관리자(Director/Staff) 전용 뷰나 리테일 내부 뷰를 직접 import할 수 없다 (`npm run test:architecture`로 자동 차단).
3. **프리셋-런타임 매핑 단일 진실 공급원(SSOT)**:
   - 업종별 Capability 활성화 여부(`hasIndustryCapability`)는 반드시 `presetRegistry`의 선언적 프리셋 정의(`INDUSTRY_PRESETS[id].capabilities`)를 직접 조회하여 판정한다.
4. **Core Compatibility Shim 동결 및 신규 생성 영구 차단**:
   - Core 디렉터리(`src/core/`) 내부에서는 `@/capabilities`를 참조하거나 re-export하는 어떠한 신규 파일도 생성할 수 없다. 신규 코드는 대상 Capability 원본 경로를 직접 import한다.

---

## 4. 공통 자산 재사용 우선 원칙 (Reuse-First Contract)

중복 구현과 모듈 난립을 방지하기 위해 신규 컴포넌트, 훅, 유틸 작성 전 아래 원칙을 상시 준수한다.

1. **공통 카탈로그(`src/shared/`) 우선 탐색 의무화**:
   - 신규 코드를 작성하기 전에 반드시 `src/shared/components/`와 `src/shared/utils/`에 이미 존재하는 검증된 자산을 먼저 확인하고 재사용한다:
     - 표준 목록 뷰 (페이징/검색/모바일카드/엑셀 올인원): [`StandardListView`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/components/ui/StandardListView.tsx)
     - 삭제/파괴 확인 모달: [`ConfirmDialog`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/components/ConfirmDialog.tsx)
     - 금액/원화 입력 폼: [`CurrencyInput`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/components/CurrencyInput.tsx) (콤마 포맷 및 음수 방지)
     - 전화번호 포맷 및 검증: [`phoneValidation.ts`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/utils/phoneValidation.ts)
     - 이미지/서명 용량 리사이징: [`stampResizer.ts`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/utils/stampResizer.ts)
     - 에러 메시지 한국어 변환: [`userFacingErrorMessage`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/errors/userFacingError.ts)
2. **설정 주도 UI 지향 (Schema-Driven UI)**:
   - 업종별로 유사한 CRUD 폼(원생, 회원, 환자 등록 등)을 화면마다 복제하지 않고, [`AutoSchemaForm`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/components/schema-form/AutoSchemaForm.tsx)이나 스키마 설정 객체를 통해 동적으로 렌더링한다.
3. **확장 폐쇄 원칙 (Open-Closed Extension)**:
   - 기존 공통 컴포넌트와 90% 일치하고 일부만 다른 경우, 새 컴포넌트를 복제하지 않고 기존 공통 컴포넌트에 옵셔널 Props(예: `renderActions`, `extraBadge`)를 추가하여 재사용성을 유지한다.

---

## 5. 다업종 용어 다형성 렌더링 규칙 (Terminology Polymorphism Contract)

Moa-v2는 단일 Capability 모듈로 44개 업종을 지원하므로, UI 화면에서 특정 업종 용어를 하드코딩하지 않고 동적 용어 사전을 경유한다.

1. **고객/대상 명칭 하드코딩 금지**:
   - UI 타이틀, 테이블 헤더, 안내 문구에서 '원생', '수강생', '회원', '환자' 등의 명칭을 직접 문자열로 하드코딩하지 않는다.
   - 반드시 [`useTerminology().t('customer.singular')`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/core/terminology/useTerminology.ts) 훅을 경유하여 프리셋에 맞춰 자동 치환되도록 렌더링한다 (피아노 학원: "원생", 헬스장: "회원", 한의원: "환자").
   ```tsx
   // ❌ 금지: 타 업종에서 열었을 때 어색한 용어 노출
   <h2>원생 목록 관리</h2>
   <p>신규 원생을 등록하세요.</p>

   // ⭕ 표준: 용어 다형성 적용
   const { t } = useTerminology();
   <h2>{t('customer.singular')} 목록 관리</h2>
   <p>신규 {t('customer.singular')}을(를) 등록하세요.</p>
   ```
2. **용어 누수 자동 검사 (TERMINOLOGY-GUARD)**:
   - `scripts/check-terminology-leak.mjs` 검사기를 통해 신규 Capability 파일에서 업종 특정 단어 감지 시 CI가 즉각 차단된다.

---

## 6. 도메인 시간 결정론 규칙 (Time Determinism Contract)

비즈니스 로직(src/capabilities/*/domain/) 내부에서 인자 없는 `new Date()`를 직접 생성하면 서버 타임존 오차와 테스트 비결정론이 발생한다.

1. **도메인 순수 함수 내 시간 매개변수 주입 의무**:
   - 도메인 계산 함수는 현재 시각을 외부에서 주입받거나, 프로젝트 공통 KST 유틸([`todayIsoLocal()`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/shared/utils/localDate.ts))을 사용한다.
   ```ts
   // ❌ 금지: 인자 없는 new Date() 직접 호출 (타임존 오차 및 테스트 모킹 불가)
   export function calculatePassExpiry(days: number) {
     const now = new Date(); // CI 차단 대상
     ...
   }

   // ⭕ 표준: 기준 시각 주입 또는 결정론적 유틸 사용
   import { todayIsoLocal } from '@/shared/utils/localDate';

   export function calculatePassExpiry(days: number, baseDateIso: string = todayIsoLocal()) {
     ...
   }
   ```
2. **시간 결정론 자동 검사 (TIME-DETERMINISM)**:
   - `scripts/check-time-determinism.mjs` 검사기를 통해 신규 도메인 파일에서 `new Date()` 감지 시 CI가 즉각 차단된다.



