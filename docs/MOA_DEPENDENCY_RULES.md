# MOA Dependency Rules & Layer Boundaries

> 최종 개정일: 2026-10-09  
> 기준: Moa-v2 Core–Capability–Preset 아키텍처 개정  
> 브랜치: `main`  
> 목적: Core / Capability / Preset 계층 간 올바른 의존성 방향을 명확히 하고, 신규 기능 및 프리셋 추가 시 레이어 경계 위반을 원천 방지한다.

---

## 1. Moa-v2 3대 핵심 구조 및 의존성 방향

Moa-v2의 최종 구조는 다음 세 가지 계층으로 단일화된다.  
**별도의 Domain Capability 계층은 만들지 않는다.**

1. **Core**
2. **Capability**
3. **Preset**

계층 간 의존성은 아래의 엄격한 단방향 흐름을 준수해야 한다.

```
Infrastructure (src/lib/supabase, src/services/storage)
       │
       ▼
     Core       (인증, 테넌트 격리, 공통 권한 기반, 공통 설정, 확장 인터페이스)
       │
       ▼
  Capabilities  (독립 업무 영역, 업종 중립적 재사용 컴포넌트/엔티티/서비스)
       │
       ▼
     Preset     (Capability 조합 및 업종별 설정 선언, 비즈니스 관리 프로그램 구성)
```

> **[!IMPORTANT]**  
> 1. 하위 또는 상위 공통 계층이 특정 업종이나 개별 Capability의 구체 구현을 직접 참조해서는 안 된다.  
> 2. 특히 **Core는 개별 Capability의 업무 의미를 몰라야 한다.**

---

## 2. 3계층 핵심 원칙 및 책임

### 2.1 Core 규칙
- **Core는 특정 업종과 개별 Capability의 업무 의미를 몰라야 한다.**
- Core는 인증, 테넌트 격리, 공통 권한 기반, 공통 설정, 확장 인터페이스 등 기반 기능을 담당한다.
- Core가 `attendance`, `booking`, `inventory`, `piano`, `pilates` 같은 개별 기능이나 업종을 직접 참조하는 구조를 새로 만들지 않는다.
- 단, Capability를 등록하고 실행하기 위한 **일반적인 인터페이스(Generic Interface, Plugin Contract, Registry Slot)**는 허용한다.

### 2.2 Capability 규칙
- **Capability는 독립적인 업무 영역을 담당한다.**
- 여러 업종에서 같은 본질의 업무가 필요하면 하나의 Capability를 재사용한다.
- **업종 이름만 달라졌다는 이유로 새로운 Capability를 만들지 않는다.**
- 업종별 차이는 기존 Capability의 설정, 옵션, 정책, 업무 규칙으로 표현할 수 있는지 먼저 검토한다.
- Capability 내부에서 특정 업종에 따른 조건 분기(`if (industry === 'piano')`)를 누적하지 않는다.

### 2.3 Preset 규칙
- **Preset은 필요한 Capability와 설정을 조합해 업종별 사업장 관리 프로그램을 구성한다.**
- Preset 자체에 중복된 업무 로직을 구현하지 않는다.
- **업종별 애플리케이션을 복제하지 않는다.**
- Preset은 선언적 구성(Configuration)과 조립(Assembly)만 담당하며, 실제 비즈니스 실행은 연결된 Capability에 위임한다.

---

## 3. 계층별 Import 허용 규칙

| 계층 | Import 가능 대상 | Import 금지 대상 |
|------|------------------|------------------|
| **Core** (`src/core/*`) | `src/shared/*`<br/>`src/lib/supabase/*`<br/>`src/services/*`<br/>내부 `src/core/*` | ❌ `src/capabilities/*` (구체 구현체)<br/>❌ `src/industries/*` (특정 업종 앱)<br/>❌ 특정 업종 고유 로직/스키마 직접 참조 |
| **Capability** (`src/capabilities/*`) | `src/core/*` (공통 인터페이스/기반)<br/>`src/shared/*`<br/>`src/lib/supabase/*`<br/>`src/services/*`<br/>다른 Capability (명시적 dependencies) | ❌ `src/industries/*`<br/>❌ 특정 업종명 기반 로직 분기 |
| **Preset** (`src/core/presets/*` 등) | `src/core/*` (기반 및 인터페이스)<br/>`src/capabilities/*` (필요한 Capability의 스키마/리소스)<br/>`src/shared/*`<br/>`src/lib/supabase/*`<br/>`src/services/*` | ❌ 다른 Preset 복제 로직<br/>❌ 중복된 도메인 비즈니스 로직 작성 |
| **Infrastructure** | PostgreSQL / RLS / RPC / Storage Engine | ❌ 상위 UI 및 특정 업종/Capability 업무 규칙 |

---

