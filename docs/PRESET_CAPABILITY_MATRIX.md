# Moa-v2 사업장 종류별 필요 기능 매트릭스 (Preset Capability Matrix SSOT)

> **불변 원칙 (Constitution)**: Core는 업종을 모르고, Capability는 업종 중립적이며, Preset은 업종별 Capability 조합을 선언적으로 정의합니다.
> 본 문서는 Moa-v2에 등록된 **총 52개 업종별 프리셋**과 **59개 재사용 기능(Capability)**의 연계 구성을 정의하는 단일 진실 공급원(SSOT)입니다.
> 
> *자동 생성 및 검증: `npm run check:preset-parity`*

---

## 1. 범례 및 기능 구성 규칙

* 🔴 **필수 (Required)**: 해당 사업장 운영의 핵심 불변 기능으로, 비활성화가 불가능함 (`requiredCapabilities`).
* 🟢 **기본 활성화 (Default Active)**: 프리셋 선택 시 기본 활성화되며, 원장/관리자가 스위치보드에서 토글 가능함 (`capabilities`).
* ⚪ **선택 부가 (Add-on)**: 기본값은 비활성화이나 필요 시 스위치보드에서 추가 활성화 가능.
* ❌ **미지원 / 비권장 (N/A)**: 해당 업종 업무 도메인과 무관함.

---

## 2. 7대 산업군별 프리셋 요약 및 도메인 용어 매트릭스

| 산업군 | 업종 수 | 대표 업종 | 주요 도메인 용어 (고객 / 공간 / 담당자) |
| :--- | :---: | :--- | :--- |
| **1. 교육 및 학원** | 10개 | 피아노·음악학원, 일반 보습학원, 어학원 등 | 원생/회원/고객, 연습실/룸/좌석, 강사/디자이너 등 |
| **2. 웰니스 및 피트니스** | 8개 | 필라테스 스튜디오, 요가 스튜디오, 헬스장 / 피트니스 센터 등 | 원생/회원/고객, 연습실/룸/좌석, 강사/디자이너 등 |
| **3. 뷰티 및 케어** | 8개 | 헤어샵 / 뷰티 살롱, 바버숍, 네일숍 등 | 원생/회원/고객, 연습실/룸/좌석, 강사/디자이너 등 |
| **4. 공간 및 숙박** | 7개 | 스터디카페 / 공간대여, 공유오피스, 공간대여·대관업 등 | 원생/회원/고객, 연습실/룸/좌석, 강사/디자이너 등 |
| **5. 리테일 및 F&B** | 6개 | 일반 소매점, 의류매장, 편의점 등 | 원생/회원/고객, 연습실/룸/좌석, 강사/디자이너 등 |
| **6. 라이프 서비스 및 정비** | 6개 | 자동차 정비소, 청소·방문 서비스 업체, 반려동물 호텔·유치원 등 | 원생/회원/고객, 연습실/룸/좌석, 강사/디자이너 등 |
| **7. 기업 및 특수 도메인** | 7개 | 일반 기업 / 경영관리, 제조·가공업 (공정/BOM/품질 관리), 도소매 / 자재 유통업 등 | 원생/회원/고객, 연습실/룸/좌석, 강사/디자이너 등 |

---

## 3. 산업군별 상세 프리셋 및 필요 기능 정의

### 1. 교육 및 학원 (Education & Academy)

> 원생 출결, 수강권(회수/기간), 레슨 시간표, 학부모 알림 및 진도 관리 중심

