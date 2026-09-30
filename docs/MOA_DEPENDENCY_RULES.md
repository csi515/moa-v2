# MOA Dependency Rules & Layer Boundaries

> 작성일: 2026-09-30  
> 브랜치: `main`  
> 목적: Core / Capability / Industry 계층 간 올바른 의존성 방향을 명확히 하고, 신규 기능 추가 시 레이어 경계 위반을 방지한다.

---

## 1. 아키텍처 의존성 방향 개요

MOA-v2의 계층은 아래와 같은 단방향 흐름을 엄격하게 준수해야 한다.

```
Infrastructure (src/lib/supabase, src/services/storage)
       │
       ▼
     Core       (src/core)
       │
       ▼
  Capabilities  (src/capabilities)
       │
       ▼
   Industries   (src/industries/<id>)
```

> **[!IMPORTANT]**  
> 하위 또는 상위 공통 계층이 특정 Industry 구현체를 직접 참조해서는 안 된다.

---

## 2. 계층별 Import 허용 규칙

| 계층 | Import 가능 대상 | Import 금지 대상 |
|------|------------------|------------------|
| **Core** (`src/core/*`) | `src/shared/*`<br/>`src/lib/supabase/*`<br/>`src/services/*`<br/>내부 `src/core/*` | ❌ `src/capabilities/*` (구현체)<br/>❌ `src/industries/*` |
| **Capability** (`src/capabilities/*`) | `src/core/*`<br/>`src/shared/*`<br/>`src/lib/supabase/*`<br/>`src/services/*`<br/>다른 Capability (명시적 dependencies) | ❌ `src/industries/*` |
| **Industry** (`src/industries/<id>/*`) | `src/core/*`<br/>`src/capabilities/*`<br/>`src/shared/*`<br/>`src/lib/supabase/*`<br/>`src/services/*` | ❌ 다른 Industry (`src/industries/<other>/*`) |
| **Infrastructure** | PostgreSQL / RLS / RPC / Storage Engine | ❌ 상위 UI 및 특정 Industry business logic |

---

## 3. 금지되는 Dependency Direction

1. **Core → Industries 직접 import 금지**
   - Core의 인증, 조직, 권한, 카탈로그 로직이 특정 Industry 파일이나 화면 컴포넌트를 직접 `import`하지 않는다.
   - 업종 특화 동작이 필요한 경우 플러그인 인터페이스(`IndustryPluginManifest`)나 주입 슬롯 패턴을 사용한다.

2. **Capabilities → Industries 직접 import 금지**
   - Capability(출석, 예약, 결제, 커머스 등)는 특정 Industry에 종속되지 않는다.
   - 업종 이름에 따른 `if (industry === 'piano')` 조건문 축적을 금지한다.

3. **Industry A → Industry B 직접 import 금지**
   - 개별 Industry(예: `industries/piano`, `industries/pilates`, `industries/skin`)는 독립적이어야 한다.
   - 다른 Industry의 뷰나 도메인 유틸이 필요한 경우, 해당 기능을 Capability 또는 Core로 승격한 후 참조한다.

---

## 4. 허용되는 예외 (Exceptions)

- **단위 테스트의 타입 배제성 교차 검증**:
  - 예: `studentLevel.test.ts`에서 각 업종의 타입 가드 유틸(`isPianoStudentLevel`, `isDaycareAgeClass`, `isGymClassLevel`)이 서로 오작동하지 않는지 확인하기 위한 테스트 전용 import.
- **백워드 호환성을 위한 Re-export Facade**:
  - 기존에 특정 Industry 폴더에 위치해 있던 공통 유틸/뷰가 Capability로 승격되었을 때, 기존 경로를 깨뜨리지 않기 위해 해당 파일에 `export * from '@/capabilities/...'` 형태의 facade re-export를 둘 수 있다.

---

## 5. 새로운 Capability 추가 시 규칙

1. `src/capabilities/<capability-name>/` 위치에 독립 폴더를 생성한다.
2. `manifest.ts`에 `defineCapability()`로 id, displayName, dependencies, requiredPermissions를 선언한다.
3. `src/capabilities/_shared/capabilityTypes.ts`의 `CAPABILITY_IDS` 배열에 신규 capability id를 추가한다.
4. `src/capabilities/index.ts`에 manifest를 등록하고 barrel export한다.
5. 특정 Industry 이름을 코드 내부 서비스나 훅에 하드코딩하지 않는다.

---

## 6. 새로운 Industry 추가 시 규칙

1. `src/industries/<industry-name>/` 위치에 독립 모듈을 생성한다.
2. `plugin.ts`를 작성하여 `IndustryPluginManifest` 계약을 선언한다.
3. `<IndustryName>AppContent.tsx` 및 `config/ModuleLabelsProvider.tsx`를 구현한다.
4. `src/core/industry/definitions.ts`의 `DEFINITION_LIST`에 메타데이터를 추가한다.
5. `src/app/industry/industryCapabilityMap.ts`에 필요한 capability 조합을 정의한다.
6. `src/app/industry/industryModules.tsx`에 `defineIndustryModule()`을 통해 모듈을 등록한다.

---

## 7. 검증 및 린트 방침

- **Typecheck**: `npx tsc --noEmit`
- **Build**: `npm run build`
- **계층 간 의존성 검사**: node 기반 audit 스크립트 또는 아키텍처 계약 테스트(`industryContract.test.ts` 등)를 통해 상위 계층의 불법 import 발생 시 빌드 전에 감지한다.
