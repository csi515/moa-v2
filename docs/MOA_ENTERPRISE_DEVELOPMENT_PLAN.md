# Moa-v2 엔터프라이즈 기능 확장 및 부서별 업무 다단계 개발 계획서

> **문서 버전:** 1.0.0  
> **기준 일자:** 2026-10-17  
> **기준 문서:** [docs/MOA_CAPABILITY_AUDIT_AND_GAP_ANALYSIS.md](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/docs/MOA_CAPABILITY_AUDIT_AND_GAP_ANALYSIS.md)  
> **핵심 아키텍처 원칙:** Core – Capability – Preset 3계층 단일화 및 Core 무지(Ignorance) 원칙 준수  

---

## 1. 개요 및 계획 수립 원칙

### 1.1 배경 및 목적
앞선 전수 조사를 통해 Moa-v2는 총 72개 Capability 중 **14개의 검증된 도메인(A등급)**과 **32개의 부분 구현 도메인(B등급)**을 보유하고 있어, 전 부서 76개 요구 기능 중 **80.3%(61건)**를 기존 모듈의 재사용 또는 점진적 확장으로 해결할 수 있음을 확인하였다.

본 개발 계획은 미구현 기능을 성급히 신규 코드로 양산하지 않고, **기존 자산의 재사용 극대화, 멀티테넌트 보안 무결성 확보, CI 테스트 체인 정상화, 전 부서 공통 병목 해소**를 우선으로 하는 **5단계(Phase 0 ~ Phase 4) 다단계 로드맵**을 정의한다.

### 1.2 5대 개발 및 아키텍처 원칙 (`AGENTS.md` 준수)
1. **Core-Capability-Preset 3계층 단일화:** "Domain Capability" 같은 중간 계층을 일절 만들지 않는다.
2. **Core의 무지 원칙:** Core는 개별 Capability의 구체 업무 의미를 몰라야 하며, 동적 레지스트리 슬롯 인터페이스만 제공한다.
3. **Capability 중복 단일화:** 동일 본질의 업무(예: `task_pipeline`과 `work_order_kanban`)는 하나의 Capability로 단일화하며, 업종별 차이는 설정(setupSchema/businessRules)으로 흡수한다.
4. **Refine 프레임워크 표준 바인딩:** 표준 관리 UI는 Refine 훅(`useList`, `useCreate`, `useUpdate`)을 우선 사용하며, `localStorage` 기반 목업을 전면 퇴출하고 Supabase RLS로 테넌트 격리를 담보한다.
5. **원스톱 무회귀 검증:** 각 Phase 완료 시마다 반드시 `npm run check:all` (58개 전체 테스트) exit code 0을 달성해야만 완료로 인정한다.

---

## 2. 다단계 개발 로드맵 총괄 요약

