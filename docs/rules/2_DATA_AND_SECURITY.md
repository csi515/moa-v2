# 2. Moa-v2 데이터 및 보안 규칙 (Data & Security Rules)

> **문서 버전:** 2.0.0  
> **상위 헌법:** [AGENTS.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/AGENTS.md)  
> **상세 참조:** [docs/MOA_DATA_CACHE_BOUNDARY.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/MOA_DATA_CACHE_BOUNDARY.md), [docs/MOA_REFINE_RUNTIME.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/MOA_REFINE_RUNTIME.md)

---

## 1. 멀티테넌트 격리 및 RLS 원칙

1. **Supabase RLS(Row-Level Security) 절대 의무화**:
   - 모든 테넌트 데이터 테이블은 반드시 RLS가 활성화되어야 하며, `organization_id` 기반 격리 정책이 강제된다.
   - 클라이언트 측 필터링(`where org_id = ...`)에만 보안을 의존하지 않는다.
2. **원자적 RPC 트랜잭션 보장**:
   - 수납 결제, 수강권 차감, 출결 체크, 포인트 적립 등 금융/이력과 관련된 다중 테이블 변경은 클라이언트 다중 호출을 금지하고, 반드시 단일 PostgreSQL 원자적 RPC 함수(`atomic_*`)로 트랜잭션을 보장한다.

---

## 2. Refine 우선 데이터 페칭 및 캐시 동기화 표준

1. **Refine CRUD 훅 우선 사용 원칙**:
   - Capability의 표준 관리 UI는 데이터 조회/수정 시 Refine 프레임워크 훅(`useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete`)을 우선 사용한다.
2. **복합 도메인 서비스 및 캐시 무효화 브릿지**:
   - 원자적 RPC나 복합 로직으로 인해 도메인 Service 함수를 직접 호출한 경우, 작업 완료 즉시 [`crossCacheBridge`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/core/query/crossCacheBridge.ts) 또는 Refine 캐시 무효화(`invalidate({ resource })`)를 호출하여 UI 캐시 불일치를 방지한다.
3. **StorageService 테넌트 키 격리**:
   - 브라우저 스토리지(LocalStorage) 사용 시 반드시 `moa_${organizationId}_${key}` 형태로 테넌트 접두사를 격리하여 계정 전환 시 캐시 오염을 차단한다.

---

## 3. DB 마이그레이션 안전 원칙 (Expand & Contract)

1. **승인 없는 파괴적 마이그레이션 영구 금지**:
   - 운영 중인 컬럼 삭제, 테이블 드롭, 기존 제약조건 변경 등은 사전 승인 및 마이그레이션 린트(`npm run check:migrations`)를 필수 통과해야 한다.
2. **무중단 점진 마이그레이션**:
   - 스키마 변경 시 신규 컬럼 추가(Expand) $\rightarrow$ 코드 반영 $\rightarrow$ 기존 컬럼 정리(Contract) 2단계 원칙을 준수한다.

---

## 4. 비즈니스 일자 및 타임존 결정론 (Temporal Determinism)

1. **도메인 내 비결정론적 `new Date()` 직접 호출 금지**:
   - 기기 로컬 타임존이나 UTC 변환 오차로 인해 출결 날짜나 수강권 만료일이 하루씩 틀어지는 것을 방지하기 위해 도메인 코드에서 날것의 `new Date().toISOString()` 호출을 지양한다.
2. **사업장 기준 타임존(`Asia/Seoul`) 정규화**:
   - 출결 일자, 수업 세션 시간표, 정산 마감일 등 모든 비즈니스 날짜는 프로젝트 표준 유틸을 통해 테넌트의 기준 시간대로 정규화(`toBusinessDateString`)하여 DB에 영속화한다.

---

## 5. 비즈니스 불변성 테스트(Business Invariants) 의무화

1. **핵심 도메인 불변성 검증 동봉**:
   - 결제/수납, 수강권 차감, 출결, 시간표 예약 등 핵심 비즈니스 로직을 수정할 때 반드시 불변성 테스트(`*.invariant.test.ts`)를 작성하거나 갱신해야 한다.
2. **절대 위반 불가 불변식 (Invariants)**:
   - "잔여 수강 횟수나 크레딧 지갑은 음수(< 0)가 될 수 없다."
   - "동일 시간대/공간에 최대 정원(Capacity)을 초과한 중복 예약은 불가하다."
   - "한 테넌트의 요청이 타 테넌트의 데이터에 단 1건이라도 영향을 줄 수 없다."
   - 변경 후 `npm test`(`npm run test:business-invariants`)를 반드시 통과해야 한다.

---

## 6. 기능 플래그 및 점진적 롤아웃 운영 규칙 (Feature Flag & Canary Release Contract)

비즈니스 위험도가 높은 핵심 기능 변경 시 전사 장애 전파를 방지하기 위해 기능 플래그를 통한 점진적 배포를 준수한다.

1. **파괴적 신기능의 기본값 OFF 원칙**:
   - 신규 정산 엔진, 시간표 자동 배치, 대규모 결제 플로우 등 비즈니스 민감도가 높은 신기능은 [`FeatureGate`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/core/flags/FeatureGate.tsx) 컴포넌트 또는 [`useFeatureFlag`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/core/flags/useFeatureFlag.ts)로 감싸 기본값 `false`로 배포한다.
2. **소프트 런칭 테넌트 선검증 (Canary Pilot)**:
   - 전사 오픈 전에 파일럿 테넌트(소프트 런칭 학원 등)에서 1~2주간 실운영 데이터를 모니터링한 뒤, 이상이 없을 때 전체 테넌트를 대상으로 점진 활성화한다.