| 업종 ID | 국문 명칭 | 완성도 | 고객 호칭 | 공간 호칭 | 필수 기능 (Required) | 기본 활성화 기능 (Capabilities) |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `piano` | **피아노·음악학원** | `verified` | 원생 | 연습실 | `attendance`, `passes`, `billing_invoicing` | `seat_room`, **`attendance`**, **`passes`**, **`billing_invoicing`**, `consultation_crm` |
| `general_academy` | **일반 보습학원** | `basic_ui` | 원생 | 강의실 | `attendance`, `billing_invoicing`, `passes` | **`attendance`**, **`billing_invoicing`**, `consultation_crm`, **`passes`**, `curriculum_progress`, `retention_marketing`, `vehicle_shuttle`, `exam_grade_analytics`, `membership_referral_tree` |
| `language_academy` | **어학원** | `basic_ui` | 수강생 | 실습실/랩실 | `attendance`, `passes`, `billing_invoicing` | **`attendance`**, `booking`, **`passes`**, **`billing_invoicing`**, `consultation_crm`, `curriculum_progress`, `vehicle_shuttle`, `exam_grade_analytics` |
| `art_academy` | **미술학원** | `basic_ui` | 원생 | 실기실 | `attendance`, `billing_invoicing`, `passes` | **`attendance`**, **`billing_invoicing`**, `inventory`, **`passes`**, `curriculum_progress`, `vehicle_shuttle` |
| `taekwondo_academy` | **태권도장** | `basic_ui` | 수련생/관원 | 수련실/도장 | `attendance`, `passes`, `billing_invoicing` | **`attendance`**, **`passes`**, **`billing_invoicing`**, `safety_consent`, `curriculum_progress`, `vehicle_shuttle`, `membership_referral_tree`, `loyalty_stamp` |
| `dance_academy` | **무용·댄스학원** | `basic_ui` | 수강생 | 연습홀 | `attendance`, `passes`, `seat_room` | **`attendance`**, `booking`, **`passes`**, **`seat_room`**, `billing_invoicing`, `curriculum_progress` |
| `coding_academy` | **코딩·IT 학원** | `basic_ui` | 수강생 | PC실습실 | `attendance`, `seat_room`, `billing_invoicing` | **`attendance`**, **`seat_room`**, **`billing_invoicing`**, `task_pipeline`, `curriculum_progress`, `exam_grade_analytics` |
| `exam_tutoring` | **입시·과외 학원** | `basic_ui` | 학생 | 상담지도실 | `attendance`, `consultation_crm`, `billing_invoicing` | **`attendance`**, **`consultation_crm`**, **`billing_invoicing`**, `shift_schedule`, `curriculum_progress`, `exam_grade_analytics` |
| `culture_center` | **문화센터·평생교육원** | `verified` | 회원/수강생 | 강의실/실습실 | `booking`, `instructor_match`, `seat_room`, `commission_payroll`, `digital_contract` | **`booking`**, **`instructor_match`**, **`seat_room`**, **`commission_payroll`**, **`digital_contract`**, `passes`, `attendance`, `billing_invoicing`, `feedbacks` |
| `daycare` | **어린이집·유치원** | `persisted` | 원아/학부모 | 보육실(반) | `attendance`, `billing_invoicing` | **`attendance`**, **`billing_invoicing`**, `consultation_crm`, `safety_consent`, `vehicle_shuttle`, `hygiene_haccp_log` |

### 2. 웰니스 및 피트니스 (Wellness & Fitness)

> 회원권 패스, 시설 락커, 수업/PT 예약, 운동 출결 및 강사 매칭 중심

