# MOA Architecture Boundaries

> 작성일: 2026-09-30  
> 기준 브랜치: `main`  
> 검증: `npm run build` 성공 (exit 0)

---

## 목적

새로운 Industry(사업종류)를 추가해도 기존 Core, 기존 Capability, 기존 Industry에  
**연쇄 변경이 발생하지 않는** 구조를 유지한다.

이 문서는 각 레이어의 책임 경계, import 규칙, 금지 패턴, 신규 Industry 추가 절차,  
그리고 향후 개발 시 체크리스트를 정의한다.

---

## 레이어 구조 개요

```
┌─────────────────────────────────────────────────────────┐
│  Refine (dataProvider / authProvider / accessControl)   │
├─────────────────────────────────────────────────────────┤
│  MOA Core                                               │
│  src/core/  +  src/app/industry/  +  src/providers/     │
├──────────────────┬──────────────────────────────────────┤
│  Capability      │  Industry                            │
│  src/capabilities│  src/industries/<name>/              │
├──────────────────┴──────────────────────────────────────┤
│  Shared  (src/shared/)                                  │
├─────────────────────────────────────────────────────────┤
│  Infrastructure                                         │
│  src/lib/supabase/  src/services/  src/services/storage │
├─────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL / RLS / RPC)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Refine

### 책임

| 항목 | 내용 |
|------|------|
| 표준 CRUD | list / show / create / edit / delete |
| 상태 관리 | form state, loading/error state |
| 서버 통신 | server query/cache (TanStack Query 위임) |
| 라우팅 | resource routing, URL sync |
| 어댑터 | auth adapter, access control adapter |

### 실제 위치

```
src/providers/authProvider.ts          ← Refine AuthProvider 구현
src/providers/accessControlProvider.ts ← Refine AccessControlProvider 구현
src/providers/dataProvider.ts          ← Refine DataProvider 구현
src/App.tsx                            ← <Refine> 선언 및 resource 목록
```

### Import 규칙

| 허용 | 금지 |
|------|------|
| `@refinedev/core`, `@refinedev/react-router` | Industry 고유 로직 직접 참조 |
| `src/core/auth`, `src/core/organizations` | `src/industries/*` 직접 import |
| `src/core/authorization` | |
| `src/lib/supabase` | |
| `src/services/storage` (StorageService) | |

### 경계 규칙

- **Refine은 MOA의 업무 규칙을 결정하지 않는다.**
- `accessControlProvider`는 `MOA 권한 엔진(authorizationApi)`에 위임한다.
  자체적으로 역할별 조건문을 갖지 않는다.
- `authProvider`는 Supabase 세션과 StorageService를 통해 role을 읽는다.  
  조직/역할 계산 로직을 직접 보유하지 않는다.

---

## 2. MOA Core

### 책임

| 항목 | 경로 |
|------|------|
| 인증 통합 | `src/core/auth/` |
| 조직/멤버십/활성 조직 | `src/core/organizations/` |
| 인가(권한 평가) | `src/core/authorization/` |
| 사업장 등록·온보딩 | `src/core/accounts/`, `src/core/organizations/` |
| Industry 카탈로그 | `src/core/industry/definitions.ts`, `catalog.ts` |
| Industry 타입 시스템 | `src/core/industry/types.ts` |
| Industry 플러그인 계약 | `src/core/industry/pluginTypes.ts`, `pluginHost.ts` |
| Industry → App 라우팅 | `src/app/industry/IndustryAppRouter.tsx` |
| 플랫폼 레벨 | `src/core/platform/`, `src/core/locations/` |

### 핵심 파일 설명

#### `src/core/industry/definitions.ts`
유일한 Industry 카탈로그 원천.  
`defineIndustry()` 로 업종 메타데이터(label, category, moduleId)만 선언한다.  
**capability 조합은 여기 없다.**

#### `src/core/industry/pluginTypes.ts`
`IndustryPluginManifest` 인터페이스를 정의한다.  
각 Industry의 `plugin.ts`가 이 계약을 구현한다.  
Core는 이 계약만 알고, 구현 내용은 모른다.

#### `src/core/industry/pluginHost.ts`
설치된 플러그인 registry. `installIndustryPlugin()` / `getIndustryPlugin()`.  
Core는 여기서 플러그인 인스턴스를 조회할 수 있지만, 내부를 분기하지 않는다.

#### `src/core/industry/capabilityNavHost.ts`
Composition 쪽이 설치하는 capability nav 필터 슬롯.  
Core는 필터 구현을 모른다. Composition이 `installCapabilityNavFilter()`로 주입한다.

#### `src/app/industry/IndustryAppRouter.tsx`
`organization.industry_type` 기반으로 Industry App을 lazy-load.  
`APP_BY_INDUSTRY[id]` 조회만 하고, Industry 내부 로직을 직접 알지 않는다.

#### `src/app/industry/industryModules.tsx`
**등록부.** 신규 Industry 추가 시 이 파일에 한 줄 추가한다.  
`defineIndustryModule({ id, plugin, loadApp, loadLabels })`.

#### `src/app/industry/industryCapabilityMap.ts`
**Industry → Capability 조합 SoT.**  
Core catalog와 별개다. Core는 `@/capabilities` 구현을 import하지 않는다.

#### `src/app/industry/capabilityNavigation.ts`
Capability → NavTab 매핑. `installCapabilityNavFilter()` 로  
Core의 `filterIndustryNavTabs()` 동작에 필터를 주입한다.

### Import 규칙

| 허용 | 금지 |
|------|------|
| `src/shared/*` | `src/capabilities/*` 구현체 직접 import |
| `src/lib/supabase/*` | `src/industries/*` 직접 import |
| `src/services/*` | Industry 고유 업무 로직 포함 |

### 금지 패턴

```typescript
// ❌ Core에서 이런 분기를 늘리지 않는다
if (industry === 'piano') { /* ... */ }
if (industry === 'bathhouse') { /* ... */ }