```
┌────────────────────────────────────────────────────────────────────────┐
│  Phase 0: 기반 정합성 복구 및 긴급 보안 격리 (안정화)                   │
│  - CI 실패 복구 (mbo 공공 API 계약 등록 및 index.ts 작성)              │
│  - 18개 LocalStorage 모듈 테넌트 캐시 오염 방지 가드 적용              │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│  Phase 1: 전 부서 공통 핵심 기반 구축 (공통 결손 해소)                   │
│  - 전사 범용 전자결재 (approval_workflow) 신규 Capability 구축        │
│  - 작업 공정 파이프라인 (task_pipeline) DB 영속화 & work_order 흡수     │
│  - 범용 설비/안전 점검 체크리스트 (maintenance_checklist) DB화         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│  Phase 2: 비즈니스 핵심 업무 도메인 확장 (부서별 고도화)                │
│  - MBO 성과관리 (mbo) 프론트엔드 UI 구축 및 평가 뷰 완성                │
│  - 구매/발주 관리 (supply_restock) PR·견적비교·PO 상태 연계 확장       │
│  - 재고 관리 (inventory) 로트 번호, 유효기간, 창고 구역 추적성 확장     │
│  - 전문 품질검사 (quality_inspection) 신규 Capability 구축 (규격/AQL)  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│  Phase 3: 전문 운영 및 통합 편의성 고도화 (거버넌스 & 통합)             │
│  - 공정/제품 4M 변경관리 (change_management) ECN/ECO 신규 구축        │
│  - 리드(trial_funnel) - 영업/상담(consultation_crm) 원자적 브릿지 연계 │
│  - 통합 리스크/위험 대시보드 (사고/VOC/NPS 지표 결합)                  │
│  - 레거시 호환 Shim 디렉터리 (finance, parent, transport) 정리         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│  Phase 4: 엔터프라이즈 프리셋 조립 및 외부 연계 게이트웨이 (완성)        │
│  - 엔터프라이즈 프리셋 선언적 조립 (제조/유통/일반기업 프리셋 카탈로그) │
│  - 외부 연계 표준 웹훅 게이트웨이 (MES, 전문 ELN, 외부 웹폼)            │
│  - E2E 멀티테넌트 침투 및 부하/동시성 성능 검증                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase별 상세 개발 명세

---

### [Phase 0] 기반 정합성 복구 및 긴급 보안 격리 (Hotfix & Stabilization)

#### 1) 목적
- 현재 `npm test` 실행 시 계약 불일치로 실패하는 CI 파이프라인을 복구하여 무회귀 자동 검증 체계를 정상화한다.
- 18개 LocalStorage 모듈의 테넌트 간 데이터 침범 위험을 긴급 차단한다.

#### 2) 세부 작업 명세
- **[Task 0-1] `mbo` Capability 공공 API 계약 동기화 및 진입점 신설**
  - 대상 파일:
    - `src/capabilities/_shared/capabilityTypes.ts`: `CAPABILITY_IDS` 배열에 `'mbo'` 추가
    - `src/capabilities/mbo/index.ts`: `export { mboCapability } from './manifest';` 작성
    - `src/capabilities/index.ts`: `mbo` 배럴 export 등록
    - `src/app/presets/presetRegistry.ts`: `mbo` 스키마 및 리소스 번들 등록
  - 완료 기준: `npm run test:capability-public-api` 통과 (AssertionError 해소)
- **[Task 0-2] LocalStorage 기반 18개 모듈 테넌트 키 접두사 격리**
  - 대상 모듈: `task_pipeline`, `work_order_kanban`, `recipe_bom`, `table_order_kds` 등 18개 모듈
  - 작업 내용:
    - 브라우저 스토리지 키를 `moa_${organizationId}_${key}`로 동적 주입하도록 안전 유틸(`getTenantStorageKey`) 적용
  - 완료 기준: 테넌트 A 계정 로그아웃 후 테넌트 B 로그인 시 A의 로컬 데이터 노출 차단
- **[Task 0-3] CI 원스톱 빌드 검증**
  - 실행 명령: `npm run check:all` (58개 테스트 전체 통과 확인)

---

### [Phase 1] 전 부서 공통 핵심 기반 구축 (Cross-Department Core Foundations)

#### 1) 목적
- 마케팅, 구매, 재무, 인사, IT 전 부서에서 가장 시급히 요구되는 "다단계 전자결재" 결손을 해결한다.
- 중복 개발된 작업 관리 모듈(`task_pipeline`, `work_order_kanban`)을 단일화하고 DB 영속화를 달성한다.
- 범용 설비/안전 점검 체크리스트를 Supabase DB로 바인딩한다.

#### 2) 세부 작업 명세
- **[Task 1-1] 전사 범용 전자결재 (`approval_workflow`) Capability 신설**
  - 신규 마이그레이션:
    - `core.approval_templates`: 부서별 결재 양식 템플릿 (휴가, 지출, 구매, 작업승인)
    - `core.approval_requests`: 결재 기안 문서 및 현재 상태 (`draft`, `pending`, `approved`, `rejected`)
    - `core.approval_steps`: 단계별 결재자, 결재 유형(`approval`, `review`, `consensus`), 서명 및 의견
  - Capability 구현: `src/capabilities/approval_workflow/`
    - `domain/approvalEngine.ts`: 다단계 전결 규정 및 상태 머신
    - `ui/ApprovalRequestListView.tsx`, `ui/ApprovalDetailModal.tsx`
    - 타 도메인 연계 인터페이스: `entity_type`, `entity_id` 다형성 바인딩
  - 테넌트 보안: `organization_id` RLS 및 결재자 권한 검증 RPC
- **[Task 1-2] 작업 공정 파이프라인 (`task_pipeline`) DB 영속화 및 단일화**
  - 신규 마이그레이션:
    - `core.task_orders`: 작업 주문 번호, 고객/품목 정보, 현재 단계, SLA 시간, 담당자 ID
    - `core.task_order_timelines`: 단계 전이 이력, 소요시간 불변 로그
  - Capability 리팩토링:
    - `TaskPipelineKanbanView.tsx`를 `localStorage`에서 Refine `useList` / `useUpdate` 기반으로 전면 교체
    - `work_order_kanban` 모듈의 고유 기능을 `task_pipeline` 프리셋 설정(`orderType: 'repair' | 'manufacturing'`)으로 흡수
    - `work_order_kanban`은 하위 호환 shim 선언 후 단일화
- **[Task 1-3] 범용 설비/안전 점검 체크리스트 (`maintenance_checklist`) DB화**
  - 마이그레이션 활용: `core.checklist_templates`, `core.checklist_items`, `core.ops_tasks`
  - 컴포넌트 Refine 바인딩: 점검 결과 저장 시 `core.checklist_items`에 원자적 인서트 및 불합격 항목 플래그 처리

---

### [Phase 2] 비즈니스 핵심 업무 도메인 확장 (Departmental Domain Expansion)

#### 1) 목적
- 연구개발/인사의 핵심인 MBO 성과관리 시스템을 완성한다.
- 구매 및 재고 관리의 산업 표준 요건(로트 번호, 유효기간, 견적 비교)을 충족한다.
- 전문 품질관리(QA/QC) 도메인을 신설하여 정량 공차 판정 및 불량 CAPA를 처리한다.

#### 2) 세부 작업 명세
- **[Task 2-1] MBO 목표 및 성과관리 (`mbo`) 프론트엔드 UI 구축**
  - 대상 DB: `core.mbo_projects`, `core.mbo_objectives`, `core.mbo_evaluations`, `core.mbo_progress_logs`
  - UI 컴포넌트 신규 작성 (`src/capabilities/mbo/ui/`):
    - `MboObjectiveTreeViewer.tsx`: 목표 및 핵심 결과(KPI) 가중치(합계 100%) 시각화
    - `MboQuarterlyReviewForm.tsx`: 분기별 진행 로그 작성 및 상사 피드백 코멘트
    - `MboEvaluationMatrixView.tsx`: 자기평가/동료평가/상향평가 다면 평가 점수표
  - Refine 리소스 등록 및 권한 격리 (타인의 기밀 평가 열람 차단 RLS 검증)
- **[Task 2-2] 구매 및 공급업체 관리 (`supply_restock`) 고도화**
  - 스키마 확장:
    - `core.purchase_requisitions` (구매 요청서 PR)
    - `core.vendor_quotes` (공급업체별 견적 비교 대사표)
  - 연계 흐름:
    - 현장 자재 부족 -> 구매 요청(PR) -> Phase 1 전자결재 승인 -> 발주(PO) 생성 -> 입고 검수
- **[Task 2-3] 재고 관리 (`inventory`) 로트·유효기간·창고구역 추적성 확장**
  - 스키마 확장:
    - `core.stock_movements`에 `lot_number`, `expiry_date`, `source_location_id`, `destination_location_id` 컬럼 추가
  - RPC 갱신: `apply_stock_movement_atomic`에 로트별 재고 집계 및 유효기간 만료 우선 출고(FEFO/FIFO) 로직 추가
- **[Task 2-4] 전문 품질검사 (`quality_inspection`) Capability 신설**
  - 신규 마이그레이션:
    - `core.quality_inspection_standards`: 품목별 검사 기준(측정 단위, 규격 Min/Max, 목표치, 샘플링 크기)
    - `core.quality_inspection_records`: 측정 실측치 기록, 자동 합격/불합격 판정
  - 연계 흐름: 불합격 판정 시 `core.facility_incident_reports`(부적합 보고서) 자동 발행 및 알림 통지

---

### [Phase 3] 전문 운영 및 통합 편의성 고도화 (Advanced Governance & Integration)

#### 1) 목적
- 공정/제품 사양 변경(4M) 승인 체계를 정립한다.
- 유입 리드와 고객 CRM의 데이터를 원자적으로 연결하여 영업 기회 관리를 완성한다.
- 위험/사고/VOC 통합 대시보드를 구축하고, 레거시 호환 Shim을 정리한다.

#### 2) 세부 작업 명세
- **[Task 3-1] 공정/사양 4M 변경관리 (`change_management`) 신설**
  - 엔지니어링 변경 공지(ECN/ECO): 설비, 원자재, 작업방법, 작업자 변경 시 사전 승인 및 영향도 평가 워크플로
- **[Task 3-2] 리드 파이프라인(`trial_funnel`)과 상담 CRM(`consultation_crm`) 브릿지 연계**
  - 리드 칸반에서 "상담 예약" 전이 시 `core.consultations` 레코드 자동 생성
  - "등록/계약 완료" 전이 시 `core.customers` 및 결제 트랜잭션 원자적 연결
- **[Task 3-3] 부서별 통합 리스크 대시보드 구축**
  - `facility_incident_report`(안전사고), `feedbacks`(VOC 불만), `nps_survey_collector`(NPS 점수), `billing_invoicing`(미수금)을 결합한 통합 위험 지수 위젯 제공
- **[Task 3-4] 레거시 Shim 디렉터리 정리 및 클린업**
  - `src/capabilities/finance` (billing/finance로 통합 완료된 구 shim) 클린업
  - `src/capabilities/parent`, `transport`의 불필요한 중복 레이어 정리

---

### [Phase 4] 엔터프라이즈 프리셋 조립 및 외부 연계 게이트웨이 (Enterprise Preset & Gateways)

#### 1) 목적
- 신규 구축 및 확장된 Capability를 조합하여 제조, 유통, 일반 기업 관리용 프리셋을 선언적으로 등록한다.
- 외부 MES, ELN, 웹폼 연동을 위한 표준 웹훅 게이트웨이를 제공한다.
- E2E 멀티테넌트 침투 및 동시성 부하 테스트를 통해 엔터프라이즈급 안정성을 증명한다.

#### 2) 세부 작업 명세
- **[Task 4-1] 엔터프라이즈 신규 프리셋 카탈로그 선언 (`src/app/presets/presetRegistry.ts`)**
  - 신규 프리셋 등록 (비즈니스 코드 복제 없이 오직 조합 선언):
    1. `general_enterprise`: `approval_workflow`, `task_pipeline`, `workplace_policy`, `mbo`, `feedbacks`
    2. `manufacturing_light`: `task_pipeline`, `quality_inspection`, `inventory`, `supply_restock`, `sop_risk_assessment`
    3. `procurement_distribution`: `supply_restock`, `inventory`, `approval_workflow`, `billing_invoicing`, `vendor_ap_invoice`
- **[Task 4-2] 표준 외부 연계 웹훅 게이트웨이**
  - 공장 MES 생산 실적 수신 웹훅: 실적 카운트 수신 시 `task_pipeline` 진척도 자동 갱신
  - 웹사이트 마케팅 폼 웹훅: 리드 자동 인입 시 `trial_funnel` 접수 단계 자동 등록
- **[Task 4-3] E2E 테넌트 침투 및 성능 무결성 검증**
  - Playwright E2E 테스트 및 1,000건 동시 입출고/결재 트랜잭션 원자성(Atomic) 검증

---

## 4. Phase별 의존성 및 안전 완화 매트릭스

| Phase | 주요 선행 조건 | 잠재적 회귀 위험 | 안전 및 완화 대책 |
|:---:|:---|:---|:---|
| **Phase 0** | 없음 (즉시 수행) | 계약 선언 수정 시 타입 빌드 오류 | `npm run lint` 및 `test:capability-public-api` 로컬 샌드박스 사전 검증 |
| **Phase 1** | Phase 0 완료 (CI 그린) | `task_pipeline` 전환 시 기존 로컬 데이터 유실 | 기존 LocalStorage 데이터를 읽어 신규 DB로 마이그레이션하는 1회성 브릿지 유틸 제공 |
| **Phase 2** | Phase 1 전자결재 완료 | 재고 RPC 스키마 변경 시 기존 판매 수납 충돌 | 기존 `apply_stock_movement_atomic`의 시그니처를 유지하고 옵셔널 파라미터(`p_lot_number`)로 하위 호환 보장 |
| **Phase 3** | Phase 2 스키마 안정화 | Shim 삭제 시 외부 import 경로 깨짐 | `scripts/check-architecture-dependencies.mjs` 정적 분석을 통해 미사용 참조 확인 후 삭제 |
| **Phase 4** | Phase 1~3 전체 통과 | 신규 프리셋 조합 시 라우팅 충돌 | `test:preset-assembler` 및 `test:preset-runtime-parity` 자동 검증 체계 통과 필수 |

---

## 5. 완료 기준 (Definition of Done) 및 원스톱 검증

모든 단계의 각 작업 및 최종 Phase 완료 시에는 예외 없이 다음 통합 검증을 통과해야 한다:

```bash
npm run check:all
```

- **상세 검증 체인:**
  1. `npm run lint` (타입스크립트 컴파일 무오류 `tsc --noEmit`)
  2. `npm run check:ci-structure` (CI 워크플로 정합성)
  3. `npm run test:architecture` (레이어 경계, Core 무지 원칙, Shim 프리즈 검사)
  4. `npm run check:db-types` (Supabase DB 타입과 엔티티 일치)
  5. `npm run test:business-invariants:catalog` (업종 프리셋 카탈로그 정합성)
  6. `npm test` (58개 전체 비즈니스 불변성 단위/계약/통합 테스트 체인)