| 업종 ID | 국문 명칭 | 완성도 | 고객 호칭 | 공간 호칭 | 필수 기능 (Required) | 기본 활성화 기능 (Capabilities) |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `pilates` | **필라테스 스튜디오** | `verified` | 회원 | 기구룸/개인실 | `booking`, `passes`, `instructor_match` | **`booking`**, **`passes`**, **`instructor_match`**, `seat_room`, `locker`, `diet_body_log`, `commission_payroll`, `digital_contract`, `equipment_lifecycle`, `membership_referral_tree`, `promotional_deal` |
| `yoga_studio` | **요가 스튜디오** | `basic_ui` | 회원/요기 | 요가룸 | `booking`, `passes`, `attendance` | **`booking`**, **`passes`**, **`attendance`**, `locker`, `seat_room`, `diet_body_log`, `promotional_deal` |
| `gym_fitness` | **헬스장 / 피트니스 센터** | `persisted` | 회원 | 운동존/머신존 | `passes`, `attendance`, `locker` | **`passes`**, **`attendance`**, **`locker`**, `rental_equipment`, `ledger_simple`, `retention_marketing`, `diet_body_log`, `lost_found`, `digital_contract`, `equipment_lifecycle`, `package_split_billing`, `sop_risk_assessment`, `work_attendance_payroll`, `promotional_deal` |
| `pt_fitness` | **1:1 피트니스 / PT 샵** | `basic_ui` | 회원 | PT존/세션룸 | `passes`, `booking`, `instructor_match` | **`passes`**, **`booking`**, **`instructor_match`**, `consultation_crm`, `locker`, `curriculum_progress`, `retention_marketing`, `diet_body_log`, `commission_payroll`, `digital_contract`, `deposit_escrow`, `membership_referral_tree`, `promotional_deal` |
| `indoor_golf` | **실내 골프연습장** | `basic_ui` | 회원 | 타석/룸 | `passes`, `booking`, `locker` | **`passes`**, **`booking`**, **`locker`**, `rental_equipment`, `ledger_simple`, `curriculum_progress`, `diet_body_log`, `commission_payroll`, `lost_found`, `seat_timer_billing`, `package_split_billing`, `kiosk_staff_call`, `sop_risk_assessment` |
| `swim_school` | **수영장·수영교실** | `basic_ui` | 회원/원생 | 수영레인 | `attendance`, `passes`, `locker` | **`attendance`**, **`passes`**, `booking`, **`locker`**, `safety_consent`, `curriculum_progress`, `diet_body_log`, `vehicle_shuttle`, `lost_found`, `sop_risk_assessment` |
| `climbing_activity` | **클라이밍 & 액티비티 짐** | `basic_ui` | 클라이머/회원 | 볼더링월/지구력존 | `passes`, `attendance`, `safety_consent` | **`passes`**, **`attendance`**, `rental_equipment`, **`safety_consent`**, `locker`, `diet_body_log`, `lost_found`, `waitlist_turn_queue` |
| `boxing_mma` | **복싱·격투기 체육관** | `basic_ui` | 관원/회원 | 링/샌드백존 | `passes`, `attendance`, `safety_consent` | **`passes`**, **`attendance`**, `locker`, **`safety_consent`**, `rental_equipment`, `diet_body_log` |

### 3. 뷰티 및 케어 (Beauty & Care)

> 시술 예약, 차트/상담 CRM, 디자이너 배정, 시술권 및 재고 관리 중심

| 업종 ID | 국문 명칭 | 완성도 | 고객 호칭 | 공간 호칭 | 필수 기능 (Required) | 기본 활성화 기능 (Capabilities) |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `hair_salon` | **헤어샵 / 뷰티 살롱** | `basic_ui` | 고객 | 시술체어 | `booking`, `treatment_chart`, `shift_schedule` | **`booking`**, **`treatment_chart`**, **`shift_schedule`**, `ledger_simple`, `inventory`, `commission_payroll`, `treatment_portfolio`, `waitlist_turn_queue`, `membership_referral_tree`, `vendor_ap_invoice`, `work_attendance_payroll` |
| `barber_shop` | **바버숍** | `basic_ui` | 고객 | 바버체어 | `booking`, `shift_schedule` | **`booking`**, **`shift_schedule`**, `ledger_simple`, `inventory`, `treatment_portfolio` |
| `nail_salon` | **네일숍** | `basic_ui` | 고객 | 네일테이블/베드 | `booking`, `passes` | **`booking`**, **`passes`**, `treatment_chart`, `inventory`, `ledger_simple`, `commission_payroll`, `treatment_portfolio` |
| `skin_clinic` | **피부관리실·에스테틱** | `persisted` | 고객/회원 | 케어룸/스킨케어실 | `booking`, `passes`, `treatment_chart` | **`booking`**, **`passes`**, **`treatment_chart`**, `consultation_crm`, `inventory`, `commission_payroll`, `package_split_billing` |
| `massage_spa` | **마사지·스파** | `basic_ui` | 고객 | 스파룸/베드 | `booking`, `seat_room`, `shift_schedule` | **`booking`**, `passes`, **`shift_schedule`**, **`seat_room`**, `ledger_simple` |
| `tattoo_studio` | **타투 스튜디오** | `basic_ui` | 의뢰인/고객 | 작업부스 | `booking`, `safety_consent` | **`booking`**, **`safety_consent`**, `consultation_crm`, `task_pipeline` |
| `photo_studio` | **사진 스튜디오** | `basic_ui` | 고객/모델 | 스튜디오/호수 | `booking`, `seat_room`, `task_pipeline` | **`booking`**, `rental_equipment`, **`seat_room`**, **`task_pipeline`**, `ledger_simple`, `deposit_escrow` |
| `pet_grooming` | **반려동물 미용실** | `basic_ui` | 보호자/반려견 | 미용부스/드라이룸 | `booking`, `treatment_chart` | **`booking`**, `consultation_crm`, **`treatment_chart`**, `ledger_simple` |

