# Moa-v2 AI 개발 지침 (Antigravity Development Rules)

이 파일은 Antigravity 에이전트가 Moa-v2 프로젝트에서 작업할 때 항상 준수해야 하는 최상위 개발 규칙입니다.

---

## 1. Moa-v2 3대 아키텍처 원칙: Core – Capability – Preset

Moa-v2의 최종 아키텍처는 다음 3개 계층으로 단일화된다.
**별도의 Domain Capability 계층은 만들지 않는다.**

```
1. Core        (인증, 테넌트 격리, 공통 권한 기반, 공통 설정, 확장 인터페이스)
      ↓
2. Capability  (독립 업무 영역, 업종 중립적 재사용 도메인 로직)
      ↓
3. Preset      (Capability + 설정 조합, 업종별 사업장 관리 프로그램 구성)
```

---

## 2. 계층별 핵심 규칙

### 2.1 Core 규칙
- **Core는 특정 업종과 개별 Capability의 업무 의미를 몰라야 한다.**
- Core는 인증, 테넌트 격리, 공통 권한 기반, 공통 설정, 확장 인터페이스 등 기반 기능만을 담당한다.
- Core가 `attendance`, `booking`, `inventory`, `piano`, `pilates` 같은 개별 기능이나 업종을 직접 참조하는 구조를 새로 만들지 않는다.
- 단, Capability를 등록하고 실행하기 위한 **일반적인 인터페이스(Generic Interface)**는 허용한다.

### 2.2 Capability 규칙
- **Capability는 독립적인 업무 영역을 담당한다.**
- 여러 업종에서 같은 본질의 업무가 필요하면 **하나의 Capability를 재사용**한다.
- **업종 이름만 달라졌다는 이유로 새로운 Capability를 만들지 않는다.**
- 업종별 차이는 기존 Capability의 설정, 옵션, 정책, 업무 규칙으로 표현할 수 있는지 먼저 검토한다.
- Capability 내부에서 특정 업종에 따른 분기(`if (industry === 'piano')`)를 누적하지 않는다.

### 2.3 Preset 규칙
- **Preset은 필요한 Capability와 설정을 조합해 업종별 사업장 관리 프로그램을 구성한다.**
- **Preset 자체에 중복된 업무 로직을 구현하지 않는다.**
- **업종별 애플리케이션을 복제하지 않는다.**
- 모든 비즈니스 실행은 결합된 Capability의 도메인 로직에 위임한다.

---

## 3. 새로운 Capability 생성 승인 규칙 (6단계 필수 검증)

새로운 Capability를 만들기 전에 에이전트와 개발자는 반드시 다음 6단계를 검토하고 증명해야 한다.

1. **기존 Capability로 해결 가능한가?**
2. **기존 데이터 모델과 설정으로 표현 가능한가?**
3. **옵션이나 업무 규칙으로 해결 가능한가?**
4. **기존 Capability를 조합하면 해결 가능한가?**
5. **기존 기능을 확장하면 해결 가능한가?**
6. **그래도 해결할 수 없다면 독립된 데이터와 업무 흐름이 실제로 존재하는가?**

- 기존 기능을 확장하는 것보다 새 Capability를 만드는 것이 **명확하게 유리한 경우에만** 추가한다.
- 단순한 필드, 버튼, 검색, 알림, 바코드, 통계 같은 요소를 그 자체로 독립 Capability로 만들지 않는다. (독립된 업무 생명주기와 책임이 있는 경우에만 별도 검토)

---

## 4. 안전 및 작업 원칙

1. **문서 우선**: 규칙 개정 단계에서는 문서만 수정하며, 애플리케이션 코드/DB/API/UI를 임의로 변경하지 않는다.
2. **정상 동작 보존**: 기존에 정상 동작하는 코드(레거시 업종 모듈 등)를 함부로 삭제하거나 재작성하지 않는다.
3. **DB 안전**: 승인 없는 DB 마이그레이션을 금지하며, 데이터 무결성은 Supabase RLS와 원자적 RPC로 담보한다.
4. **상세 아키텍처 문서 참조**:
   - `docs/MOA_ARCHITECTURE_BOUNDARIES.md` (전체 아키텍처 경계 및 체크리스트)
   - `docs/MOA_DEPENDENCY_RULES.md` (계층 간 의존성 및 Import 규칙)
   - `docs/MOA_DATA_CACHE_BOUNDARY.md` (Refine vs StorageService 데이터 경계)
   - `docs/MOA_REFINE_RUNTIME.md` (Refine v5 런타임 통합 원칙)

---

## 5. 44개 업종 프리셋 및 61개 원자적 번들(70개 식별자) 규격

1. **Preset 카탈로그 (`src/app/presets/presetRegistry.ts`)**:
   - 44개 업종 프리셋이 선언적으로 등록되어 있으며, `assemblePreset(presetId)` 엔진을 통해 동적 조립된다.
   - 각 프리셋은 신규 애플리케이션 코드를 복제하지 않고, 결합된 Capability 번들의 리소스와 온보딩 스키마를 병합한다.