// ✅ 대신 플러그인 계약으로 위임
const plugin = getIndustryPlugin(industry);
plugin.someField; // 업종이 선언한 값 사용
```

---

## 3. Capability

### 책임

재사용 가능한 업무 능력. 특정 Industry에 종속되지 않는다.

| Capability | 경로 |
|------------|------|
| roster | `src/capabilities/roster/` |
| scheduling | `src/capabilities/scheduling/` |
| booking | `src/capabilities/booking/` |
| billing | `src/capabilities/billing/` |
| attendance | `src/capabilities/attendance/` |
| commerce | `src/capabilities/commerce/` |
| parent | `src/capabilities/parent/` |
| resources | `src/capabilities/resources/` |
| transport | `src/capabilities/transport/` |
| enrollment | `src/capabilities/enrollment/` |
| consultation | `src/capabilities/consultation/` |

### Capability 선언

```
src/capabilities/_shared/capabilityTypes.ts  ← CapabilityId, 계약 정의
src/capabilities/index.ts                    ← 전체 manifest 목록
src/capabilities/<name>/manifest.ts          ← 개별 capability 메타데이터
src/capabilities/<name>/index.ts             ← barrel
```

### Import 규칙

| 허용 | 금지 |
|------|------|
| `src/core/*` (Core 서비스/타입) | `src/industries/*` 직접 import |
| `src/shared/*` | Industry 전용 업무 규칙 포함 |
| `src/lib/supabase/*` | |
| `src/services/*` | |
| 다른 Capability (명시적 의존성) | |

### 금지 패턴

```typescript
// ❌ Capability에서 Industry 분기를 늘리지 않는다
if (industry === 'piano') { applyPianoRule(); }
if (industry === 'gym') { applyGymRule(); }

// ✅ Industry별 특수 규칙은 Industry가 소유한다
// Capability는 공통 인터페이스만 제공한다
```

---

## 4. Industry

### 책임

특정 사업종류의 조립 및 특수 업무 규칙.

| 항목 | 내용 |
|------|------|
| Industry별 페이지 | `components/` |
| Industry별 도메인 규칙 | `services/` |
| Industry별 네비게이션 | `layout/`, `config/nav.tsx` |
| Industry별 라우트 | AppContent 내부 |
| Industry별 설정 | `config/` |
| Capability 조합 선언 | `plugin.ts` 의 syncCapabilities |
| 플러그인 계약 구현 | `plugin.ts` |

### 실제 구조 (piano 예시)

```
src/industries/piano/
├── plugin.ts                    ← IndustryPluginManifest 구현 (필수)
├── PianoAppContent.tsx          ← 업종 앱 루트 (필수)
├── config/
│   ├── labels.ts
│   ├── ModuleLabelsProvider.tsx ← 업종 레이블 Provider (필수)
│   └── nav.tsx
├── layout/
│   ├── PianoSidebar.tsx
│   └── PianoBottomNav.tsx
├── components/                  ← 업종 전용 컴포넌트
├── services/                    ← 업종 전용 도메인 서비스
├── sync/
│   └── registerPianoSync.ts    ← 스토리지 sync 등록
└── types/
    └── studentLevel.ts
```

### Import 규칙

| 허용 | 금지 |
|------|------|
| `src/core/*` | 다른 `src/industries/*` 직접 import |
| `src/capabilities/*` | |
| `src/shared/*` | |
| `src/lib/supabase/*` | |
| `src/services/*` | |

### 금지 패턴

```typescript
// ❌ Industry가 다른 Industry를 직접 참조하는 구조
import { PianoSpecificService } from '@/industries/piano/services/...';
// (src/industries/gym 내에서 piano를 참조하는 등)

// ✅ 공통 기능은 Capability나 Core로 올린다
```

---

## 5. Supabase

### 책임

| 항목 | 내용 |
|------|------|
| 데이터 저장 | PostgreSQL |
| 테넌트 격리 | RLS (Row Level Security) |
| 원자 트랜잭션 | RPC (Stored Procedure) |
| 최종 권한 검증 | DB 레벨 보안 경계 |

### 실제 위치

```
src/lib/supabase/client.ts      ← 기본 Supabase 클라이언트
src/lib/supabase/pianoClient.ts ← 피아노 전용 Supabase 클라이언트
src/lib/supabase/bathClient.ts  ← 목욕/찜질방 전용 Supabase 클라이언트
src/lib/supabase/database.types.ts ← 생성된 DB 타입
supabase/migrations/            ← 마이그레이션 파일
supabase/functions/             ← Edge Functions
```

### 프론트엔드 권한 vs DB 권한 경계

```
프론트엔드 권한 체크 (accessControlProvider)
  → UX/접근 제어 목적 (버튼 숨김, 라우트 보호)
  → 최종 DB 보안 경계가 아님

Supabase RLS
  → 실제 데이터 격리 및 보안 경계
  → 프론트에서 아무리 조작해도 RLS가 차단
```

> **[!IMPORTANT]**  
> 프론트엔드 권한 체크는 UX 편의다. 데이터 보안은 반드시 RLS가 담보한다.

---

## 6. Infrastructure

### 책임

| 항목 | 경로 |
|------|------|
| Supabase 클라이언트 | `src/lib/supabase/` |
| 로컬 스토리지 (offline snapshot) | `src/services/storage/` |
| Sync outbox | `src/services/adapters/sync/` |
| 스토리지 어댑터 | `src/services/adapters/` |
| Capacitor (native) | `src/core/platform/capacitorPlatform.ts` |
| Push 알림 | `src/core/push/` |

### Storage와 TanStack Query 경계

```
StorageService (src/services/storage/)
  → 인메모리 캐시 + offline snapshot
  → hydrate / subscribe / flush 담당
  → 직접 TanStack Query를 사용하지 않음

TanStack Query (useQuery / useMutation)
  → 서버 데이터 fetch/cache/invalidate
  → StorageService 데이터를 읽어 UI에 반영
  → 두 시스템은 독립적으로 동작
```

### 규칙

- StorageService는 Industry 이름으로 분기하지 않는다.  
  Industry는 `plugin.syncCapabilities`로 자신이 쓸 capability를 선언하고,  
  어댑터는 이 목록만 본다.
- 신규 Industry의 sync는 `src/industries/<id>/sync/register*Sync.ts` 에서  
  `registerIndustrySyncCapability()` 로 등록한다.

---

## 신규 Industry 추가 시 변경 파일

신규 Industry 추가 시 **변경해야 하는 파일 목록**:

| 파일 | 내용 | 필수 |
|------|------|------|
| `src/core/industry/definitions.ts` | `defineIndustry({ id, moduleId, selectable })` 추가 | ✅ |
| `src/app/industry/industryCapabilityMap.ts` | `INDUSTRY_CAPABILITY_COMPOSITION[id]` 추가 | ✅ |
| `src/industries/<id>/plugin.ts` | `IndustryPluginManifest` 구현 | ✅ |
| `src/industries/<id>/PianoAppContent.tsx` → `<Id>AppContent.tsx` | 업종 앱 루트 컴포넌트 | ✅ |
| `src/industries/<id>/config/ModuleLabelsProvider.tsx` | 레이블 Provider | ✅ |
| `src/app/industry/industryModules.tsx` | `defineIndustryModule(...)` 한 줄 추가 | ✅ |
| `src/industries/<id>/sync/register*Sync.ts` | sync 등록 (offline 필요 시) | 선택 |

> **[!NOTE]**  
> 이 6~7개 파일 외에 기존 파일을 수정하지 않아도 새 Industry가 동작한다.  
> `industryContract.test`가 이를 검증한다.

---

## 신규 Industry 추가 시 변경되면 안 되는 영역

| 금지 변경 대상 | 이유 |
|----------------|------|
| `src/core/authorization/` | 권한 평가 엔진 |
| `src/core/organizations/` | 조직/멤버십 관리 |
| `src/core/auth/` | 인증 |
| `src/capabilities/*/manifest.ts` | Capability 정의 |
| `src/capabilities/*/` 기존 파일 | Capability 구현 |
| `src/app/industry/IndustryAppRouter.tsx` | 라우터 로직 |
| `src/app/industry/capabilityNavigation.ts` | 기존 탭 매핑 (새 탭 추가는 가능) |
| `src/providers/authProvider.ts` | Refine 인증 어댑터 |
| `src/providers/accessControlProvider.ts` | Refine 권한 어댑터 |
| 다른 Industry `src/industries/<other>/` | 독립성 유지 |

---

## 레이어 간 Import 방향 요약

```
Refine ──────────────→ Core
                        ↓
                   Capability ←──── Industry
                        ↓               ↓
                   Infrastructure ←─────┘
                        ↓
                    Supabase
```

**방향 원칙:**
- 아래 레이어는 위 레이어를 모른다.
- Supabase는 누구도 모른다.
- Industry는 Core와 Capability를 알지만, 다른 Industry는 모른다.
- Core는 Capability 구현을 import하지 않는다. (슬롯/주입 패턴 사용)

---

## 좋은 예 / 나쁜 예

### ✅ 좋은 예: 신규 Industry 추가 (코페르티나 피아노)

```typescript
// 1. src/core/industry/definitions.ts
defineIndustry({
  id: 'copertin_piano',
  label: '코페르티나 피아노',
  description: '...',
  category: 'education',
  moduleId: 'copertin_piano',
  selectable: true,
})

// 2. src/app/industry/industryCapabilityMap.ts
copertin_piano: {
  capabilities: { roster: true, scheduling: true, billing: true },
  defaults: { attendance: false },
}

// 3. src/industries/copertin_piano/plugin.ts
export const copertainPluginManifest: IndustryPluginManifest = { id: 'copertin_piano', ... }

// 4. src/app/industry/industryModules.tsx
defineIndustryModule({
  id: 'copertin_piano',
  plugin: copertainPluginManifest,
  appExport: 'CopertainAppContent',
  loadApp: () => import('@/industries/copertin_piano/CopertainAppContent'),
  loadLabels: () => import('@/industries/copertin_piano/config/ModuleLabelsProvider'),
})
```

기존 Core/Capability/다른 Industry 파일 **변경 없음.**

---

### ❌ 나쁜 예: Core에 Industry 분기 추가

```typescript
// src/core/organizations/OrganizationProvider.tsx
// ❌ 이런 패턴을 추가하지 않는다
if (organization.industry_type === 'copertin_piano') {
  return <CopertainSpecialProvider />;
}
```

---

### ✅ 좋은 예: Capability에서 Industry 중립 서비스

```typescript
// src/capabilities/billing/finance/tuitionPaymentAtomic.ts
// Industry 이름 없이 순수 업무 로직
export async function processTuitionPayment(params: TuitionPaymentParams) { ... }
```

---

### ❌ 나쁜 예: Capability에서 Industry 분기

```typescript
// src/capabilities/billing/finance/tuitionPaymentAtomic.ts
// ❌ Capability에 Industry 분기를 추가하지 않는다
if (industry === 'piano') { applyPianoTuitionRule(); }
if (industry === 'gym') { applyGymTuitionRule(); }
```

---

### ✅ 좋은 예: Industry가 Capability를 조합

```typescript
// src/industries/piano/plugin.ts
syncCapabilities: ['piano', 'education'],

// src/industries/piano/sync/registerPianoSync.ts
registerPianoStudentDetailExtension(); // Core에 영향 없음
registerPinCheckInSideEffect(syncDayAttendanceFromPinCheckIn); // 사이드이펙트 주입
```

---

### ❌ 나쁜 예: 새 전역 상태 시스템 추가

```typescript
// ❌ 이런 파일을 새로 만들지 않는다
// src/context/BusinessContext.tsx - 모든 업종의 업무 데이터를 관리하는 거대한 Context
// src/services/GenericBusinessEngine.ts - 업종별 조건문이 가득한 엔진
```

---

## 현재 코드베이스의 실제 상태 (주의 사항)

### ✅ 잘 분리된 영역

| 항목 | 설명 |
|------|------|
| Industry 카탈로그 | `definitions.ts` 단일 원천, 파생만 허용 |
| Industry → Capability 조합 | `industryCapabilityMap.ts` 분리됨 |
| 플러그인 계약 | `IndustryPluginManifest` 통해 Core 격리 |
| 권한 엔진 | `authorizationApi`로 캡슐화됨 |
| 스토리지 어댑터 | Industry 이름 분기 없이 capability 목록 기반 |

### ⚠️ 현재 실제 상태 기록 (위반 아님, 인지 필요)

| 항목 | 현황 | 비고 |
|------|------|------|
| `src/core/academy/` | 피아노/교육학원 전용 기능이 `core/`에 위치 | 역사적 이유. 현재 잘 작동하며 이동 금지. 향후 신규 기능은 `industries/piano/`에 |
| `src/core/schedules/`, `src/core/sessions/`, `src/core/waitlist/` | 사실상 피아노/교육 전용 도메인 로직 | `core/`에 위치하지만 다른 업종은 사용하지 않음. 이동 금지. |
| `src/core/students/`, `src/core/staff/`, `src/core/attendance/` | 교육 업종 중심이지만 일부 공통으로 재사용됨 | |
| `src/services/adapters/sync/pianoEntity*.ts` | 피아노 전용 sync가 `services/adapters/` 하위에 위치 | `industries/piano/sync/`로의 이동은 별도 작업 |
| `src/core/finance/` | 교육 학원 특화 재무 | |
| `src/core/lessons/` | 피아노/교육 전용 레슨 | |

> **[!IMPORTANT]**  
> 위 항목들은 현재 잘 작동하는 코드다.  
> **임의로 이동하거나 재작성하지 않는다.**  
> 새로운 기능은 올바른 위치(industries/...)에 작성한다.

---

## Refine과 MOA Core의 책임 경계

| Refine이 담당 | MOA Core가 담당 |
|---------------|----------------|
| resource 선언 (list/show/create/edit URL) | 업무 규칙 정의 |
| dataProvider (Supabase CRUD 어댑터) | 권한 평가 로직 (`authorizationApi`) |
| authProvider (세션 체크, 로그인/로그아웃) | 조직/멤버십 상태 관리 |
| accessControlProvider (can() 인터페이스) | Industry 라우팅 결정 |
| form/list 상태 | 스토리지 하이드레이션 |
| TanStack Query 캐시 | |

**핵심 경계:**  
`accessControlProvider.can()` → MOA `authorizationApi.can()` 위임.  
Refine은 permission 이름을 알고, 평가는 Core 엔진이 한다.

---

## Capability와 Industry의 책임 경계

| Capability가 담당 | Industry가 담당 |
|------------------|----------------|
| 공통 업무 인터페이스 정의 | 업종 특화 규칙 구현 |
| 재사용 가능한 서비스/훅 | 필요한 Capability 조합 |
| Infrastructure 추상화 | 업종 전용 UI/페이지 |
| Domain 규칙 (업종 중립) | 레이블/설정/테마 |
| Storage sync 계약 | Sync 구현 등록 |

**핵심 경계:**  
Capability는 "무엇을 할 수 있는가"를 정의한다.  
Industry는 "어떻게 조합하고 어떤 규칙을 적용하는가"를 결정한다.

---

## 향후 개발 체크리스트

### 신규 Industry 추가 시

- [ ] `definitions.ts`에 `defineIndustry()` 추가
- [ ] `industryCapabilityMap.ts`에 capability 조합 추가
- [ ] `src/industries/<id>/plugin.ts` 구현
- [ ] `src/industries/<id>/<Id>AppContent.tsx` 구현
- [ ] `src/industries/<id>/config/ModuleLabelsProvider.tsx` 구현
- [ ] `industryModules.tsx`에 `defineIndustryModule()` 한 줄 추가
- [ ] (필요 시) `sync/register*Sync.ts` 구현
- [ ] `npm run build` 통과 확인
- [ ] `industryContract.test`, `industryManifest.parity.test` 통과 확인
- [ ] 기존 Core/Capability 파일을 수정하지 않았는지 확인

### 신규 기능 추가 시

- [ ] 업종 중립적인가? → Capability에 추가
- [ ] 특정 업종 전용인가? → `src/industries/<id>/`에 추가
- [ ] 플랫폼 공통인가? → `src/core/`에 추가
- [ ] Core에 Industry 이름 분기를 추가하고 있지 않은가?
- [ ] Capability에 Industry 이름 분기를 추가하고 있지 않은가?
- [ ] 새로운 전역 상태 시스템을 만들고 있지 않은가?
- [ ] 기존 dependency로 해결 가능한가? (npm 신규 패키지 최소화)

### 패키지 추가 시

- [ ] 공식 npm, GitHub, documentation 확인
- [ ] 현재 유지보수 상태 및 최근 릴리스 확인
- [ ] React / Vite / Refine / TanStack Query / Supabase 호환성 확인
- [ ] 라이선스: MIT 또는 Apache-2.0만 허용 (GPL/AGPL 금지)
- [ ] 알려진 보안 이슈 없음 확인
- [ ] 기존 dependency로 해결 불가한지 재확인

### 코드 리뷰 시

- [ ] Core에 `if (industry === '...')` 패턴이 추가되지 않았는가?
- [ ] Capability에 `if (industry === '...')` 패턴이 추가되지 않았는가?
- [ ] 한 Industry가 다른 Industry를 직접 import하지 않는가?
- [ ] 새로운 거대한 Context/Service/Engine이 생기지 않았는가?
- [ ] 기존 인증/조직/권한 시스템과 중복되는 시스템이 생기지 않았는가?

---

## 빌드 검증 결과

```
검증 일시: 2026-09-30
명령어: npm run build
결과: exit 0 (성공)
경고: Some chunks are larger than 500 kB (기존 경고, 신규 발생 아님)
```

TypeScript typecheck는 build 과정에서 통과됨.
