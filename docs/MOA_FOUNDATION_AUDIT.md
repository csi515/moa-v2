# MOA v2 Foundation Architecture Final Audit Report

이 문서는 **Project Moa v2**의 전체 Foundation 아키텍처(Auth, Organization, Authorization, Supabase Security, Refine CRUD, Storage, Business Entry, Industry, Dependency, Build/Test)에 대한 종합 감사 결과를 기록합니다.

---

## 1. 최종 감사 평가 요약 (Audit Matrix)

| 영역 | 상태 | 문제 | 심각도 | 필요한 조치 및 검증 상태 |
|---|---|---|---|---|
| **Auth** | **정상** | 없음. `signOutCoordinator`를 통해 Refine `authProvider.logout`과 MOA `AuthProvider`의 세션 종료 흐름이 일원화되었으며, 일반 온라인 시 무확인 즉시 로그아웃, 오프라인 미전송 시에만 보호 다이얼로그 표시. | - | `npm run test:logout-protection` (8개 시나리오 100% 통과) |
| **Organization** | **정상** | 없음. 단일·다중 사업장 선택, stale 사업장 복원/해제, 포털(학부모/고객) 분기, 차단 사업주 및 신규 온보딩 흐름이 `OrganizationProvider` 단일 컨텍스트로 안정적으로 작동함. | - | `npm run test:org-selection`, `test:org-context-resolve` 통과 |
| **Authorization** | **정상** | 없음. Refine `accessControlProvider`가 호출자 파라미터(`params.role`, `params.organizationId`)를 무시하고 활성 세션 컨텍스트만 참조하여 권한 상승 차단. 미매핑 리소스 Fail-Closed 기본 차단. | - | `npm run test:access-control` 통과 |
| **RLS** | **정상** | 없음. Supabase DB 차원의 테넌트 격리(`organization_id`), SECURITY DEFINER 함수의 `search_path` 고정, 직접 예약 insert 차단 및 멤버십 권한 상승 원천 차단 완료. | - | `npm run test:security-boundary-harden`, `test:rls-membership-policy` 통과 |
| **Refine CRUD** | **정상** | 없음. 원생 인적사항 기본 CRUD는 Refine(`useTable`, `useForm`, `useShow`, `useDelete`)으로 분리 완료. 수납(`recordCombinedPayment`), 출석 차감, 재고 이동 등 복잡한 비즈니스 불변식은 MOA Domain RPC로 보존. | - | `npm run test:student-crud` 통과 |
| **Storage** | **정상** | 없음. Refine TanStack Query(화면 단위 인메모리 쿼리 캐시)와 StorageService(현장 키오스크 연속성, 오프라인 스냅샷, Outbox 큐, 복구)의 책임이 명확히 분리됨. | - | `docs/MOA_DATA_CACHE_BOUNDARY.md` 아키텍처 문서화 완료 |
| **Business Entry** | **정상** | 없음. `로그인 → 세션 → 사업장 선택 → 멤버십 검증 → StorageHydrator → IndustryAppRouter → 업종 화면` 필수 진입 흐름이 `SupabaseAppGate`를 통해 온전히 유지됨. | - | 진입 파이프라인 검증 완료 |
| **Industry** | **정상** | 없음. 70개 업종이 정규화(`normalizeIndustryType`)되어 7개 도메인 모듈로 선언적으로 매핑되며, 신규 업종 추가 시에도 기존 업종 라우팅에 영향 없음. | - | `npm run test:industry-contract`, `test:industry-manifest` 통과 |
| **Dependency** | **정상** | 없음. 불필요한 외부 패키지 추가 없음. 29개 의존성 전수 조사 결과 모두 MIT, Apache-2.0, ISC, BSD-2-Clause 등 Permissive 라이선스이며 GPL/AGPL copyleft 없음. | - | 100% Permissive 오픈소스 라이선스 확인 |
| **Test/Build** | **정상** | 없음. 57개 비즈니스 불변식 전체 통과, 8개 로그아웃 시나리오 통과, 아키텍처 의존성 검사 통과, TypeScript 컴파일 및 Vite 프로덕션 빌드 모두 통과. | - | `test:business-invariants` (57/57), `tsc`, `build` 통과 |

---

## 2. 세부 영역별 점검 내용

### 2.1 Auth 영역
- **단일 소스 로그아웃 (`src/core/auth/services/signOutCoordinator.ts`)**:
  - `Header.tsx`의 Refine `useLogout` 호출 시 `authProvider.logout`이 MOA `signOutCoordinator`를 통해 안전하게 세션을 종료합니다.
  - **조건부 보호**:
    - 온라인 상태이며 미전송 오프라인 데이터가 없을 때는 확인 팝업 없이 즉시 세션을 종료하고 `/login`으로 리다이렉트합니다.
    - 실제 오프라인 pending mutation이 존재할 때만 `prepareSignOut()`으로 flush를 시도하고, 실패 시 `ConfirmDialog`를 띄워 데이터를 보호합니다.
  - **Context Cleanup**:
    - `clearLocalPushTokensForUser`, `resetAppPushRegistrationContext`
    - `StorageService.clearOrganization()`, `orgService.clearStoredOrganizationId()`
    - `StorageService.clearBusinessCachesOnSignOut()`
    - `queryClient.clear()` (TanStack Query 인메모리 캐시 완전 초기화)
    - `authService.signOut()` (Supabase Auth 세션 종료)

