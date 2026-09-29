# MOA v2 Runtime Architecture & Refine Integration

이 문서는 **Project Moa v2**의 프론트엔드 표준 계층(Refine v5)과 핵심 비즈니스·보안 계층(MOA Core/Domain/Supabase/RLS) 간의 구조적 역할 분담 및 런타임 통합 원칙을 정의합니다.

---

## 1. 핵심 설계 철학: 이원 계층 구조

Moa v2는 Refine의 표준적인 애플리케이션 도구 상자와 MOA의 검증된 도메인/보안 불변성을 결합합니다.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Application Standard Layer (Refine v5)               │
│  - Standard CRUD (useTable, useForm, useShow, useList)                 │
│  - Query/Cache (TanStack Query v5)                                     │
│  - App Routing & Navigation (React Router v7 / @refinedev/react-router)│
│  - Auth & Access Control Adapter (authProvider, accessControlProvider) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Adapter / Bridge
┌───────────────────────────────────▼────────────────────────────────────┐
│              Authoritative Business & Security Layer (MOA Core)        │
│  - Business Authority: Atomic RPCs (수강료/복합결제/출석/재고 등)         │
│  - Tenant & Organization: OrganizationProvider, ActiveUser, Storage    │
│  - Authorization Authority: createAuthorizationApi, evaluatePermission │
│  - Database Authority: Supabase RLS (Organization Isolation & Policies)│
└────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **권한과 데이터 무결성의 절대적 권위(Source of Truth)는 항상 MOA Core/RLS에 있습니다.**  
> Refine의 UI 편리성(CRUD helper)이 기존의 원자적 RPC나 비즈니스 불변성을 우회하거나 대체해서는 안 됩니다.

---

## 2. 역할 분담 원칙 (Boundaries)

### 2.1 Refine의 책임 (Application Layer)
1. **표준 데이터 조회/표시**: 단순 테이블 목록, 페이징, 정렬, 필터 (`useTable`, `useList`).
2. **단순 CRUD 폼 제어**: 단순 메타데이터 또는 단일 엔티티 등록/수정 (`useForm`).
3. **네비게이션 및 세션 리다이렉트**: 인증 상태에 따른 `/login` 이동 및 메뉴 구성 (`routerProvider`, `Authenticated`).
4. **UI 레벨 권한 표시 제어**: 권한 없는 버튼/메뉴 숨김 및 비활성화 (`useCan`, `accessControlProvider`).
5. **서버 상태 캐싱**: TanStack Query v5를 통한 네트워크 부하 분산 및 쿼리 캐시.

### 2.2 MOA Core / Supabase의 책임 (Authoritative Layer)
1. **복합 비즈니스 트랜잭션**:
   - 수강료 결제 + 교재 결제 결합 원자적 처리 (`record_combined_payment`).
   - 수강권 차감 + 출석 상태 갱신 원자적 처리 (`attendance_status_with_pass_atomic`).
   - 포인트 적립 및 차감 동시성 보장 (`create_sale` RPC).
2. **다중 사업장(Tenant) 및 역할 격리**:
   - `OrganizationProvider`: 활성 사업장 선택, 멤버십 검증, 오너/직원/학부모 포털 분기.
   - `SupabaseRoleSync`: 브라우저 로컬 저장소 및 런타임 액터(`StorageService.setActiveUser`) 동기화.
3. **권한 판정 엔진**:
   - `createAuthorizationApi` 및 `evaluatePermission`: RLS의 `core.has_permission`과 1:1로 일치하는 역할, 스코프(지점/고객), 권한 부여(extraGrants) 판정.
4. **데이터베이스 보안**:
   - Supabase Row Level Security(RLS) 정책을 통한 테넌트 간 데이터 침범 원천 차단.

---

## 3. 프로바이더(Providers) 통합 구조