### 4. 공간 및 숙박 (Space & Hospitality)

> 좌석/룸/스터디존 배정, 시간제 티켓, 락커 보관, 시설 정비 체크리스트 중심

| 업종 ID | 국문 명칭 | 완성도 | 고객 호칭 | 공간 호칭 | 필수 기능 (Required) | 기본 활성화 기능 (Capabilities) |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `study_cafe` | **스터디카페 / 공간대여** | `basic_ui` | 이용자/회원 | 좌석/스터디룸 | `seat_room`, `passes` | **`seat_room`**, **`passes`**, `locker`, `maintenance_checklist`, `lost_found`, `seat_timer_billing`, `kiosk_staff_call`, `work_attendance_payroll` |
| `shared_office` | **공유오피스** | `basic_ui` | 입주사/멤버 | 핫데스크/미팅룸 | `seat_room`, `billing_invoicing` | **`seat_room`**, `passes`, **`billing_invoicing`**, `maintenance_checklist`, `booking`, `mbo`, `approval_workflow` |
| `space_rental` | **공간대여·대관업** | `basic_ui` | 예약자/게스트 | 파티룸/홀 | `booking`, `seat_room` | **`booking`**, **`seat_room`**, `ledger_simple`, `maintenance_checklist`, `seat_timer_billing`, `deposit_escrow` |
| `locker_storage` | **사물함·개인창고 대여업** | `basic_ui` | 이용자/회원 | 창고유닛/락커 | `locker`, `billing_invoicing` | **`locker`**, `passes`, **`billing_invoicing`**, `maintenance_checklist` |
| `guesthouse` | **게스트하우스** | `basic_ui` | 게스트/투숙객 | 도미토리/객실 | `booking`, `seat_room` | **`booking`**, **`seat_room`**, `maintenance_checklist`, `ledger_simple` |
| `small_hotel` | **소형 호텔 / 부티크 호텔** | `basic_ui` | 투숙객/고객 | 객실 | `booking`, `seat_room`, `maintenance_checklist` | **`booking`**, **`seat_room`**, **`maintenance_checklist`**, `shift_schedule`, `ledger_simple` |
| `sauna_jjimjilbang` | **사우나·찜질방** | `persisted` | 고객 | 사물함 | `locker`, `passes` | **`locker`**, **`passes`**, `maintenance_checklist`, `credit_wallet`, `lost_found` |

### 5. 리테일 및 F&B (Retail & Food Service)

> 상품 판매, 재고 수불, 바우처, 발주/공급망, 테이블 및 주문 관리 중심