## 4. 새로운 Capability 생성 승인 규칙 (6단계 필수 검증)

새로운 Capability를 만들기 전에 반드시 다음 6단계를 순서대로 검증해야 한다.

1. **기존 Capability로 해결 가능한가?**
2. **기존 데이터 모델과 설정으로 표현 가능한가?**
3. **옵션이나 업무 규칙(Policy/Rule)으로 해결 가능한가?**
4. **기존 Capability들을 조합하면 해결 가능한가?**
5. **기존 기능을 확장하면 해결 가능한가?**
6. **그래도 해결할 수 없다면 독립된 데이터 모델과 업무 생명주기(Lifecycle)가 실제로 존재하는가?**

> **[!CAUTION]**  
> - 기존 기능을 확장하는 것보다 새 Capability를 만드는 것이 **명확하게 유리한 경우에만** 추가한다.  
> - 단순한 필드, 버튼, 검색, 알림, 바코드, 통계 같은 요소를 그 자체로 독립 Capability로 만들지 않는다.  
> - 단, 이러한 기능도 독립된 업무 생명주기와 책임을 가진다면 별도로 검토할 수 있다.

---

## 5. 금지되는 Dependency Direction 및 패턴

1. **Core → Capability / 업종 직접 import 금지**
   - Core의 인증, 조직, 권한, 카탈로그 로직이 개별 Capability의 구체 업무 컴포넌트나 서비스를 직접 import하지 않는다.
   - Capability의 등록/실행이 필요한 경우 반드시 일반 인터페이스(동적 Registry, 주입 슬롯, 매니페스트 계약)를 통해 주입받는다.

2. **Capability → 업종 직접 import 금지**
   - 출석, 예약, 결제, 수강권, 커머스 등 Capability는 특정 업종에 종속되지 않는다.
   - `if (industry === 'piano')`와 같은 업종 분기 축적을 엄격히 금지하며, 업종별 동작 차이는 Capability 설정(setupSchema), 옵션(options), 정책(policy) 주입으로 해결한다.

3. **Preset의 비즈니스 로직 소유 및 앱 복제 금지**
   - Preset은 활성화할 Capability 목록과 업종별 설정값(설정 스키마 입력값, 레이블 매핑 등)만 선언해야 한다.
   - 특정 업종을 지원하기 위해 독립 애플리케이션 코드를 복제하여 작성하지 않는다.

4. **별도의 Domain Capability 계층 생성 금지**
   - 시스템 계층을 복잡하게 만드는 "Domain Capability" 같은 중간 계층을 추가하지 않는다. 오직 Core, Capability, Preset 3계층만 유지한다.

---

## 6. 허용되는 예외 (Exceptions)

- **단위 테스트의 타입 배제성 교차 검증**:
  - 테스트 파일(`.test.ts`)에서 타입 가드 유틸이나 불변식 검증을 위한 교차 import는 허용된다.
- **백워드 호환성을 위한 Re-export Facade**:
  - 기존 레거시 코드베이스와의 호환성을 유지하기 위한 facade re-export(`export * from '@/capabilities/...'`)는 점진적 마이그레이션 중 허용된다.

---

## 7. 검증, 린트 및 코드 리뷰 기준

### 7.1 현재 자동화된 검사
- **Typecheck**: `npx tsc --noEmit` (`npm run lint`)
- **Build**: `npm run build`
- **계층 간 의존성 검사**: `npm run test:architecture` (`node scripts/check-architecture-dependencies.mjs --self-test`)
- **비즈니스 불변식 검사**: `npm run test:business-invariants`
- **계약 테스트**: `test:capability-contract`, `test:preset-assembler`, `test:industry-contract`

### 7.2 아직 자동화되지 않은 검사 (향후 과제 및 코드 리뷰 필수 기준)
1. **Core → Capability 정적 참조 완전 격리**:
   - 현재 `src/core/presets/presetRegistry.ts`가 온보딩 프리셋 조립을 위해 Capability들의 스키마를 정적으로 import하는 구조는 Core가 Capability를 직접 아는 예외 상태다.
   - 향후 프리셋 조립 엔진은 Core 외부(Composition/App 레이어)로 분리하거나 런타임 동적 등록 방식으로 전환하여 정적 의존성을 완전히 제거해야 한다.
2. **새로운 Capability 승인 6단계 게이트 검사**:
   - PR 검토 시 새로운 디렉터리(`src/capabilities/<new>`)가 추가될 경우 6단계 승인 체크리스트를 통과했는지 수동 리뷰로 확인해야 한다.
3. **업종별 애플리케이션 복제 방지**:
   - 신규 업종 도입 시 `src/industries/<new>` 형태의 전체 앱 복제 대신 기존 Capability + Preset 조합으로 구성되었는지 코드 리뷰에서 강제한다.