### 2.2 Organization & Business Entry 영역
- `SupabaseAppGate.tsx`를 통해 다음 핵심 순서가 보장됩니다:
  1. `AuthProvider`: Supabase Auth 세션 검증
  2. `OrganizationProvider`: 조직 목록 조회 및 활성 조직 복원
  3. 포털 모드 분기: `ParentShell`, `CustomerShell`
  4. 차단 사업주 뷰: `OwnerOperationStoppedView`
  5. 미선택/온보딩 상태: `OrganizationSelector`
  6. 정상 진입: `StorageHydrator` 구동 후 `PendingStaffInviteGate`를 거쳐 `IndustryAppRouter` (또는 Refine 관리 화면) 마운트.

### 2.3 Authorization & Access Control 영역
- `src/providers/accessControlProvider.ts`:
  - 클라이언트가 전달한 `params.role`, `params.organizationId`를 신뢰하지 않고 런타임 활성 컨텍스트(`activeUser.role`, `storedOrganizationId`)만 사용.
  - 알 수 없는 리소스나 액션 요청에 대해 Fail-Closed(`can: false`) 원칙 적용.
  - RLS의 권한 평가 함수(`core.has_permission`)와 1:1로 일치하는 정밀한 권한 검증 수행.

### 2.4 Supabase RLS & 데이터베이스 보안
- 모든 비즈니스 테이블에 RLS가 강제 적용되어 있으며, 테넌트 격리(`organization_id`)를 우회할 수 없습니다.
- 내부용 SECURITY DEFINER 함수는 `search_path = core, public, auth, pg_temp`로 안전하게 고정되어 있고, 직접 예약 테이블 삽입이 차단되어 원자적 RPC를 통해서만 예약이 생성됩니다.

### 2.5 Refine CRUD vs MOA Domain
- **표준 CRUD**: 학생/원생 인적사항(`customers`)은 Refine의 `useTable`, `useForm`, `useShow`, `useDelete`를 통해 표준적으로 처리.
- **도메인 트랜잭션**: 수강료 결제(`record_combined_payment`), 출석 차감(`attendance_status_with_pass_atomic`), 재고 이동(`applyStockMovementAtomic`) 등 복잡한 비즈니스 규칙은 MOA Core RPC로 단일 원장을 유지.

### 2.6 Storage & Cache Boundary
- **Refine / TanStack Query**: 화면 단위 선언적 인메모리 쿼리 캐시(페이징, 필터, 정렬, 폼 상태, 캐시 무효화).
- **StorageService**: 현장 키오스크 연속성을 위한 16개 코어 엔티티 일괄 스냅샷, `localStorage` 오프라인 폴백, 쓰기 지연 Outbox 큐(`moa:pending-mutations`), 네트워크 재연결 시 `runQuietRehydrate`.

### 2.7 Dependency License Matrix
프로덕션 의존성 29개 전수 검사 결과:
- **MIT**: `@refinedev/core`, `@refinedev/react-hook-form`, `@refinedev/react-router`, `@refinedev/supabase`, `@supabase/supabase-js`, `@tanstack/react-query`, `react`, `react-dom`, `react-router`, `react-router-dom`, `recharts`, `motion`, `tailwind-merge` 등 23개
- **Apache-2.0**: `class-variance-authority`, `html5-qrcode`, `xlsx` 3개
- **ISC**: `lucide-react`, `canvas-confetti`, `qrcode.react` 3개
- **BSD-2-Clause**: `dotenv` 1개
- **GPL / AGPL 등 copyleft**: 0건 (완전 배제)

---

## 3. 검증 명령어 및 통과 결과

```bash
npm run test:business-invariants   # 57개 비즈니스 불변식 100% 통과 (elapsed: 114s)
npm run test:logout-protection      # 8개 조건부 로그아웃 보호 시나리오 100% 통과
npm run test:student-crud           # Refine 학생 CRUD 계약 테스트 통과
npm run test:access-control         # Refine AccessControl 및 권한 매핑 테스트 통과
npm run test:architecture           # 아키텍처 의존성 레이어 검증 통과
npm run check:migration-syntax      # 149개 SQL 마이그레이션 문법 검증 통과
npm run check:db-types              # 데이터베이스 타입 정합성 통과
npx tsc --noEmit                    # TypeScript 타입 검사 통과 (0 errors)
npm run build                       # Vite 프로덕션 빌드 성공
```

---

## 4. 최종 결론

MOA-v2의 전체 Foundation 계층은 Refine v5 표준 애플리케이션 도구와 MOA Core의 견고한 비즈니스 불변성, 그리고 Supabase PostgreSQL RLS 보안 경계가 명확하게 조화를 이루고 있으며, 추가적인 코드 수정이 필요한 결함 없이 운영 준비 상태를 갖추었습니다.