| 업종 ID | 국문 명칭 | 완성도 | 고객 호칭 | 공간 호칭 | 필수 기능 (Required) | 기본 활성화 기능 (Capabilities) |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `retail` | **일반 소매점** | `verified` | 고객 | 매대/카운터 | `inventory`, `ledger_simple` | **`inventory`**, `credit_wallet`, **`ledger_simple`**, `pickup_orders`, `loyalty_stamp` |
| `apparel_store` | **의류매장** | `isolated` | 고객 | 피팅룸/매대 | `inventory`, `ledger_simple` | **`inventory`**, **`ledger_simple`**, `credit_wallet`, `shift_schedule` |
| `convenience_store` | **편의점** | `isolated` | 손님 | 계산대 | `inventory`, `shift_schedule`, `ledger_simple` | **`inventory`**, **`shift_schedule`**, **`ledger_simple`**, `maintenance_checklist` |
| `pet_supplies` | **반려동물용품점** | `basic_ui` | 반려인/고객 | 진열존 | `inventory`, `ledger_simple` | **`inventory`**, **`ledger_simple`**, `credit_wallet`, `consultation_crm` |
| `cafe` | **카페 / 디저트전문점** | `basic_ui` | 손님/단골 | 테이블 | `inventory`, `ledger_simple`, `shift_schedule` | **`inventory`**, `seat_room`, **`ledger_simple`**, **`shift_schedule`**, `credit_wallet`, `table_order_kds`, `recipe_bom`, `waitlist_turn_queue`, `equipment_lifecycle`, `kiosk_staff_call`, `hygiene_haccp_log`, `vendor_ap_invoice`, `work_attendance_payroll`, `pickup_orders`, `loyalty_stamp` |
| `restaurant` | **소형 음식점 / 식당** | `basic_ui` | 손님 | 식탁/테이블 | `seat_room`, `ledger_simple`, `shift_schedule` | `booking`, **`seat_room`**, `inventory`, **`ledger_simple`**, **`shift_schedule`**, `table_order_kds`, `recipe_bom`, `waitlist_turn_queue`, `kiosk_staff_call`, `hygiene_haccp_log`, `vendor_ap_invoice`, `work_attendance_payroll` |

### 6. 라이프 서비스 및 정비 (Life Service & Maintenance)

> 작업 오더 파이프라인, 정비/점검 체크리스트, 서비스 예약, 부품 재고 중심

| 업종 ID | 국문 명칭 | 완성도 | 고객 호칭 | 공간 호칭 | 필수 기능 (Required) | 기본 활성화 기능 (Capabilities) |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `auto_repair` | **자동차 정비소** | `basic_ui` | 고객/차주 | 정비베이 | `task_pipeline`, `inventory`, `billing_invoicing` | **`task_pipeline`**, **`inventory`**, **`billing_invoicing`**, `consultation_crm`, `booking`, `commission_payroll`, `work_order_kanban`, `equipment_lifecycle`, `sop_risk_assessment`, `vendor_ap_invoice`, `quality_inspection`, `change_management` |
| `cleaning_service` | **청소·방문 서비스 업체** | `basic_ui` | 고객/의뢰인 | 서비스현장 | `shift_schedule`, `task_pipeline`, `billing_invoicing` | **`shift_schedule`**, **`task_pipeline`**, **`billing_invoicing`**, `consultation_crm`, `booking` |
| `pet_hotel` | **반려동물 호텔·유치원** | `basic_ui` | 보호자/반려동물 | 호텔룸/플레이존 | `seat_room`, `attendance`, `passes` | **`seat_room`**, **`attendance`**, **`passes`**, `consultation_crm`, `maintenance_checklist` |
| `equipment_rental` | **장비·렌탈업** | `basic_ui` | 대여자/고객 | 장비보관소 | `rental_equipment`, `inventory`, `billing_invoicing` | **`rental_equipment`**, **`inventory`**, `passes`, **`billing_invoicing`**, `safety_consent` |
| `craft_repair` | **맞춤 제작 공방 & 수리점** | `basic_ui` | 수강생/의뢰인 | 작업대/물레 | `task_pipeline`, `inventory` | **`task_pipeline`**, **`inventory`**, `booking`, `ledger_simple`, `sop_risk_assessment`, `pickup_orders`, `quality_inspection`, `change_management`, `loyalty_stamp` |
| `self_carwash` | **셀프 세차장 & 코인샵** | `basic_ui` | 고객 | 세차베이/드라잉존 | `credit_wallet`, `maintenance_checklist` | **`credit_wallet`**, **`maintenance_checklist`**, `inventory`, `loyalty_stamp` |

### 7. 기업 및 특수 도메인 (Enterprise & Specialized)

> 전자결재, 부서/업무 파이프라인, MBO 목표, 사내 복지/공간, ISO 규격 관리 중심