### 3.1 authProvider (`src/providers/authProvider.ts`)
- **역할**: Refine의 인증 라이프사이클을 MOA의 Supabase 세션 및 사업장 컨텍스트와 연결.
- **주요 구현**:
  - `login`: 이메일/비밀번호 및 OAuth(카카오, 네이버) 로그인 위임.
  - `logout`: 세션 종료 시 `StorageService.clearOrganization()`, 비즈니스 캐시 정리, 로컬 푸시 토큰 정리(`clearLocalPushTokensForUser`), 푸시 등록 리셋을 일괄 수행.
  - `check`: 세션 존재 여부를 엄격히 확인하고 만료 시 로그인 페이지로 안내.
  - `getPermissions`: 단순히 `user.app_metadata.role`을 읽는 대신, 현재 활성화된 조직 멤버십 역할(`StorageService.getActiveUser()?.role`)을 반환.
  - `getIdentity`: Supabase 유저 프로필과 활성 사업장 ID(`storedOrganizationId`), 액터 정보를 결합하여 제공.

### 3.2 accessControlProvider (`src/providers/accessControlProvider.ts`)
- **역할**: Refine 컴포넌트(`useCan`, `<CanAccess>`)의 권한 요청을 MOA 권한 엔진으로 전달.
- **주요 구현**:
  - 하드코딩된 역할 if-check 제거.
  - Refine의 `resource`와 `action`을 MOA의 Canonical Permission(`customers.read`, `sales.create`, `rooms.manage` 등)으로 변환.
  - `createAuthorizationApi`를 인스턴스화하여 `evaluatePermission`을 통해 RLS 정책과 일치하는 권한 판정을 수행.
  - Director/Owner/Manager는 RLS 정책과 동일하게 기본 전체 관리 권한을 부여받고, Staff/Instructor/Parent는 스코프와 권한 부여에 따라 정밀하게 검증.

### 3.3 dataProvider (`src/providers/dataProvider.ts`)
- **역할**: Supabase 데이터 계층 접근.
- **방어적 설계**:
  - 빌드 타임 및 타입 검사 시에는 모듈 해석이 정상 통과.
  - 런타임에 환경변수(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)가 누락된 상태에서 쿼리를 시도할 경우, `placeholder.supabase.co`로 무단 전송하는 대신 명시적인 `SupabaseClientNotConfiguredError`를 throw하여 침묵하는 실패(silent failure)를 방지.

---

## 4. 컴포넌트 트리 및 런타임 마운트 순서 (`src/App.tsx`)

Refine v5와 TanStack Query v5, 그리고 MOA Core 프로바이더는 다음과 같은 계층 순서로 조립됩니다:

```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>                          {/* Supabase Auth 세션 수명주기 관리 */}
    <OrganizationProvider>                {/* 활성 조직 및 멤버십 상태 관리 */}
      <SupabaseRoleSync />                {/* 조직 역할과 StorageService activeUser 동기화 */}
      <BrowserRouter>                     {/* React Router v7 라우터 컨텍스트 */}
        <Refine
          dataProvider={dataProvider}
          authProvider={authProvider}
          accessControlProvider={accessControlProvider}
          routerProvider={routerBindings}
          resources={[ ... ]}
        >
          {/* 인증 라우트 및 보호된 레이아웃 */}
          <Routes> ... </Routes>
          <UnsavedChangesNotifier />
        </Refine>
      </BrowserRouter>
    </OrganizationProvider>
  </AuthProvider>
</QueryClientProvider>
```

---

## 5. 개발 가이드라인: 무엇을 Refine으로 하고 무엇을 하지 말아야 하는가?

| 기능 유형 | 처리 계층 | 구현 방법 |
|---|---|---|
| 학생/원생 목록 조회 | Refine 표준 계층 | `useTable({ resource: "customers" })` |
| 수강료 청구서 목록 조회 | Refine 표준 계층 | `useTable({ resource: "tuition_invoices" })` |
| 학생 기본 인적사항 수정 | Refine 표준 계층 | `useForm({ resource: "customers", action: "edit" })` |
| **수강료 수납 처리** | **MOA Domain Service** | `recordCombinedPayment` / RPC 호출 |
| **수업 출석 및 차감** | **MOA Domain Service** | `attendanceService.recordAttendance` / RPC 호출 |
| **재고 입출고 및 반품** | **MOA Domain Service** | `applyStockMovementAtomic` / `createSaleReturnAtomic` |
| **사업장 생성/전환** | **MOA Core** | `useOrganization().selectOrganization` / RPC 호출 |
| **권한 검사** | **MOA Auth / Refine Bridge** | `useCan()` 또는 `useAuthorization()` |