2. **Capability 번들 및 Alias 체계 (`src/core/presets/types.ts`)**:
   - **61개 원자적 번들(`BundledPresetCapabilityId`, 범주 A~AV)**: `attendance`, `passes`, `locker`, `booking`, `inventory`, `seat_room`, `rental_equipment`, `maintenance_checklist`, `instructor_match`, `shift_schedule`, `task_pipeline`, `billing_invoicing`, `ledger_simple`, `credit_wallet`, `consultation_crm`, `treatment_chart`, `safety_consent`, `curriculum_progress`, `table_order_kds`, `package_split_billing`, `exam_grade_analytics`, `kiosk_staff_call`, `membership_referral_tree`, `hygiene_haccp_log`, `sop_risk_assessment`, `vendor_ap_invoice`, `work_attendance_payroll`, `pickup_orders`, `loyalty_stamp`, `workplace_policy`, `feedbacks`, `trial_funnel`, `learning_journal`, `level_assessment`, `space_turnaround`, `supply_restock`, `makeup_lesson_pass`, `intake_assessment`, `daily_care_report`, `substitute_dispatch`, `entry_pass_ticket`, `event_contest_hub`, `facility_incident_report`, `nps_survey_collector`, `achievement_quest_badge`, `parking_validator`, `emergency_alert_broadcast`, `digital_guestbook`, `digital_contract`, `waitlist_turn_queue`, `survey_quiz_builder`, `lost_found`, `certificate_generator`, `qr_smart_stamp`, `time_block_rental`, `dormitory_bed`, `laundry_drycleaning`, `pet_grooming_hotel`, `photo_shoot_project`, `vehicle_shuttle`, `retention_marketing`.
   - **9개 코어/기반 식별자**: `billing`, `consultation`, `commerce`, `scheduling`, `resources`, `roster`, `enrollment`, `parent`, `transport`.
   - `CAPABILITY_ALIASES`: 코어 식별자는 대응하는 원자적 번들로 자동 매핑되어 코드 중복을 방지한다 (`billing` $\rightarrow$ `billing_invoicing`, `consultation` $\rightarrow$ `consultation_crm`, `commerce` $\rightarrow$ `inventory`, `transport` $\rightarrow$ `vehicle_shuttle` 등).
3. **포털 경계 엄격 격리**:
   - 학부모 포털(`src/modules/parent`)은 사업장 관리자(Director/Staff) 전용 뷰나 리테일 내부 뷰를 직접 import하지 않는다 (`test:architecture`로 자동 차단).
4. **프리셋-런타임 매핑 단일 진실 공급원(SSOT) 규칙**:
   - 업종별 Capability 활성화 여부(`hasIndustryCapability`)는 별도의 수동 매핑 객체를 유지하지 않고, 반드시 `presetRegistry`의 선언적 프리셋 정의(`INDUSTRY_PRESETS[id].capabilities`)를 단일 진실 공급원(SSOT)으로 직접 조회하여 판정한다.
5. **Core Compatibility Shim 동결 및 신규 생성 영구 차단 규칙**:
   - Core 디렉터리(`src/core/`) 내부에서는 `@/capabilities`를 참조하거나 re-export하는 어떠한 신규 파일도 생성할 수 없다. 기존의 호환성 Shim 파일들은 동결(Frozen) 상태로 관리되며, 신규 코드는 반드시 대상 Capability의 원본 경로(`@/capabilities/...`)를 직접 import해야 한다.
6. **Capability 컴포넌트 데이터 페칭 표준 규칙 (Refine 우선 원칙)**:
   - Capability의 표준 관리 UI 컴포넌트는 CRUD 데이터 페칭 시 Refine 프레임워크 훅(`useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete`)을 우선 사용한다. 복합 비즈니스 로직이나 원자적 RPC 호출이 필요한 경우에 한해 도메인 Service 함수를 호출하되, 데이터 변경 후에는 반드시 `crossCacheBridge` 또는 Refine의 캐시 무효화 메커니즘을 통해 상태를 동기화한다.

---

## 6. 사전 검증 및 원스톱 커밋 규칙

모든 코드 수정 후 커밋/푸시 전에는 반드시 단일 원스톱 통합 명령을 실행하여 회귀가 없음을 증명해야 한다.

```bash
npm run check:all
```

- 위 명령은 `lint` $\rightarrow$ `check:ci-structure` $\rightarrow$ `test:architecture` $\rightarrow$ `check:db-types` $\rightarrow$ `test:business-invariants:catalog` $\rightarrow$ `npm test` (58개 전체 테스트 체인)를 일괄 실행한다.
- 모든 검사가 exit code 0으로 통과해야만 정상 완료로 인정한다.