| 업종 ID | 국문 명칭 | 완성도 | 고객 호칭 | 공간 호칭 | 필수 기능 (Required) | 기본 활성화 기능 (Capabilities) |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `general_enterprise` | **일반 기업 / 경영관리** | `basic_ui` | 고객사/임직원 | 회의실/집무실 | `approval_workflow`, `task_pipeline` | **`approval_workflow`**, **`task_pipeline`**, `workplace_policy`, `mbo`, `feedbacks`, `billing_invoicing`, `seat_room`, `leave_management`, `supply_restock` |
| `manufacturing_light` | **제조·가공업 (공정/BOM/품질 관리)** | `basic_ui` | 발주처/고객사 | 가공/조립라인 | `task_pipeline`, `recipe_bom`, `inventory` | **`task_pipeline`**, **`recipe_bom`**, **`inventory`**, `quality_inspection`, `maintenance_checklist`, `sop_risk_assessment`, `facility_incident_report`, `shift_schedule`, `workplace_policy`, `feedbacks`, `supply_restock`, `change_management`, `approval_workflow`, `leave_management`, `vehicle_shuttle`, `shuttle_dispatch`, `seat_room` |
| `procurement_distribution` | **도소매 / 자재 유통업** | `basic_ui` | 매입/매출처 | 물류창고 | `supply_restock`, `inventory`, `billing_invoicing` | **`supply_restock`**, **`inventory`**, `approval_workflow`, **`billing_invoicing`**, `vendor_ap_invoice`, `credit_wallet` |
| `iso_ims_enterprise` | **ISO 통합경영시스템 (QEHS)** | `basic_ui` | 이해관계자/심사원 | 회의실/현장 | `quality_inspection`, `sop_risk_assessment`, `facility_incident_report`, `approval_workflow` | **`quality_inspection`**, **`sop_risk_assessment`**, **`facility_incident_report`**, `change_management`, **`approval_workflow`**, `maintenance_checklist`, `workplace_policy`, `mbo`, `inventory`, `seat_room`, `leave_management` |
| `iso_human_capital` | **ISO 인적자본 경영 (HR & MBO)** | `basic_ui` | 임직원 | 세미나실/회의실 | `mbo`, `work_attendance_payroll`, `workplace_policy` | **`mbo`**, `shift_schedule`, **`work_attendance_payroll`**, **`workplace_policy`**, `feedbacks`, `approval_workflow`, `leave_management` |
| `rnd_lab_management` | **연구소 & 랩실 관리 (기업 R&D / 대학 연구실)** | `basic_ui` | 연구원/과제담당자 | 실험실/분석기기실 | `task_pipeline`, `seat_room`, `research_project`, `patent_ip_asset`, `sop_risk_assessment` | **`task_pipeline`**, **`seat_room`**, **`research_project`**, **`patent_ip_asset`**, `equipment_lifecycle`, `facility_incident_report`, **`sop_risk_assessment`**, `supply_restock`, `mbo`, `approval_workflow`, `leave_management`, `vehicle_shuttle`, `hazardous_substance_msds`, `electronic_lab_notebook` |
| `baby_food_coop` | **이유식 품앗이 / 공동육아** | `basic_ui` | 참여 가족 (아기) | 모임 거점 (주방/공간) | `baby_food_coop`, `consultation_crm`, `billing_invoicing` | **`baby_food_coop`**, **`consultation_crm`**, `feedbacks`, `daily_care_report`, **`billing_invoicing`**, `booking`, `rental_equipment` |

---

## 4. 핵심 8대 대표 업종 정밀 기능 매트릭스

| 원자적 기능 (Capability) | 피아노 | 영수학원 | 필라테스 | 헬스/PT | 헤어살롱 | 셀렉트샵 | 스터디카페 | 일반기업 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **출결 관리** (`attendance`) | 🔴 | 🔴 | ❌ | 🔴 | ❌ | ❌ | ❌ | ❌ |
| **이용권 / 회원권** (`passes`) | 🔴 | 🔴 | 🔴 | 🔴 | ❌ | ❌ | 🔴 | ❌ |
| **예약 / 레슨 배정** (`booking`) | ❌ | ❌ | 🔴 | ❌ | 🔴 | ❌ | ❌ | ❌ |
| **좌석 / 룸 / 공간** (`seat_room`) | 🟢 | ❌ | 🟢 | ❌ | ❌ | ❌ | 🔴 | 🟢 |
| **락커 보관함** (`locker`) | ❌ | ❌ | 🟢 | 🔴 | ❌ | ❌ | 🟢 | ❌ |
| **수납 / 청구** (`billing_invoicing`) | 🔴 | 🔴 | ❌ | ❌ | ❌ | ❌ | ❌ | 🟢 |
| **상담 / CRM** (`consultation_crm`) | 🟢 | 🟢 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **재고 / 소모품** (`inventory`) | ❌ | ❌ | ❌ | ❌ | 🟢 | 🔴 | ❌ | ❌ |
| **출입 바코드 / 티켓** (`entry_pass_ticket`) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **진도 / 커리큘럼** (`curriculum_progress`) | ❌ | 🟢 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **성적 / 평가 분석** (`exam_grade_analytics`) | ❌ | 🟢 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **학습 / 레슨 일지** (`learning_journal`) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **시술 / 차트 관리** (`treatment_chart`) | ❌ | ❌ | ❌ | ❌ | 🔴 | ❌ | ❌ | ❌ |
| **스탬프 / 쿠폰** (`loyalty_stamp`) | ❌ | ❌ | ❌ | ❌ | ❌ | 🟢 | ❌ | ❌ |
| **전자결재** (`approval_workflow`) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| **업무 파이프라인** (`task_pipeline`) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔴 |
| **MBO 목표 관리** (`mbo`) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟢 |
| **사내 규정** (`workplace_policy`) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟢 |
| **피드백 / 고충** (`feedbacks`) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟢 |
| **셔틀 / 배차** (`shuttle_dispatch`) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. 프리셋 별칭 (Preset Aliases) 매핑 현황 (총 17개)

사용자가 온보딩이나 검색 시 유사 키워드를 입력했을 때 표준 프리셋으로 자동 라우팅되는 별칭 목록입니다:

| 별칭 키워드 (Alias) | 매핑되는 표준 프리셋 (Target Preset) |
| :--- | :--- |
| `corporate_general_affairs` | `general_enterprise` (일반 기업 / 경영관리) |
| `general_affairs` | `general_enterprise` (일반 기업 / 경영관리) |
| `rnd_lab` | `rnd_lab_management` (연구소 & 랩실 관리 (기업 R&D / 대학 연구실)) |
| `rnd` | `rnd_lab_management` (연구소 & 랩실 관리 (기업 R&D / 대학 연구실)) |
| `gym` | `gym_fitness` (헬스장 / 피트니스 센터) |
| `academy` | `general_academy` (일반 보습학원) |
| `private_tutoring` | `exam_tutoring` (입시·과외 학원) |
| `personal_training` | `pt_fitness` (1:1 피트니스 / PT 샵) |
| `golf_lesson` | `indoor_golf` (실내 골프연습장) |
| `climbing_gym` | `climbing_activity` (클라이밍 & 액티비티 짐) |
| `hotel_pension` | `guesthouse` (게스트하우스) |
| `craft_workshop` | `craft_repair` (맞춤 제작 공방 & 수리점) |
| `car_wash` | `self_carwash` (셀프 세차장 & 코인샵) |
| `sauna` | `sauna_jjimjilbang` (사우나·찜질방) |
| `sauna_jjimjbang` | `sauna_jjimjilbang` (사우나·찜질방) |
| `preschool` | `daycare` (어린이집·유치원) |
| `kindergarten` | `daycare` (어린이집·유치원) |

---

## 6. 개발 및 유지보수 수칙

1. **문서 수정 금지 원칙**: 본 문서는 `src/app/presets/presetRegistry.ts`를 단일 진실 공급원(SSOT)으로 삼아 자동 생성됩니다.
2. **동기화 검증**: 빌드 및 PR 전 `npm run check:preset-parity`를 통해 코드와 매트릭스의 일치 여부를 검증합니다.
3. **새 업종 추가 절차**:
   * `src/app/presets/presetRegistry.ts`에 `IndustryPresetDefinition` 작성.
   * `npm run check:preset-parity` 실행하여 자동 패리티 확인.
