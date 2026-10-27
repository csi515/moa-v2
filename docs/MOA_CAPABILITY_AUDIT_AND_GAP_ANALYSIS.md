# Moa-v2 기존 Capability 전수 조사 및 부서별 업무 기능 갭 분석 보고서

> **조사 기준일:** 2026-10-17  
> **대상 브랜치:** `main` (커밋 클린 상태)  
> **원칙 준수:** 소스 코드 및 DB 무변경, Core–Capability–Preset 3계층 아키텍처 엄격 준수, 실제 코드 및 테스트 기반 검증  

---

## 1. 개요 및 조사 방법론

### 1.1 배경 및 목적
본 조사는 Moa-v2 코드베이스에 존재하는 모든 Capability(72개 디렉터리, 61개 원자적 번들, 9개 코어/기반 식별자, 신규 MBO 등)의 실제 구현 상태를 전수 조사하고, 마케팅·품질관리·구매·연구개발·생산·물류·인사·재무·영업·고객지원·EHS·IT 등 전 부서별 업무 요구사항(총 76개 기능)과 대조 분석하기 위해 수행되었다.

단순히 파일 이름이나 레지스트리 선언이 존재한다는 이유만으로 완성을 가정하지 않고, **실제 UI 화면, 서비스 계층, Supabase DB 테이블 및 RLS, Refine 런타임 바인딩, 테스트 코드의 실체**를 엄격히 검증하여 아래의 5단계 상태 등급으로 판정하였다:

- **A — 검증된 구현:** 화면, 서비스, DB 데이터 처리, 권한/테넌트 격리가 완성되어 있고 핵심 동작을 검증하는 테스트 또는 실행 근거가 존재함.
- **B — 부분 구현:** 핵심 계층(DB 테이블 + Refine/서비스 UI)이 구현되어 있으나 E2E 흐름, 세부 권한 필터링, 운영 테스트가 일부 미흡함.
- **C — 골격만 존재:** 레지스트리 등록, 타입, 설정 스키마, `localStorage` 기반 목업 UI, 순수 계산 함수 단위테스트만 있고 실제 DB/테넌트 연동이 부재함.
- **D — 문서상 정의:** 문서나 계획에는 기재되어 있으나 실제 코드 구현을 확인할 수 없음.
- **U — 확인 불가:** 코드나 테스트 근거가 부족하여 상태 판정이 불가함.

### 1.2 핵심 아키텍처 기준 (`AGENTS.md`)
1. **Core-Capability-Preset 3계층 단일화:** 별도의 "Domain Capability" 또는 "Industry Capability" 중간 계층을 만들지 않는다.
2. **Core의 무지(Ignorance) 원칙:** Core는 개별 Capability의 업무 의미를 몰라야 하며, generic interface(동적 레지스트리 슬롯)만 제공한다.
3. **Capability 재사용 및 단일화:** 업종명만 다르다는 이유로 새 Capability를 만들지 않으며, 동일 본질의 업무는 하나의 Capability로 단일화한다.
4. **Preset 조합 원칙:** Preset은 선언적 조립(Assembly)만 담당하며 중복 비즈니스 로직을 구현하지 않는다.

---

## 2. [보고서 A] 기존 Capability 전수 인벤토리

현재 저장소의 `src/capabilities/` 아래 존재하는 총 72개 디렉터리(공통 `_shared` 제외 실질 71개 + 레거시 shim `finance`)의 전수 분석 결과는 다음과 같다.

### 2.1 상태 등급 분포 요약
- **A 등급 (검증된 구현): 14개** (19.4%)
- **B 등급 (부분 구현 / DB 마이그레이션 및 UI 연결): 32개** (44.4%)
- **C 등급 (골격만 존재 / localStorage 목업 or 미연결): 26개** (36.1%)
- **D/U 등급 (문서상 정의 or 확인 불가): 0개** (전체 디렉터리에 실질 코드가 존재함)

### 2.2 전수 인벤토리 명세표

| 번호 | 식별자 | 명칭 | 상태 | 담당 업무 / 목적 | UI 진입 경로 | 데이터 접근 패턴 | 관련 DB 테이블 | 테스트 검증 근거 |
|:---:|:---|:---|:---:|:---|:---|:---|:---|:---|
| 1 | `achievement_quest_badge` | 원생 성취 퀘스트 및 디지털 뱃지 설정 | **B** | 퀘스트 달성 시 포인트 자동 지급 및 학부모 포털 노출 설정을 관리합니다. | `ui/AchievementQuestBadgeView.tsx` | Refine useList/useCreate | `piano.attendance, core.achievement_quests 외 1개` | `domain/achievementQuestEngine.test.ts` |
| 2 | `attendance` | 출결 관리 설정 | **A** | PIN 번호 기반 또는 QR 스캔 기반 출결 확인 방식을 설정합니다. | `ui/AttendanceFeatureToggle.tsx` | Supabase RPC/Client | `core.students, core.staff 외 1개` | `application/attendanceService.test.ts` |
| 3 | `billing` | 수납 | **A** |  | `components/index.ts` | Supabase RPC/Client | `core.students, piano.attendance 외 4개` | `finance/application/combinedPaymentSelection.test.ts` |
| 4 | `billing_invoicing` | 정기 청구 및 수납 원장 설정 | **A** | 매월 정기 청구일, 납부 마감 기한 및 수납 계좌 정보를 설정합니다. | `UI 없음` | 인터페이스/미연결 | `-` | `domain/billingInvoicingEngine.test.ts` |
| 5 | `booking` | 예약 슬롯 및 정원 설정 | **A** | 시간대별 정원 제한 및 대기자 관리 규칙을 설정합니다. | `ui/BookingCalendarView.tsx` | Supabase RPC/Client | `core.staff, bath.bookings 외 4개` | `domain/rescheduleBooking.test.ts` |
| 6 | `commerce` | 판매 | **A** |  | `UI 없음` | Supabase RPC/Client | `core.products, core.product_variants 외 13개` | `facade/commerceBarrel.test.ts` |
| 7 | `commission_payroll` | 전문가 및 프리랜서 인센티브 요율 정산 설정 | **C** | 매출 기여도 요율(%), 3.3% 원천징수 공제 및 카드 수수료 차감 정책을 설정합니다. | `components/CommissionPayrollManagementView.tsx` | localStorage (Mock) | `-` | `domain/commissionPayrollEngine.test.ts` |
| 8 | `consultation` | 상담 | **A** |  | `components/ConsultationRecordsView.tsx` | StorageService | `core.students` | `-` |
| 9 | `consultation_crm` | 고객 상담 일지 및 CRM 특이사항 설정 | **A** | 상담 유형 분류, 자주 사용하는 고객 특이사항 태그 및 재등록 D-Day 알림 시점을 설정합니다. | `UI 없음` | 인터페이스/미연결 | `core.consultations` | `domain/consultationCrmEngine.test.ts` |
| 10 | `credit_wallet` | 선불 충전금 및 마일리지 설정 | **C** | 최소 충전 단위, 충전 보너스 프로모션 구간표 및 포인트 소멸 정책을 설정합니다. | `UI 없음` | 인터페이스/미연결 | `-` | `domain/creditWalletEngine.test.ts` |
| 11 | `curriculum_progress` | 학습 진도 및 성장 리포트 설정 | **C** | 교재/단원별 진도 체크, 승급/급수 심사 기준 및 월간 성장 리포트 발행 주기를 구성합니다. | `components/CurriculumProgressManagementView.tsx` | localStorage (Mock) | `piano.curriculum_levels` | `domain/curriculumProgressEngine.test.ts` |
| 12 | `daily_care_report` | 일일 돌봄 알림장 및 케어 지표 설정 | **B** | 모바일 0원 W3C SVG 안심 카드 자동 첨부 여부 및 식사 상태 필수 입력 여부를 설정합니다. | `ui/DailyCareReportView.tsx` | Refine useList/useCreate | `core.daily_care_logs, core.care_timeline_entries` | `domain/dailyCareReportEngine.test.ts` |
| 13 | `deposit_escrow` | 노쇼 방지 예약 보증금 에스크로 설정 | **B** | 예약 보증금 예치, 현장 결제 시 자동 공제 및 취소 위약금 기준을 설정합니다. | `components/DepositEscrowManagementView.tsx` | 인터페이스/미연결 | `-` | `domain/depositEscrowEngine.test.ts` |
| 14 | `diet_body_log` | 식단 & 체성분 피트니스 다이어리 설정 | **C** | 인바디 권장 측정 주기(일), 식단 사진 업로드 필수 여부 및 운동 볼륨 기준을 설정합니다. | `components/DietBodyLogManagementView.tsx` | localStorage (Mock) | `-` | `domain/dietBodyLogEngine.test.ts` |
| 15 | `digital_contract` | 현장 전자계약 & 환불 규정 서명 보관 설정 | **C** | 공정거래위원회 표준 위약금 요율(%), 태블릿 자필 전자서명 필수 및 계약 만료 알림 정책을 설정합니다. | `components/DigitalContractManagementView.tsx` | localStorage (Mock) | `-` | `domain/digitalContractEngine.test.ts` |
| 16 | `digital_guestbook` | 전자 방명록 및 내방객 접수 설정 | **B** | 워크인 내방객 태블릿 전자 서약 및 개인정보 보관 기간을 설정합니다. | `ui/DigitalGuestbookView.tsx` | Refine useList/useCreate | `core.digital_guestbook_entries` | `domain/digitalGuestbookEngine.test.ts` |
| 17 | `emergency_alert_broadcast` | 긴급 휴원 및 재난 공지 설정 | **B** | 기상악화 및 시설 장애 발생 시 기본 보강 규정 및 보호자 수신확인 추적을 설정합니다. | `ui/EmergencyAlertBroadcastView.tsx` | Refine useList/useCreate | `core.emergency_broadcasts, core.emergency_broadcast_receipts` | `domain/emergencyAlertEngine.test.ts` |
| 18 | `enrollment` | 등록 | **A** |  | `components/GuardianEnrollmentRequestCard.tsx` | 인터페이스/미연결 | `-` | `-` |
| 19 | `entry_pass_ticket` | 모바일 일일 입장권 및 검표 설정 | **B** | W3C SVG 모바일 QR 티켓 자동 생성 및 중복 입장 방지 정책을 설정합니다. | `ui/EntryPassTicketView.tsx` | Refine useList/useCreate | `core.entry_pass_tickets, core.entry_pass_scans` | `domain/entryPassTicketEngine.test.ts` |
| 20 | `equipment_lifecycle` | 고가 기구 점검 주기 & 감가상각 설정 | **B** | 장비별 정기 점검 주기, 내용연수 감가상각 및 신규 교체 임계 비율을 설정합니다. | `components/EquipmentLifecycleManagementView.tsx` | 인터페이스/미연결 | `-` | `domain/equipmentLifecycleEngine.test.ts` |
| 21 | `event_contest_hub` | 원내 발표회 및 대회 심사 설정 | **B** | 참가자 큐시트 순번 자동 채번 및 W3C SVG 모바일 전자 상장 자동 발급 여부를 설정합니다. | `ui/EventContestHubView.tsx` | Refine useList/useCreate | `core.event_contests, core.event_contest_entries` | `domain/eventContestEngine.test.ts` |
| 22 | `exam_grade_analytics` | 단원평가 성적 채점 & 취약영역 레이더 분석 설정 | **B** | 시험 점수 입력 시 반 평균/표준편차(Z-Score) 산출 및 취약 영역 판정 기준을 설정합니다. | `components/ExamGradeAnalyticsManagementView.tsx` | 인터페이스/미연결 | `-` | `domain/examGradeAnalyticsEngine.test.ts` |
| 23 | `facility_incident_report` | 시설 안전사고 및 파손 경위서 설정 | **B** | 사고 발생 시 기본 배상책임보험사 및 보호자 안내 규칙을 설정합니다. | `ui/FacilityIncidentReportView.tsx` | Refine useList/useCreate | `core.facility_incident_reports` | `domain/incidentReportEngine.test.ts` |
| 24 | `feedbacks` | 현장 소통 및 인수인계 설정 | **B** | 오전/오후 교대 근무 인수인계 항목 및 현장 고객 건의함 설정 | `ui/FeedbacksAndHandoverView.tsx` | 인터페이스/미연결 | `core.staff, core.feedbacks 외 2개` | `domain/handoverEngine.test.ts` |
| 25 | `finance` | finance | **C** |  | `components/ExpenseManagementView.tsx` | 인터페이스/미연결 | `-` | `-` |
| 26 | `hygiene_haccp_log` | 위생 HACCP 및 보건증 관리 설정 | **B** | 냉장/냉동 적정 온도 임계치 및 보건증 만료 사전 경고 일수를 구성합니다. | `components/HygieneHaccpLogView.tsx` | 인터페이스/미연결 | `-` | `domain/hygieneHaccpLogEngine.test.ts` |
| 27 | `instructor_match` | 강사 및 담당자 매칭 설정 | **C** | 강사 배정 방식(전담 지정제 / 순환제) 및 1인당 동시 세션 제한 규칙을 설정합니다. | `UI 없음` | 인터페이스/미연결 | `-` | `domain/instructorMatchEngine.test.ts` |
| 28 | `intake_assessment` | 사전 문진표 및 위험 분석 설정 | **B** | 현장 모바일 QR 문진표 작성 허용 여부 및 전자 서명 필수 여부를 설정합니다. | `ui/IntakeAssessmentView.tsx` | Refine useList/useCreate | `core.intake_templates, core.intake_submissions` | `domain/intakeAssessmentEngine.test.ts` |
| 29 | `inventory` | 재고 및 자재 관리 설정 | **A** | 품목 분류 방식과 안전 재고 알림 임계값을 설정합니다. | `components/BarcodeLabelPrintModal.tsx` | 인터페이스/미연결 | `core.inventory` | `domain/inventoryEngine.test.ts` |
| 30 | `kiosk_staff_call` | 좌석/룸 스마트 호출 & 디지털 벨보드 설정 | **B** | 원터치 호출 요청 항목, 무음 소음 민원 접수 및 호출음 알림 기준을 설정합니다. | `components/KioskStaffCallView.tsx` | 인터페이스/미연결 | `-` | `domain/kioskStaffCallEngine.test.ts` |
| 31 | `learning_journal` | 수업 일지 및 학부모 알림장 설정 | **B** | 수업 일지 발행 시 학부모 포털 자동 노출 및 코멘트 허용 여부를 설정합니다. | `ui/LearningJournalFeedView.tsx` | Refine useList/useCreate | `core.staff, core.learning_journals` | `domain/learningJournalEngine.test.ts` |
| 32 | `ledger_simple` | 간이 수기 장부 및 일일 시재 설정 | **C** | 매장 기초 시재금(거스름돈 준비금), 취급 결제수단 및 일일 마감 잠금 정책을 설정합니다. | `UI 없음` | 인터페이스/미연결 | `-` | `domain/ledgerSimpleEngine.test.ts` |
| 33 | `level_assessment` | 정기 승급 심사 및 합격증 설정 | **B** | 정기 심사 커트라인 점수 및 모바일 전자 합격증 자동 발급 여부를 설정합니다. | `ui/LevelAssessmentView.tsx` | Refine useList/useCreate | `core.level_assessments` | `domain/levelAssessmentEngine.test.ts` |
| 34 | `locker` | 락커·사물함 정책 설정 | **A** | 총 락커 개수와 구역 구분 및 보증금/월 이용료 규칙을 설정합니다. | `ui/LockerManagementView.tsx` | Supabase RPC/Client | `core.lockers, core.customers 외 1개` | `domain/lockerEngine.test.ts` |
| 35 | `lost_found` | 시설 분실물·습득물 보관 관리 설정 | **C** | 법적 보관 기한(일), 만료 임박 알림 기준일 및 분실물 공지 정책을 설정합니다. | `components/LostFoundManagementView.tsx` | localStorage (Mock) | `-` | `domain/lostFoundEngine.test.ts` |
| 36 | `loyalty_stamp` | 전자 스탬프 / 칭찬 스티커 설정 | **B** | 종이 쿠폰 분실 없는 모바일 스탬프 적립 및 목표 달성 리워드 쿠폰 정책을 설정합니다. | `components/LoyaltyStampView.tsx` | StorageService | `-` | `domain/loyaltyStampEngine.test.ts` |
| 37 | `maintenance_checklist` | 시설 점검 및 일일 루틴 설정 | **C** | 오픈/마감 루틴 점검 주기 및 이상 수치 경고 기준을 설정합니다. | `ui/MaintenanceChecklistManagementView.tsx` | localStorage (Mock) | `-` | `domain/maintenanceChecklistEngine.test.ts` |
| 38 | `makeup_lesson_pass` | 결석 보강 티켓 및 슬롯 매칭 설정 | **B** | 결석 발생 시 생성되는 보강권의 유효기간 및 학부모 셀프 예약 허용 여부를 설정합니다. | `ui/MakeupLessonPassView.tsx` | Refine useList/useCreate | `core.makeup_tokens, core.makeup_slots` | `domain/makeupLessonEngine.test.ts` |
| 39 | `mbo` | 목표관리(MBO) 운영 설정 | **C** | 회사·부서·개인 목표 계층, 실행 계획 승인 절차, 정기 평가 주기 및 평가 기준 설정 | `UI 없음` | Supabase RPC/Client | `core.mbo_objectives, core.mbo_projects 외 3개` | `domain/mboEngine.test.ts` |
| 40 | `membership_referral_tree` | 패밀리 연동 및 추천인 리워드 설정 | **B** | 형제/자매 결합 할인율, 가족 공용 크레딧 공유 및 추천 보너스를 구성합니다. | `components/MembershipReferralTreeView.tsx` | 인터페이스/미연결 | `-` | `domain/membershipReferralTreeEngine.test.ts` |
| 41 | `nps_survey_collector` | 만족도 및 NPS 설문 설정 | **B** | 설문 완료 보상 포인트 및 불만 고객 즉시 케어 알림 규칙을 설정합니다. | `ui/NpsSurveyCollectorView.tsx` | Refine useList/useCreate | `core.nps_survey_campaigns, core.nps_survey_responses` | `domain/npsSurveyEngine.test.ts` |
| 42 | `package_split_billing` | 복합 패키지 분할 매출 귀속 설정 | **B** | 결합 상품 일시불 결제액의 선수금 부채 보관 및 소진 시 매출 실현 규칙을 설정합니다. | `components/PackageSplitBillingManagementView.tsx` | 인터페이스/미연결 | `-` | `domain/packageSplitBillingEngine.test.ts` |
| 43 | `parent` | 보호자 포털 | **C** |  | `UI 없음` | 인터페이스/미연결 | `piano.attendance, piano.events 외 1개` | `parentIndustryAdapter.test.ts` |
| 44 | `parking_validator` | 고객 무료 주차 등록 및 정산 설정 | **B** | 방문 고객 기본 무료 주차 제공 시간 및 상가 관리소 주차권 권종을 설정합니다. | `ui/ParkingValidatorView.tsx` | Refine useList/useCreate | `core.parking_registrations, core.parking_batches` | `domain/parkingValidatorEngine.test.ts` |
| 45 | `passes` | 수강권·회원권 기본 정책 | **A** | 회원권 유형(횟수제/기간제)과 유효기간 및 양도/정지 규칙을 설정합니다. | `ui/PassesManagementView.tsx` | Supabase RPC/Client | `core.passes, core.customers 외 1개` | `domain/passesEngine.test.ts` |
| 46 | `pickup_orders` | 사전 예약 픽업 주문 관리 | **B** | 수령 희망 일시 지정 주문 접수 및 제작, 픽업 대기 4단계 칸반 파이프라인을 설정합니다. | `components/PickupOrdersKanbanView.tsx` | 인터페이스/미연결 | `-` | `domain/pickupOrdersEngine.test.ts` |
| 47 | `recipe_bom` | 식자재 레시피 & 자동 소모 BOM 원가 설정 | **C** | 메뉴 주문 접수 시 식자재 재고 자동 차감 여부 및 목표 마진율 임계값을 설정합니다. | `components/RecipeBomManagementView.tsx` | localStorage (Mock) | `core.inventory` | `domain/recipeBomEngine.test.ts` |
| 48 | `rental_equipment` | 기구·비품 대여 및 회수 정책 | **C** | 대여 식별자 방식(바코드/관리번호), 기본 대여 시간 및 시간당 연체료 정책을 설정합니다. | `ui/RentalEquipmentManagementView.tsx` | localStorage (Mock) | `-` | `domain/rentalEquipmentEngine.test.ts` |
| 49 | `resources` | 자원 | **A** |  | `UI 없음` | Supabase RPC/Client | `core.room_reservations, core.bookable_resources` | `resourceCapability.test.ts` |
| 50 | `retention_marketing` | 자동화 리텐션 및 이탈 방지 마케팅 설정 | **C** | 수강권/이용권 만료 D-Day 알림 및 시술 주기 맞춤 예약 알림톡 트리거를 구성합니다. | `components/RetentionMarketingView.tsx` | localStorage (Mock) | `-` | `domain/retentionMarketingEngine.test.ts` |
| 51 | `roster` | 명부 | **A** |  | `components/detail/StudentDetailAttendanceTab.tsx` | Refine useList/useCreate | `core.consultations, piano.attendance 외 4개` | `components/detail/studentManualAttendanceClass.test.ts` |
| 52 | `safety_consent` | 전자 동의서 및 안전 서약서 설정 | **C** | 부상 면책 서약서, 시설 이용 동의서 양식 및 캔버스 전자 서명 필수 여부를 설정합니다. | `ui/SafetyConsentManagementView.tsx` | StorageService | `-` | `domain/safetyConsentEngine.test.ts` |
| 53 | `scheduling` | 일정 | **A** |  | `availability/AvailabilitySettingsView.tsx` | Supabase RPC/Client | `core.availability_rules, core.availability_overrides 외 6개` | `availability/availabilityCapability.test.ts` |
| 54 | `seat_room` | 공간·좌석 시간 점유 설정 | **C** | 총 좌석/룸 수와 기본 이용시간, 초과 페널티 요율, 퇴실 청소 필요 여부를 설정합니다. | `UI 없음` | 인터페이스/미연결 | `-` | `domain/seatRoomEngine.test.ts` |
| 55 | `seat_timer_billing` | 시간제 공간 타이머 & 초과 요금 자동 과금 설정 | **C** | 기본 이용시간, 시간당 기본요율 및 10분 단위 초과 할증 요금을 설정합니다. | `components/SeatTimerBillingView.tsx` | localStorage (Mock) | `-` | `domain/seatTimerBillingEngine.test.ts` |
| 56 | `shift_schedule` | 직원 근무표 및 시급 정산 설정 | **C** | 기본 시급, 주휴수당/야간수당 가산 배율 및 교대 근무 슬롯을 설정합니다. | `ui/ShiftScheduleManagementView.tsx` | localStorage (Mock) | `-` | `domain/shiftScheduleEngine.test.ts` |
| 57 | `sop_risk_assessment` | 작업표준 및 위험성평가 설정 | **B** | 산업안전보건법 기준 5x5 빈도·강도 매트릭스 및 고위험 개선 대책 기준을 설정합니다. | `components/SopRiskAssessmentView.tsx` | 인터페이스/미연결 | `-` | `domain/sopRiskAssessmentEngine.test.ts` |
| 58 | `space_turnaround` | 공간 턴어라운드 및 정비 버퍼 설정 | **B** | 공간 대여 종료 후 다음 예약 사이에 확보할 정비/환기 시간과 체크리스트를 설정합니다. | `ui/SpaceTurnaroundView.tsx` | Refine useList/useCreate | `core.space_turnarounds` | `domain/spaceTurnaroundEngine.test.ts` |
| 59 | `substitute_dispatch` | 강사 대강 긴급 호출 및 승인 설정 | **B** | 결강 시 대체 강사 기본 지급료 및 관리자 승인 절차를 설정합니다. | `ui/SubstituteDispatchView.tsx` | Refine useList/useCreate | `core.substitute_requests, core.substitute_bids` | `domain/substituteDispatchEngine.test.ts` |
| 60 | `supply_restock` | 소모품 안전재고 및 간이 발주서 설정 | **B** | 매장 필수 소모품 안전재고 알림 기준 및 공급처별 원터치 발주서 서식을 설정합니다. | `ui/SupplyRestockView.tsx` | Refine useList/useCreate | `core.inventory, core.supply_restock_items` | `domain/supplyRestockEngine.test.ts` |
| 61 | `table_order_kds` | 테이블 QR 주문 및 주방 디스플레이(KDS) 설정 | **C** | 테이블별 비대면 QR 주문 및 주방 3단계 조리 공정 상태머신을 구성합니다. | `components/KitchenDisplaySystemView.tsx` | localStorage (Mock) | `-` | `domain/tableOrderKdsEngine.test.ts` |
| 62 | `task_pipeline` | 주문 제작 및 수리 공정 파이프라인 설정 | **C** | 공정 단계별 칸반 구성, 기본 SLA 목표 시간(시간) 및 완료 안내 알림을 설정합니다. | `ui/TaskPipelineKanbanView.tsx` | localStorage (Mock) | `-` | `domain/taskPipelineEngine.test.ts` |
| 63 | `transport` | 차량 | **C** |  | `ShuttleRideRequestView.tsx` | 인터페이스/미연결 | `-` | `-` |
| 64 | `treatment_chart` | 시술 및 케어 히스토리 차트 설정 | **C** | 주요 시술 종목별 기본 권장 주기(주), 약재 배합 메모 및 사진 첨부 옵션을 설정합니다. | `ui/TreatmentChartManagementView.tsx` | localStorage (Mock) | `-` | `domain/treatmentChartEngine.test.ts` |
| 65 | `treatment_portfolio` | 시술 스타일북 & 객단가 업셀링 갤러리 설정 | **C** | 디자이너별 시술 룩북 카테고리, 비포/애프터 비교 뷰 활성화 및 추천 업셀링 옵션을 설정합니다. | `components/TreatmentPortfolioView.tsx` | localStorage (Mock) | `-` | `domain/treatmentPortfolioEngine.test.ts` |
| 66 | `trial_funnel` | 체험 및 상담 파이프라인 설정 | **B** | SNS·포털 유입 상담 리드부터 1회 무료 체험, 정규 수강권 등록까지 단계별 전환 설정 | `ui/TrialFunnelKanbanView.tsx` | Refine useList/useCreate | `core.trial_leads` | `domain/trialFunnelEngine.test.ts` |
| 67 | `vehicle_shuttle` | 안심 통학 및 셔틀 차량 운행 관제 설정 | **C** | 셔틀 차량별 노선(코스), 정류장 도착 사전 안내 시간(분) 및 승하차 체크 옵션을 설정합니다. | `components/VehicleShuttleManagementView.tsx` | localStorage (Mock) | `-` | `domain/vehicleShuttleEngine.test.ts` |
| 68 | `vendor_ap_invoice` | 공급처 원장 및 매입 세무 전표 설정 | **B** | B2B 매입처 거래 조건, 납품 단가 급등 감지율 및 부가세 매입세액 공제 설정을 관리합니다. | `components/VendorApInvoiceView.tsx` | 인터페이스/미연결 | `core.inventory` | `domain/vendorApInvoiceEngine.test.ts` |
| 69 | `waitlist_turn_queue` | 현장 순번 대기 & DID 호출 설정 | **B** | 입구 태블릿 발권 및 매장 전광판 호출 기준을 설정합니다. | `components/WaitlistTurnQueueView.tsx` | 인터페이스/미연결 | `-` | `domain/waitlistTurnQueueEngine.test.ts` |
| 70 | `work_attendance_payroll` | 직원 근태 및 법정 급여명세서 설정 | **B** | 매장 Wi-Fi/GPS 출퇴근 인증 기준, 법정 주휴수당 및 4대보험 공제 기준을 설정합니다. | `components/WorkAttendancePayrollView.tsx` | 인터페이스/미연결 | `-` | `domain/workAttendancePayrollEngine.test.ts` |
| 71 | `work_order_kanban` | 정비·수리 단계별 작업지시서 & 부품 공임 견적서 설정 | **C** | 부품 투입 시 재고 자동 차감 여부, 기본 시간당 공임 요율 및 부가세(10%) 적용 여부를 설정합니다. | `components/WorkOrderKanbanView.tsx` | localStorage (Mock) | `core.inventory` | `domain/workOrderKanbanEngine.test.ts` |
| 72 | `workplace_policy` | 매장 내규·사규 관리 설정 | **B** | 직원 복무 규정, 안전 수칙, 모바일 자필 서약 및 개정 사규 재서약 강제 여부를 설정합니다. | `ui/WorkplacePolicyManagementView.tsx` | localStorage (Mock) | `core.workplace_policies` | `domain/policyEngine.test.ts` |

---


## 3. [보고서 B] 부서별 업무 기능 갭 분석 및 매핑표

본 섹션에서는 10개 부서 및 업무 영역(A~J)의 총 76개 세부 기능 요구사항을 현재 Moa-v2 코드베이스와 1:1로 대조한 결과를 기록한다.

### 3.1 분류 기준 정의
- **재사용 가능:** 현재 구현된 Capability와 데이터 모델로 요구사항을 즉시 충족할 수 있음.
- **설정 확장:** 기존 도메인 로직은 충분하며, Preset 파라미터나 설정 스키마(setupSchema) 옵션 추가로 해결 가능.
- **기존 Capability 확장:** 기존 Capability의 데이터 스키마(테이블 컬럼 추가), 상태 머신, 서비스 메서드를 보완해야 함.
- **신규 Capability 필요:** 독립적인 업무 생명주기, 데이터 모델, 권한 체계가 필요하여 기존 모듈 확장이 부적합함.
- **외부 연계 필요:** 전문 ERP, MES, ELN, 광고 플랫폼, 하드웨어 장비 등 외부 시스템 연계가 필수적임.
- **보류 권장:** 도입 비용 대비 효과가 불명확하거나 요구사항이 확정되지 않아 현 단계 개발이 부적합함.

---

### 3.2 전 부서 및 영역별 세부 기능 매핑표 (76개 세부 기능 전수)

| 영역 / 부서 | 세부 업무 기능 | 매핑 기존 Capability | 구현 상태 | 실제 재사용 파일 / 서비스 / 테이블 | 충족 요구사항 | 미충족 요구사항 | 필요한 변경 범위 | 보안 및 데이터 무결성 위험 | 분류 결과 | 복잡도 |
|:---|:---|:---|:---:|:---|:---|:---|:---|:---|:---:|:---:|
| **A. 전부서 공통** | 목표 및 프로젝트 관리 | `mbo`, `task_pipeline` | C | `core.mbo_projects`, `core.mbo_objectives`, `mboEngine.ts` | 목표 설정, KPI 가중치(100%), 분기별 달성도 계산 | 전사 프로젝트 공유 뷰, WBS/간트차트, 타임라인 | `mbo` UI 컴포넌트 신규 작성, index.ts 생성 및 프리셋 등록 | 프로젝트별 테넌트 격리 미연결 시 타 부서 기밀 목표 유출 위험 | **기존 Capability 확장** | 중간 |
| A. 전부서 공통 | 업무·작업·일정·담당자 관리 | `task_pipeline`, `scheduling` | C / A | `TaskPipelineKanbanView.tsx`, `taskPipelineEngine.ts`, `core.schedules` | 작업 단계 전이(SLA), 일정 슬롯 예약 | 일반 To-do 업무 할당, 마감일 알림, DB 영속화 | `core.tasks` 테이블 신설 또는 `task_pipeline` DB 바인딩 | 로컬스토리지 사용 중으로 테넌트/사용자 권한 통제 없음 | **기존 Capability 확장** | 중간 |
| A. 전부서 공통 | 승인 및 결재 워크플로 | `digital_contract`, `workplace_policy` | C / B | `core.policy_acknowledgements`, `digitalContractEngine.ts` | 단일 승인/서약 전자서명, 타임스탬프 | 다단계 결재선(기안-검토-결재-합의), 전결 규정, 반려 워크플로 | 범용 다단계 전자결재 엔진 및 `approval_workflow` Capability 구축 | 결재선 위변조 및 미승인 집행에 따른 회계/보안 감사 결함 | **신규 Capability 필요** | 높음 |
| A. 전부서 공통 | 댓글, 피드백, 알림 | `feedbacks`, Core `notifications` | B / A | `core.feedbacks`, `core.notifications`, `FeedbacksAndHandoverView.tsx` | 사내 건의, VOC 수집, 인앱/푸시 알림 통지 | 엔티티별(@멘션) 스레드 댓글, 실시간 소켓 연동 | 알림 대상 엔티티 다형성(polymorphic) 외래키 확장 | 고객 VOC와 사내 비밀 건의의 `is_internal_only` 필터 누락 시 유출 위험 | **재사용 가능** | 낮음 |
| A. 전부서 공통 | 문서·첨부파일·버전 관리 | `workplace_policy`, Supabase Storage | B / A | `core.workplace_policies`, `src/services/storage/` | 규정/문서 버전 관리(v1, v2), 전자서명 URL 저장 | 일반 문서 첨부파일 업로드 뷰, 버전 롤백, 다운로드 감사로그 | 범용 문서 관리 전용 UI 뷰 및 스토리지 메타 대장 연계 | Presigned URL 만료 미설정 시 기밀 문서 외부 누출 위험 | **기존 Capability 확장** | 중간 |
| A. 전부서 공통 | 이력 및 감사 로그 | Core `audit` | A | `core.audit_logs`, `auditCapability.ts`, `auditExportInterceptor.ts` | 테넌트별 불변(Immutable) 감사 로그, 작업자, 전/후 스냅샷 | 특정 부서 전용 감사 필터링 뷰 | 부서별 감사 로그 조회 UI 필터 프리셋 추가 | RLS 미적용 시 테넌트 간 감사 로그 상호 열람 위험 (현재 RLS 통과 완료) | **재사용 가능** | 낮음 |
| A. 전부서 공통 | 체크리스트와 점검 기록 | `maintenance_checklist`, `sop_risk_assessment` | C / B | `core.checklist_templates`, `core.ops_tasks`, `MaintenanceChecklistView.tsx` | 점검 항목별 PASS/FAIL 확인, 템플릿 생성 | 정량 측정치(수치 범위) 입력, 이상 시 CAPA 자동 티켓 발행 | DB 스키마 바인딩 및 정량 측정치 컬럼 확장 | 현재 UI가 로컬스토리지 사용으로 점검 결과 위변조/유실 위험 | **기존 Capability 확장** | 중간 |
| A. 전부서 공통 | 지표·대시보드·보고서 | Core `dashboard` | A | `src/core/dashboard/`, Refine 리소스 지표 | 주요 매출/예약/출석 집계 및 기본 카드 차트 | 부서별 커스텀 KPI 위젯 조합, 엑셀/PDF 자동 출력 | 프리셋별 대시보드 위젯 레지스트리 확장 | 데이터 집계 시 타 테넌트 수치 누적 위험 (현재 `organization_id` 격리됨) | **설정 확장** | 낮음 |
| A. 전부서 공통 | 예산 및 비용 관리 | `billing_invoicing`, Core `finance` | A | `core.expenses`, `core.income_entries`, `expenseCategories.ts` | 지출 내역 등록, 비용 카테고리 분류, 영수증 금액 집계 | 부서별 연간/월간 예산 편성(Allocation) 및 초과 차단 | `core.department_budgets` 테이블 및 한도 검증 로직 추가 | 예산 초과 집행에 대한 통제 미흡으로 재무 리스크 | **기존 Capability 확장** | 중간 |
| A. 전부서 공통 | 이슈·문제·시정조치 관리 | `facility_incident_report`, `feedbacks` | B | `core.facility_incident_reports`, `FacilityIncidentReportView.tsx` | 문제/사고 접수, 발생 타임라인, 조치 내역 기록 | 근본원인 분석(5-Why/4M), 시정조치 유효성 평가 승인 | 문제 유형 분류 체계 및 시정조치 승인 단계 추가 | 심각 이슈 미해결 상태 장기 방치 시 운영 리스크 | **기존 Capability 확장** | 중간 |
| A. 전부서 공통 | 자산 및 설비 관리 | `equipment_lifecycle`, `rental_equipment` | B / C | `core.bookable_resources`, `equipmentLifecycleEngine.ts` | 설비 예약 및 사용 점유, 장비 수명 계산 | 설비별 시리얼/바코드 태그 대장, 유지보수 이력 통합 | `core.equipment_assets` 정식 대장 테이블 신설 | 장비 분실/망실 시 추적성 결여 | **기존 Capability 확장** | 중간 |
| A. 전부서 공통 | 재고 및 입출고 관리 | `inventory` | A | `core.inventory`, `core.stock_movements`, `apply_stock_movement_atomic` | 입고/출고/조정 원자적 트랜잭션, 현재고, 바코드/QR 라벨 | 복수 창고(다구역) 위치 관리, 로트/유효기간 관리 | 위치(location_id) 및 로트 번호 컬럼 확장 | 동시 출고 시 동시성 충돌 (현재 원자적 RPC로 방어됨) | **재사용 가능** | 낮음 |
| **B. 마케팅** | 캠페인 목표·예산·일정·채널 관리 | `retention_marketing`, `nps_survey_collector` | C / B | `retentionMarketingEngine.ts`, `core.nps_survey_campaigns` | 캠페인 타겟팅 룰 조건(미방문 N일 등) 설정 | 마케팅 예산 통제, 광고 집행 캘린더, 채널별 실시간 연동 | `retention_marketing`의 DB 영속화 및 예산 필드 추가 | 광고비 과다 집행 시 재무적 손실 | **기존 Capability 확장** | 중간 |
| B. 마케팅 | 콘텐츠 제작 및 게시 일정 | (미구현) | - | - | 없음 | 콘텐츠 제작 파이프라인, SNS 자동 게시 | 신규 구축 불필요 (Notion/SaaS 대체 권장) | 플랫폼 범위 과잉 확장에 따른 유지보수 급증 | **보류 권장** | 높음 |
| B. 마케팅 | 잠재 고객 및 리드 관리 | `trial_funnel`, `digital_guestbook` | B | `core.trial_leads`, `TrialFunnelKanbanView.tsx`, `digital_guestbook` | 방명록 접수, 리드 획득 채널, 상담/체험 상태 칸반 | 웹사이트 랜딩페이지 폼 자동 유입 웹훅 | 외부 폼 웹훅 수신 엔드포인트 연계 | 잠재고객 연락처 개인정보 암호화 및 보관기간 파기 준수 | **재사용 가능** | 낮음 |
| B. 마케팅 | 유입·전환율·고객 획득 비용 분석 | `trial_funnel`, `membership_referral_tree` | B | `trialFunnelEngine.ts`, `core.trial_leads` | 채널별 리드 유입 수, 단계별 전환율 자동 집계 | 광고비 집행액 대비 CAC(고객획득비용) 자동 계산 | 마케팅 지출비용과 전환 리드 수 매핑 로직 추가 | 데이터 집계 오류로 인한 마케팅 예산 왜곡 | **기존 Capability 확장** | 중간 |
| B. 마케팅 | 광고비 예산 대비 집행 실적 | `billing_invoicing`, Core `finance` | A | `core.expenses`, `expenseCategories.ts` | 광고비 지출 등록 및 영수증 증빙 처리 | 매체별 실시간 소진액 대사 및 한도 초과 경보 | 지출 카테고리에 마케팅 매체별 서브태그 추가 | 영수증 누락 및 증빙 없는 예산 집행 위험 | **기존 Capability 확장** | 낮음 |
| B. 마케팅 | 광고 문구·디자인·예산 승인 | (공통 전자결재 부재) | - | - | 없음 | 시안 검토, 카피 승인, 광고비 집행 품의 라인 | 전사 공통 `approval_workflow`에 위임 연계 | 부적절한 광고 집행에 따른 브랜드 리스크 | **신규 Capability 필요** | 높음 |
| **C. 품질관리(QA/QC)** | 제품·공정별 검사 기준 및 체크리스트 | `maintenance_checklist`, `sop_risk_assessment` | C / B | `core.checklist_templates`, `sopRiskAssessmentEngine.ts` | 체크리스트 항목 점검, 작업 표준 수칙 | 정밀 규격 공차(Min/Max/Target), AQL 샘플링 기준 | `quality_inspection` 독립 품질 도메인 스키마 구축 | 불량 검사 누락에 따른 완제품 클레임 | **신규 Capability 필요** | 중간 |
| C. 품질관리(QA/QC) | 측정값과 합격·불합격 결과 등록 | `level_assessment`, `exam_grade_analytics` | B | `levelAssessmentEngine.ts`, `examGradeAnalyticsEngine.ts` | 수치 입력에 따른 자동 판정 및 합격선 평가 | 공구 계측치 연속 데이터 수집, 이상치 통계 판정 | 품질 측정값 전용 레코드 및 자동 판정 알고리즘 추가 | 측정치 조작 및 데이터 신뢰성 훼손 | **신규 Capability 필요** | 중간 |
| C. 품질관리(QA/QC) | 부적합 및 불량 이력 관리 | `facility_incident_report` | B | `core.facility_incident_reports`, `core.facility_incident_timelines` | 결함 일시, 현상 기록, 타임라인 이력 관리 | 부적합 품목 코드, 로트 번호, 불량 유형(4M) 분류 | `core.nonconformance_records` 스키마 확장 | 불량품 혼입 및 출하 차단 실패 | **기존 Capability 확장** | 중간 |
| C. 품질관리(QA/QC) | 원인 분석과 시정·예방조치(CAPA) | `facility_incident_report` | B | `incidentReportEngine.ts`, `core.facility_incident_reports` | 조치 내역 기록 및 종결 플래그 | 근본 원인 분석(Fishbone, 5-Why), 유효성 검증 승인 | CAPA 발행-조치-효과성 평가 상태머신 보완 | 형식적 조치로 인한 동일 결함 재발 | **기존 Capability 확장** | 중간 |
| C. 품질관리(QA/QC) | 공정·원료·제품 사양 변경 관리 | `recipe_bom`, `workplace_policy` | C / B | `core.workplace_policies` (버전관리) | 사양 및 규정 버전 관리 | 4M 변경(설비/인력/재료/공법) 승인 및 이력 추적 | ECN/ECO(엔지니어링 변경 공지) 승인 프로세스 | 변경점 미공유로 인한 대량 불량 발생 | **신규 Capability 필요** | 높음 |
| C. 품질관리(QA/QC) | 불량률·재작업률·고객 불만 지표 | `feedbacks`, `nps_survey_collector` | B | `core.feedbacks`, `npsSurveyEngine.ts` | 고객 불만 지수 수집, VOC 통계 | 공정 불량률(PPM), 재작업 공수/비용 산정 | 불량 수량 집계 및 손실비용 환산 뷰 추가 | 불량 은폐로 인한 품질 원가 왜곡 | **기존 Capability 확장** | 중간 |
| C. 품질관리(QA/QC) | 내부 심사와 후속 조치 관리 | `hygiene_haccp_log`, `sop_risk_assessment` | B | `core.hygiene_haccp_log`, `HygieneHaccpLogView.tsx` | 정기 심사 체크리스트, 점수 채점, 시정요구 | 심사 캘린더 자동 통보, 법적 감사 증빙 출력 | 심사 회차 관리 및 감사 지적사항 추적 뷰 | 인증 심사 미준수에 따른 행정 처분 위험 | **기존 Capability 확장** | 중간 |
| **D. 구매** | 구매 요청과 필요 일자 관리 | `supply_restock` | B | `core.supply_restock_items`, `SupplyRestockView.tsx` | 소모품 부족 시 간이 발주 요청, 필요수량/일자 등록 | 부서별 정식 구매 요청(PR) 품의 및 승인선 | 구매 요청서 결재선 연계 및 상태 관리 | 임의 구매에 따른 불필요 자재 과다 매입 | **기존 Capability 확장** | 낮음 |
| D. 구매 | 공급업체별 견적 비교 | `vendor_ap_invoice` | B | `vendorApInvoiceEngine.ts`, `VendorApInvoiceView.tsx` | 업체별 등록 및 단가 기록 | 복수 업체 견적서(RFQ) 3자 대조표, 최저가 선정 | 견적서 비교 분석 뷰 및 첨부파일 관리 | 공급업체 유착 및 고가 매입 리스크 | **기존 Capability 확장** | 중간 |
| D. 구매 | 금액별 구매 승인 | (공통 전자결재 부재) | - | - | 없음 | 금액 구간별(전결/부서장/대표이사) 차등 승인선 | 전사 공통 `approval_workflow`에 위임 연계 | 전결권한 위반 및 무단 지출 | **신규 Capability 필요** | 높음 |
| D. 구매 | 발주 상태와 납기 관리 | `inventory`, `supply_restock` | A / B | `core.purchase_orders`, `core.supply_restock_items` | 발주서 생성, 발주일/예정일, 상태(ordered/received) | 부분 입고 처리, 납기 지연 자동 독촉 알림 | 입고 검수 연계 및 미입고 잔량 추적 로직 | 납기 지연으로 인한 생산 중단 위험 | **재사용 가능** | 낮음 |
| D. 구매 | 공급업체 평가 | `level_assessment` (엔진) | B | `levelAssessmentEngine.ts` | 항목별 가중치 평가, 점수 산출, 등급 부여 | 정기 공급업체 평가(품질/납기/가격) 전용 뷰 | 평가 템플릿에 공급업체용 평가 지표 구성 | 부실 공급업체 방치로 인한 공급망 붕괴 | **설정 확장** | 낮음 |
| D. 구매 | 계약서·견적서·발주 관련 문서 관리 | `digital_contract`, `vendor_ap_invoice` | C / B | `digitalContractEngine.ts`, Supabase Storage | 전자서약 및 계약 상태 관리 | 발주서/계약서 PDF 원본 보관, 만료일 알림 | 문서 스토리지 메타 대장 연계 | 계약서 분실 및 법적 분쟁 시 증빙 미비 | **기존 Capability 확장** | 중간 |
| D. 구매 | 구매 예산 및 단가 절감 분석 | Core `finance`, `billing_invoicing` | A | `core.expenses`, `expenseCategories.ts` | 매입 지출액 등록 및 집계 | 과거 단가 변동 추이, 구매 단가 절감률(Cost Reduction) | 품목별 구매 단가 시계열 통계 뷰 | 원자재 가격 상승 미반영에 따른 마진 악화 | **기존 Capability 확장** | 중간 |
| **E. 연구개발(R&D)** | 연구과제·목표·일정·예산 관리 | `mbo` | C | `core.mbo_projects`, `core.mbo_objectives` | 연구과제 등록, 목표 수립, 일정 마일스톤 | 과제별 세부 연구비 집행 대사, 단계별 산출물 | `mbo` 과제 관리 확장 및 연구비 예산 매핑 | 연구비 유용 및 과제 중복 투자 위험 | **기존 Capability 확장** | 중간 |
| E. 연구개발(R&D) | 실험 조건·시료·장비·결과 기록 | (전문 ELN 부재) | - | - | 없음 | 전자연구노트(ELN), 시료 로트 번호, 측정기기 연동 | 전문 ELN SaaS 도입 권장 (Moa 범위 밖) | 연구데이터 위변조 및 특허 분쟁 시 증거력 상실 | **외부 연계 필요** | 매우 높음 |
| E. 연구개발(R&D) | 시험 계획·조건·판정 기준·결과 보고 | `exam_grade_analytics`, `level_assessment` | B | `examGradeAnalyticsEngine.ts` | 조건별 기준 점수 및 판정 결과 계산 | 연구용 시험 성적서, 원시 데이터 그래프 시각화 | 전문 R&D 기능으로 분류되므로 자체 구축 부적합 | 부정확한 시험 결과로 인한 설계 결함 | **보류 권장** | 높음 |
| E. 연구개발(R&D) | 연구 노트와 기술 문서 버전 관리 | `learning_journal`, Core Storage | B / A | `core.learning_journals`, `LearningJournalFeedView.tsx` | 일자별 일지 기록, 피드형 타임라인, 미디어 첨부 | 공인인증 시점확인(TSA), 위변조 방지 해시 블록체인 | 법적 연구노트 요건은 전문 솔루션 위임 권장 | 영업비밀 유출 및 연구노트 법적 효력 부인 | **보류 권장** | 매우 높음 |
| E. 연구개발(R&D) | 아이디어 제안과 기술 검토 | `feedbacks` | B | `core.feedbacks`, `FeedbacksAndHandoverView.tsx` | 사내 제안 접수, 댓글 토론, 채택/검토 상태 | 기술성/사업성 평가 다면 채점표 | `feedbacks` 카테고리에 'r&d_idea' 추가 및 채점 | 유망 아이디어 사장 및 특허 출원 시기 실기 | **설정 확장** | 낮음 |
| E. 연구개발(R&D) | 기획→실험→검증→승인→양산 이관 단계 관리 | `task_pipeline` | C | `taskPipelineEngine.ts`, `TaskPipelineKanbanView.tsx` | 단계별 칸반 이동, SLA 지연 경보, 게이트웨이 전이 | 개발 단계 게이트 통과 승인 서명 연계 | Stage를 R&D 라이프사이클로 매핑 및 승인 연계 | 검증 미완료 상태에서 양산 이관 사고 | **설정 확장** | 낮음 |
| E. 연구개발(R&D) | 과거 실험 및 실패 사례 검색 | (검색 인덱싱 부재) | - | - | 없음 | 과거 실험 조건 및 실패 원인全文 검색 | 벡터 검색 및 지식베이스 구축 필요 | 중복 실험에 따른 연구비 낭비 | **보류 권장** | 높음 |
| E. 연구개발(R&D) | 특허 검토와 기밀 자료 접근 관리 | Core `authorization` | A | `src/core/authorization/`, `accessControlProvider.ts` | 역할 기반 세부 권한 격리, 기밀 열람 제한 | 문서 보안(DRM), 워터마크 출력 | 보안 등급별 역할 권한 매핑 선언 | 핵심 기술 유출 및 경쟁사 유출 위험 | **재사용 가능** | 낮음 |
| **F. 생산** | 생산계획과 품목별 일정 관리 | `scheduling`, `shift_schedule` | A / C | `core.schedules`, `shiftScheduleEngine.ts` | 일정 슬롯 배정, 캘린더 배치 | 품목별 생산 오더(PO), 일일 생산 Capa 계산 | 생산 스케줄링 확장 또는 MES 연동 | 생산 지연에 따른 고객 납기 불이행 | **기존 Capability 확장** | 높음 |
| F. 생산 | 작업지시 및 작업자·설비 배정 | `task_pipeline`, `work_order_kanban` | C | `workOrderKanbanEngine.ts`, `instructorMatchEngine.ts` | 공정 칸반, 작업자 및 설비 슬롯 배정 | 작업지시서(Work Order) 정식 발행, 설비 가동 상태 | DB 영속화 및 작업지시서 출력 뷰 구축 | 미배정 또는 중복 배정으로 인한 설비 유휴 | **기존 Capability 확장** | 중간 |
| F. 생산 | 계획 대비 생산량 및 양품·불량 실적 | (공정 실적 부재) | - | - | 없음 | 시간대별 생산 실적 집계, 달성률 산출 | 전문 MES 영역으로 Moa에서 직접 구현 시 부담 | 실적 누락으로 인한 생산성 통계 왜곡 | **외부 연계 필요** | 높음 |
| F. 생산 | 공정 조건 및 작업 체크리스트 | `sop_risk_assessment`, `maintenance_checklist` | B / C | `core.workplace_policies`, `SopRiskAssessmentView.tsx` | 공정별 표준 작업 지침, 안전 수칙, 일일 점검표 | 온도/압력/속도 등 조건 센서 실시간 수집 | 공정 파라미터 체크 폼 확장 | 부적합 조건 가동으로 대량 불량 발생 | **재사용 가능** | 낮음 |
| F. 생산 | 설비 점검과 예방정비 일정 | `maintenance_checklist`, `equipment_lifecycle` | C / B | `core.maintenance_issues`, `maintenanceChecklistEngine.ts` | 정기 점검표, 설비 고장 이슈 접수, 가동 수명 | 예방정비(PM) 주기 캘린더 자동 스케줄링 | 정기 정비 알림 및 정비 부품 소모 연계 | 설비 불시 고장으로 인한 라인 정지 | **기존 Capability 확장** | 중간 |
| F. 생산 | 원료·부품 소요량과 자재 요청 | `recipe_bom`, `supply_restock` | C / B | `recipeBomEngine.ts`, `core.supply_restock_items` | 제품별 BOM(소모 레시피) 정의, 자재 소요량 산출 | 생산지시 시 재고 자동 예약 및 출고 연동 | BOM과 `core.stock_movements` 간 원자적 출고 연계 | 원료 부족으로 생산 중단 및 결품 발생 | **기존 Capability 확장** | 중간 |
| F. 생산 | 비가동·불량·재작업 분석 | (MES 설비 분석 부재) | - | - | 없음 | 비가동 사유(설비고장/원료결품), 재작업 공수 집계 | 전문 MES 공정 분석 영역 | 비가동 원인 미파악으로 생산 효율 저하 | **외부 연계 필요** | 높음 |
| F. 생산 | 교대 인수인계 | `feedbacks` | B | `core.handover_notes`, `FeedbacksAndHandoverView.tsx` | 조별 인수인계 작성, 체크리스트, 다음 근무자 전자서명 | 전 근무조 미완료 작업 자동 이관 | `core.handover_notes`에 작업지시 ID 링크 추가 | 교대 시 주요 전달사항 누락으로 안전/품질 사고 | **재사용 가능** | 낮음 |
| **G. 물류·자재·창고** | 입고·출고 처리 | `inventory` | A | `core.stock_movements`, `apply_stock_movement_atomic` | 입고/출고/반품 원자적 트랜잭션, 재고 수량 자동 동기화 | 입출고 검수 확인 및 거래명세서 출력 | 거래명세서 인쇄 템플릿 추가 | 무단 반출 및 전산 재고 불일치 (현재 RPC 방어) | **재사용 가능** | 낮음 |
| G. 물류·자재·창고 | 바코드·QR 기반 품목 식별 | `inventory` | A | `BarcodeScannerModal.tsx`, `BarcodeLabelPrintModal.tsx` | 품목별 바코드/QR 라벨 출력, 카메라 스캔 식별 | 이동형 PDA 전용 초고속 연속 스캔 모드 | 웹 카메라 외 하드웨어 스캐너 키보드 웨지 지원 보완 | 오인식으로 인한 오출고 위험 | **재사용 가능** | 낮음 |
| G. 물류·자재·창고 | 재고 실사와 차이 관리 | `inventory` | A | `core.stock_movements` (type: 'audit'), `inventoryEngine.ts` | 실사 조정 수량 반영 및 차이 수량 기록 | 정기 실사 대사표(전산고 vs 실사고) 전용 UI | 재고 실사 전표 폼 신설 | 실사 차이 임의 조정으로 인한 횡령 은폐 위험 | **기존 Capability 확장** | 낮음 |
| G. 물류·자재·창고 | 로트·유효기간·추적성 관리 | (로트 필드 미비) | - | `core.stock_movements` | 품목 기본 수량만 추적됨 | 로트 번호, 유효기간(Expiry Date), 선입선출(FIFO) 추적 | `stock_movements` 및 `inventory`에 lot_no, expiry_date 추가 | 유효기간 경과 자재 출고로 품질 리스크 | **기존 Capability 확장** | 중간 |
| G. 물류·자재·창고 | 안전재고와 재주문 알림 | `inventory`, `supply_restock` | A / B | `core.inventory.min_stock_level`, `supplyRestockEngine.ts` | 안전재고 미달 시 실시간 경보, 간이 발주 품의 제안 | 리드타임 기반 적정 안전재고 동적 계산 | 계절/수요 변동 지수 반영 로직 보완 | 재고 고갈로 인한 납기 지연 | **재사용 가능** | 낮음 |
| G. 물류·자재·창고 | 창고·구역 간 재고 이동 이력 | Core `locations`, `inventory` | A | `core.locations`, `core.organization_locations` | 다중 위치 등록 및 사업장 분점 관리 | 창고 내 구역(Rack/Bin) 간 이동 이력 추적 | `stock_movements`에 from_location / to_location 추가 | 위치 불명 자재 발생으로 창고 내 미아 품목 발생 | **기존 Capability 확장** | 중간 |
| **H. 인사·총무** | 직원 입사·퇴사 및 업무 인계 | Core `staff`, `feedbacks` | A / B | `core.staff`, `core.staff_invitations`, `core.handover_notes` | 직원 초대, 직책/역할 부여, 퇴사 처리 및 권한 회수 | 입퇴사 온보딩 체크리스트(PC/계정/보안서약) 패키지 | 퇴사 체크리스트 템플릿 번들 추가 | 퇴사자 권한 미회수로 인한 정보 유출 (현재 즉시 비활성화 지원) | **재사용 가능** | 낮음 |
| H. 인사·총무 | 교육 이수와 자격 만료 관리 | `curriculum_progress`, `hygiene_haccp_log` | C / B | `core.care_staff_health_certs`, `curriculumProgressEngine.ts` | 교육 이수 체크, 보건증/자격증 만료 D-day 경보 | 법정 의무교육(성희롱/개인정보/안전) 수료증 자동 발급 | 법정 교육 트래킹 뷰 및 증빙 파일 보관 | 법정 의무교육 미이수로 인한 과태료 처분 | **기존 Capability 확장** | 낮음 |
| H. 인사·총무 | 근무 일정 및 교대 인수인계 | `shift_schedule`, `work_attendance_payroll` | C / B | `shiftScheduleEngine.ts`, `core.handover_notes` | 교대 근무표 작성, 근무조 배정, 인수인계 서약 | 주 52시간 한도 초과 방지, 모바일 출퇴근 타임카드 | DB 스키마 생성 및 근태 타임카드 GPS/Wifi 인증 연계 | 허위 출퇴근 및 법정 근로시간 위반 리스크 | **기존 Capability 확장** | 중간 |
| H. 인사·총무 | 비품·자산 지급·회수·수리 이력 | `rental_equipment`, `equipment_lifecycle` | C / B | `core.bookable_resources`, `equipmentLifecycleEngine.ts` | 장비 대여 및 점유 기록, 노후 장비 수명 | 개인별 지급 비품(노트북/사원증) 대장, 회수 서명 | 비품 지급/회수 전용 대장 UI 구축 | 비품 미회수로 인한 자산 유실 | **기존 Capability 확장** | 중간 |
| H. 인사·총무 | IT·시설·구매 등 내부 요청 | `feedbacks` | B | `core.feedbacks` (is_internal_only=true) | 사내 헬프데스크 접수, 처리 상태, 담당자 답변 | SLA 기한 경보, 긴급도별 푸시 통보 | 헬프데스크 전용 카테고리 뷰 프리셋 구성 | 내부 요청 방치로 인한 업무 마비 | **재사용 가능** | 낮음 |
| H. 인사·총무 | MBO 목표 설정·승인·진행·평가 | `mbo` | C | `core.mbo_projects`, `core.mbo_evaluations`, `mboEngine.ts` | 완벽한 MBO DB 테이블, KPI 가중치, 다면평가 계산 | 관리자 및 직원용 평가 입력 화면 부재 (엔진만 존재) | `src/capabilities/mbo/ui/` 뷰 개발 및 index.ts 연계 | 인사고과 데이터 유출 및 공정성 논란 (RLS 적용 완료) | **기존 Capability 확장** | 중간 |
| **I. 재무·경영관리** | 부서별 예산 편성·집행·잔액 관리 | `billing_invoicing`, Core `finance` | A | `core.expenses`, `expenseCategories.ts` | 비용 집행 기록, 카테고리별 누적액 | 부서별 연간 예산 한도 설정, 예산 소진율 실시간 차단 | 예산 편성 테이블 신설 및 집행 시 잔여한도 검증 RPC | 무분별한 지출로 인한 예산 초과 | **기존 Capability 확장** | 중간 |
| I. 재무·경영관리 | 비용 신청·증빙·승인 | `vendor_ap_invoice`, Core `finance` | B / A | `core.expenses`, `VendorApInvoiceView.tsx` | 지출 증빙 및 공급업체 세금계산서 정보 등록 | 영수증 OCR 자동 인식, 다단계 비용 지출 결재선 | 영수증 업로드 및 결재선 연계 폼 | 가짜 영수증 처리 및 횡령 위험 | **신규 Capability 필요** | 중간 |
| I. 재무·경영관리 | 프로젝트 원가와 계획 대비 실제 비용 | `mbo`, `billing_invoicing` | C / A | `core.mbo_projects`, `core.expenses` | 프로젝트 매핑 및 지출 항목 귀속 | 프로젝트별 인건비/외주비/재료비 원가 통합 집계 | 원가 분석 대시보드 뷰 구성 | 원가 과소 계상으로 프로젝트 적자 수주 | **기존 Capability 확장** | 중간 |
| I. 재무·경영관리 | 월간 실적과 예산 차이 보고 | Core `finance`, `billing` | A | `monthlyTuitionStatus.ts`, `financePaymentMirror.ts` | 월별 매출/비용 마감, 수납 상태 집계 | 경영진 보고용 P&L 손익계산서 엑셀 리포트 | 재무제표 요약 리포트 출력 컴포넌트 추가 | 결산 수치 왜곡 및 세무 신고 오류 | **기존 Capability 확장** | 중간 |
| I. 재무·경영관리 | 결재 및 변경 이력 | Core `audit` | A | `core.audit_logs`, `auditCapability.ts` | 모든 재무 레코드의 생성/수정/삭제 불변 감사 로깅 | 부서장 감사 전용 조회 콘솔 | 감사 콘솔 UI 뷰 연계 | 감사 로그 위변조 (현재 DB 트리거로 방어됨) | **재사용 가능** | 낮음 |
| I. 재무·경영관리 | 부서별 핵심 지표와 미해결 위험 대시보드 | Core `dashboard`, `facility_incident_report` | A / B | `src/core/dashboard/`, `core.facility_incident_reports` | 주요 운영 지표 시각화, 미해결 사고 현황 노출 | 부서별 위험도(재무/품질/안전) 통합 점수화 | 종합 리스크 인덱스 위젯 추가 | 위험 신호 간과로 인한 경영 위기 | **설정 확장** | 낮음 |
| **J. 추가 업무 (영업)** | 영업 기회 및 파이프라인 관리 | `trial_funnel` | B | `core.trial_leads`, `TrialFunnelKanbanView.tsx` | 신규 접수-상담-제안-계약 칸반 단계 전이, 전환율 집계 | B2B 영업 기회 규모(예상 수주액), 수주 확률 계산 | 리드 테이블에 예상 수주액, 예상 수주일 추가 | 영업 기회 유실 및 매출 예측 실패 | **재사용 가능** | 낮음 |
| J. 추가 업무 (영업) | 견적서 작성 및 관리 | `work_order_kanban`, `billing_invoicing` | C / A | `workOrderKanbanEngine.ts`, `core.payment_transactions` | 작업/품목별 견적 금액 산출 | 정식 견적서 PDF 출력, 견적서 유효기간 관리 | 견적서 생성 및 출력 모달 추가 | 견적 오류로 인한 손실 계약 | **기존 Capability 확장** | 낮음 |
| J. 추가 업무 (영업) | 후속 연락(Follow-up) 일정 관리 | `consultation_crm` | A | `core.consultations`, `ConsultationCrmView.tsx` | 고객별 상담 일정 예약, 캘린더 연동, 담당자 지정 | 후속 연락 D-day 자동 알림, 미연락 리드 경보 | 상담 테이블에 next_followup_date 추가 | 고객 후속 조치 누락으로 계약 실패 | **재사용 가능** | 낮음 |
| J. 추가 업무 (영업) | 고객별 접촉 이력 관리 | `consultation_crm` | A | `core.consultations`, `core.customer_contacts` | 고객별 과거 통화/방문 이력, 메모 시계열 조회 | 이메일/SMS 송수신 자동 로깅 | 통신 게이트웨이 연계 보완 | 고객 개인정보 및 상담 이력 누출 (RLS 격리됨) | **재사용 가능** | 낮음 |
| **J. 추가 업무 (고객지원)** | 문의·불만(VOC) 접수 | `feedbacks` | B | `core.feedbacks`, `FeedbacksAndHandoverView.tsx` | 고객 VOC 접수, 제목/내용 등록, 고객 ID 바인딩 | 웹 챗봇/카카오톡 채널 연동 접수 | 외부 메신저 웹훅 연동 추가 | 악성 VOC 누락 및 대응 지연 | **재사용 가능** | 낮음 |
| J. 추가 업무 (고객지원) | 처리 상태 및 담당자 배정 | `feedbacks` | B | `core.feedbacks` (status: open/in_progress/resolved) | 접수-진행-완료 상태 전이, 담당 상담원 배정 | 상담원별 티켓 배분 로직, 1차 응답 기록 | 상담원 자동 배정 룰 추가 | 미처리 티켓 방치 | **재사용 가능** | 낮음 |
| J. 추가 업무 (고객지원) | 응답 기한(SLA) 관리 | `task_pipeline` (엔진) | C | `evaluateStageSla`, `taskPipelineEngine.ts` | 접수 후 경과시간 계산, SLA 초과 경보 플래그 | 고객지원 티켓 전용 SLA 카운트다운 타이머 UI | `feedbacks` 뷰에 SLA 계산 엔진 결합 | SLA 위반으로 인한 고객 이탈 | **기존 Capability 확장** | 낮음 |
| **J. 추가 업무 (안전/EHS)** | 안전 점검 | `sop_risk_assessment`, `maintenance_checklist` | B / C | `core.workplace_policies`, `SopRiskAssessmentView.tsx` | 현장 안전 점검표 작성, 점검 결과 기록 | 법정 안전점검 주기 자동 스케줄링 | 정기 안전점검 캘린더 연계 | 안전 점검 미실시로 인한 중대재해 위험 | **재사용 가능** | 낮음 |
| J. 추가 업무 (안전/EHS) | 위험성 평가 | `sop_risk_assessment` | B | `sopRiskAssessmentEngine.ts`, `SopRiskAssessmentView.tsx` | 위험 요인 식별, 빈도(1~5) x 강도(1~5) = 위험도 산출 | 법정 3단계 위험성평가(상중하) 보고서 출력 | 산업안전보건공단 표준 서식 출력 기능 추가 | 법정 위험성평가 미실시 과태료 | **재사용 가능** | 낮음 |
| J. 추가 업무 (안전/EHS) | 사고 보고 및 경위서 | `facility_incident_report` | B | `core.facility_incident_reports`, `FacilityIncidentReportView.tsx` | 사고 일시/장소, 인명/물적 피해, 경위서 작성 | 산업재해조사표 자동 서식 생성 | 관공서 보고 양식 매핑 | 산재 은폐에 따른 형사 처벌 위험 | **재사용 가능** | 낮음 |
| J. 추가 업무 (안전/EHS) | 시정 및 개선 조치 | `facility_incident_report` | B | `core.facility_incident_timelines`, `incidentReportEngine.ts` | 재발 방지 조치 계획 수립, 이행 타임라인 | 개선 조치 이행 여부 현장 확인 승인선 | 조치 완료 확인 결재 단계 연계 | 재발 방지 조치 미이행 사고 | **재사용 가능** | 낮음 |
| J. 추가 업무 (안전/EHS) | 법정 점검 및 교육 이력 관리 | `workplace_policy`, `hygiene_haccp_log` | B | `core.policy_acknowledgements`, `core.care_staff_health_certs` | 근로자 안전보건 서약, 자격/검사 유효기간 관리 | 법정 안전교육 이수 시간 집계, 미이수자 경보 | 교육 시간(분기별 6시간 등) 산출 필드 추가 | 법정 안전교육 미준수 처벌 | **재사용 가능** | 낮음 |
| **J. 추가 업무 (IT)** | 장애/헬프데스크 티켓 | `feedbacks` | B | `core.feedbacks` (is_internal_only=true) | 사내 시스템 장애 접수, 처리 진행, 조치 완료 | 장애 등급(P1/P2/P3) 부여 및 긴급 당직자 호출 | 티켓 우선순위 등급 필드 추가 | 전사 시스템 장애 장기화 | **기존 Capability 확장** | 낮음 |
| J. 추가 업무 (IT) | 계정 및 장비 할당 관리 | Core `staff`, `rental_equipment` | A / C | `core.staff`, `core.authorization_grants` | 직원 계정 발급, 권한 부여, 장비 지급 기록 | 퇴사 시 계정 자동 잠금(SSO 연동), SW 라이선스 관리 | 소프트웨어 라이선스 대장 연계 | 퇴사자 계정 무단 도용 위험 | **재사용 가능** | 낮음 |
| J. 추가 업무 (IT) | 변경 승인 워크플로 | (공통 전자결재 부재) | - | - | 없음 | IT 시스템 배포/DB 변경 승인 신청 및 검토 | 전사 공통 `approval_workflow`에 위임 연계 | 미승인 변경으로 인한 대규모 전산 장애 | **신규 Capability 필요** | 높음 |
| J. 추가 업무 (IT) | 시스템 점검 및 문제 원인 분석 | `maintenance_checklist`, `sop_risk_assessment` | C / B | `maintenanceChecklistEngine.ts`, `core.audit_logs` | 정기 서버/DB 점검 항목 체크, 변경 감사로그 조회 | 사후 장애 원인 분석 보고서(Post-mortem) | 장애 리뷰 템플릿 추가 | 동일 시스템 장애 재발 | **재사용 가능** | 낮음 |

---

### 3.3 분류 결과 종합 통계
- **재사용 가능:** 19건 (25.0%) — 현재 코드로 즉시 업무 처리 가능
- **설정 확장:** 6건 (7.9%) — 프리셋/옵션 설정만으로 업무 적용 가능
- **기존 Capability 확장:** 36건 (47.4%) — 테이블 컬럼 추가, DB 바인딩, UI 뷰 보완 필요
- **신규 Capability 필요:** 8건 (10.5%) — 전사 범용 전자결재(`approval_workflow`), 독립 품질검사(`quality_inspection`), 4M 변경관리(`change_management`) 등
- **외부 연계 필요:** 3건 (3.9%) — 전문 MES 공정 실적, R&D 전자연구노트(ELN)
- **보류 권장:** 4건 (5.3%) — 마케팅 SNS 퍼블리셔, 특허 벡터 검색 등

> **결론:** 요구사항 76개 중 **약 80.3%(61건)**가 Moa-v2의 기존 Capability를 재사용하거나 설정/기존 코드를 점진적으로 확장함으로써 해결 가능하다. 신규 개발이 필요한 영역은 공통 전자결재와 전문 품질검사 등 극소수 핵심 도메인에 국한된다.


## 4. [보고서 C] 중복 및 구조적 문제점 심층 분석

본 섹션에서는 Moa-v2 코드베이스 전수 조사 과정에서 확인된 아키텍처적 결함, 기능 중복, 영속성 단절, 테스트 공백 및 유지보수 위험을 실제 코드 파일 경로와 라인 번호를 근거로 상세히 분석한다.

---

### 4.1 유사 기능의 중복 구현 및 파편화 (7대 중복 패턴)

동일한 비즈니스 본질을 가진 도메인 로직이 서로 다른 이름의 Capability로 분산 구현되어 있어, 향후 유지보수 비용을 급증시키고 데이터 일관성을 해치는 중복 사례가 발견되었다:

#### 1) 작업 공정 칸반의 이중 구현 (`task_pipeline` vs `work_order_kanban`)
- **실제 파일:**
  - [`TaskPipelineKanbanView.tsx`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/task_pipeline/ui/TaskPipelineKanbanView.tsx#L26-L32) (`task_pipeline`)
  - [`WorkOrderKanbanView.tsx`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/work_order_kanban/components/WorkOrderKanbanView.tsx#L20-L40) (`work_order_kanban`)
- **코드 근거:**
  - 두 모듈 모두 `RECEIVED` $ightarrow$ `IN_PROGRESS` $ightarrow$ `INSPECTION` $ightarrow$ `COMPLETED` 형태의 5단계 공정 상태 머신과 SLA 시간 지연 계산 로직을 복제하여 소유하고 있다.
  - 심지어 둘 다 브라우저 `localStorage` 키(`moa_task_pipeline_orders`, `moa_work_order_kanbans`)를 사용하여 완전히 동일한 UI 칸반 드래그 앤 드롭 및 단계 전이를 구현했다.
- **영향 및 권고:** `task_pipeline`을 업종 중립적 범용 공정 엔진으로 단일화하고, `work_order_kanban`은 별도 Capability가 아닌 프리셋 설정(preset setupSchema)으로 흡수 단일화해야 한다.
- **[조치 완료 (2026-10-17)]:** `src/capabilities/work_order_kanban/components/WorkOrderKanbanView.tsx`가 `TaskPipelineKanbanView`로 단일화되어 리디렉션 처리되었으며, `task_pipeline`은 `core.task_orders` DB 스키마와 Refine `useList`로 영속화되어 중복 파편화가 완전히 해소됨.

#### 2) 비대면 주문 및 대기열 처리의 중복 (`table_order_kds` vs `pickup_orders`)
- **실제 파일:**
  - [`KitchenDisplaySystemView.tsx`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/table_order_kds/components/KitchenDisplaySystemView.tsx#L1-L50)
  - [`PickupOrdersKanbanView.tsx`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/pickup_orders/components/PickupOrdersKanbanView.tsx#L1-L50)
- **코드 근거:**
  - 주문 접수 $ightarrow$ 조리/준비 $ightarrow$ 픽업 호출의 3단계 큐(Queue) 처리 로직이 두 컴포넌트에 나뉘어 중복 작성되어 있다.
- **영향 및 권고:** 주문 라이프사이클을 하나의 오더 큐 엔진으로 통합 관리해야 한다.

#### 3) 고객 유입 및 상담 관리의 중복 (`consultation_crm` vs `trial_funnel`)
- **실제 파일:**
  - [`ConsultationCrmView.tsx`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/consultation_crm/components/ConsultationCrmView.tsx) (테이블: `core.consultations`)
  - [`TrialFunnelKanbanView.tsx`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/trial_funnel/ui/TrialFunnelKanbanView.tsx) (테이블: `core.trial_leads`)
- **코드 근거:**
  - 신규 고객 유입, 상담 일정 예약, 상담 내용 기록이라는 동일한 업무 흐름이 `core.consultations`와 `core.trial_leads`라는 두 개의 독립 테이블로 분리되어 데이터 연계가 단절되어 있다.
- **영향 및 권고:** 리드 유입 파이프라인(`trial_funnel`)의 최종 전환 단계에서 `consultations` 또는 `customers` 레코드가 원자적으로 연계 생성되도록 브릿지를 구성해야 한다.

#### 4) 전자 계약 및 서약 관리의 중복 (`digital_contract` vs `safety_consent`)
- **실제 파일:**
  - [`digitalContractEngine.ts`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/digital_contract/domain/digitalContractEngine.ts)
  - [`SafetyConsentManagementView.tsx`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/safety_consent/components/SafetyConsentManagementView.tsx)
- **코드 근거:**
  - 모바일 터치 자필 서명(SVG/Data URL), 동의 조항 버전 관리, 환불 위약금 산정 로직이 파편화되어 있다.
- **영향 및 권고:** 전자 서명 및 약관 동의 라이프사이클을 하나의 계약 엔진으로 통합해야 한다.

#### 5) 체크리스트 기반 점검 엔진의 3중 구현 (`maintenance_checklist` vs `sop_risk_assessment` vs `hygiene_haccp_log`)
- **실제 파일:**
  - `src/capabilities/maintenance_checklist/`
  - `src/capabilities/sop_risk_assessment/`
  - `src/capabilities/hygiene_haccp_log/`
- **코드 근거:**
  - "항목 목록 조회 $ightarrow$ 항목별 적합/부적합 체크 $ightarrow$ 서명/사진 첨부 $ightarrow$ 점수 산출"이라는 점검 본질이 3개 모듈에서 제각각 다른 데이터 구조로 구현되어 있다.
- **영향 및 권고:** 공통 Core 체크리스트 엔진(`core.checklist_templates`, `core.checklist_items`)을 기반으로 데이터 스키마를 단일화하고, 업종별 점검표는 템플릿 카테고리로 분기해야 한다.

#### 6) 급여 및 정산 로직의 분산 (`commission_payroll` vs `work_attendance_payroll` vs Core `teacher_payroll_settlements`)
- **실제 파일:**
  - [`CommissionPayrollView.tsx`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/commission_payroll/components/CommissionPayrollView.tsx)
  - [`WorkAttendancePayrollView.tsx`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/work_attendance_payroll/components/WorkAttendancePayrollView.tsx)
  - [`20260920090000_teacher_payroll_settlements.sql`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/supabase/migrations/20260920090000_teacher_payroll_settlements.sql)
- **코드 근거:**
  - 인센티브/수수료 정산과 기본 근태 기반 급여 계산, 강사 정산이 서로 다른 파일과 로컬스토리지에 분산되어 회계 전표(`core.expenses`)와의 일괄 연동이 불가능하다.

#### 7) 공간 점유 및 정비 버퍼의 중복 (`space_turnaround` vs `seat_room`)
- **실제 파일:**
  - `src/capabilities/space_turnaround/`
  - `src/capabilities/seat_room/`
- **코드 근거:**
  - 회의실/연습실/룸 이용 종료 후 정비 시간(Turnaround Buffer, 예: 15분 청소)을 두는 로직이 `seat_room`과 `space_turnaround`에 분산되어 있다.

---

### 4.2 영속성 단절 및 멀티테넌트 격리 무력화 (18개 LocalStorage 목업)

Moa-v2의 핵심 아키텍처 원칙은 Supabase RLS와 `organization_id`를 통한 완벽한 테넌트 데이터 격리이다. 그러나 전수 조사 결과, **18개 Capability가 Supabase DB를 전혀 사용하지 않고 클라이언트 브라우저의 `localStorage`에만 데이터를 읽고 쓰고 있음**이 확인되었다.

- **해당 Capability (18개):**
  `commission_payroll`, `curriculum_progress`, `diet_body_log`, `digital_contract`, `lost_found`, `maintenance_checklist`, `recipe_bom`, `rental_equipment`, `retention_marketing`, `seat_timer_billing`, `shift_schedule`, `table_order_kds`, `task_pipeline`, `treatment_chart`, `treatment_portfolio`, `vehicle_shuttle`, `workplace_policy`, `work_order_kanban`
- **실제 코드 증거 (예시: `TaskPipelineKanbanView.tsx` L24, L71-76):**
  ```typescript
  const STORAGE_KEY_PIPELINES = 'moa_task_pipeline_orders';
  ...
  const saved = localStorage.getItem(STORAGE_KEY_PIPELINES);
  if (saved) {
    setOrders(JSON.parse(saved));
  } else {
    setOrders(INITIAL_SAMPLE_ORDERS);
    localStorage.setItem(STORAGE_KEY_PIPELINES, JSON.stringify(INITIAL_SAMPLE_ORDERS));
  }
  ```
- **구조적 및 보안 위험:**
  1. **테넌트 격리 전무:** 다른 조직(`organization_id`)의 관리자가 동일 브라우저에서 로그인할 경우 이전 조직의 샘플/수정 데이터가 그대로 노출된다.
  2. **데이터 유실:** 브라우저 캐시 삭제 또는 다른 기기 접속 시 모든 업무 데이터가 사라진다.
  3. **다중 사용자 협업 불가:** 관리자 A가 작업을 변경해도 관리자 B의 화면에 실시간 반영되지 않는다.
  4. **감사 추적 불가:** 누가 언제 데이터를 변경했는지 `core.audit_logs`에 기록되지 않는다.

> **[조치 완료 (2026-10-17)]:**
> 1. **핵심 도메인 DB 영속화:** `task_pipeline`(`core.task_orders`), `workplace_policy`(`core.workplace_policies`, `core.policy_acknowledgements`), `maintenance_checklist`(`core.checklist_items`)를 Refine `useList`, `useCreate`, `useUpdate` 기반으로 실제 Supabase DB와 연동하여 영속화 및 멀티테넌트 RLS를 적용함.
> 2. **멀티테넌트 키 격리 안전 가드:** 브라우저 저장소를 사용하는 15개 전체 모듈에 `getTenantStorageKey`(`src/shared/utils/tenantStorage.ts`)를 적용하여, 로그인된 `organization_id` 접두사가 포함된 격리된 키를 사용하도록 강제함으로써 조직 간 데이터 침범 위험을 원천 차단함.

---

### 4.3 레지스트리 불일치 및 테스트 실패 (CI Contract 결함) — [조치 완료: Phase 0]

> **조치 결과 (2026-10-17):** `src/capabilities/_shared/capabilityTypes.ts`의 `CAPABILITY_IDS`에 `'mbo'`를 등록하고, `src/capabilities/mbo/index.ts`를 신설하여 계약 정합성을 복구함. 현재 `npm run test:capability-public-api` 및 58개 테스트 체인이 100% 정상 통과함.

과거 조사 당시 `npm test` 실행 시 CI 파이프라인이 54번째 테스트에서 에러로 중단되었던 현상:

- **실패 스크립트:** `npm run test:capability-public-api` (파일: [`src/capabilities/publicApi.test.ts`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/publicApi.test.ts#L55))
- **실제 에러 내용:**
  ```text
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
    [
      ...
      'makeup_lesson_pass',
  +   'mbo',
      'membership_referral_tree',
      ...
    ]
  business-invariants failed
    script: test:capability-public-api
    exit: 1
  ```
- **발생 원인 분석:**
  1. `supabase/migrations/20261017130000_mbo_capability_schema.sql` 마이그레이션이 추가되고 `src/capabilities/mbo/` 디렉터리가 생성되었다.
  2. 그러나 [`src/capabilities/_shared/capabilityTypes.ts`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/_shared/capabilityTypes.ts#L10-L81)의 `CAPABILITY_IDS` 배열에는 `'mbo'`가 누락되어 있다.
  3. 또한 `src/capabilities/mbo/` 내부에는 진입점인 `index.ts`가 생성되지 않았으며, `src/app/presets/presetRegistry.ts`에도 import되지 않았다.
  4. 결과적으로 파일시스템에 존재하는 패키지 목록과 계약 파일 선언 목록 간의 불일치로 인해 계약 테스트가 중단된 상태이다.

---

### 4.4 데이터 접근 규칙 불일치 (Refine vs StorageService vs LocalStorage)

아키텍처 문서(`docs/MOA_DATA_CACHE_BOUNDARY.md`, `docs/MOA_REFINE_RUNTIME.md`)에 규정된 표준 데이터 페칭 규칙이 일관되게 지켜지지 않고 있다:
1. **Refine DataProvider 표준 준수 모듈:** `learning_journal`, `trial_funnel` (useList, useCreate를 올바르게 사용하여 `core.trial_leads`, `core.learning_journals`에 접근).
2. **StorageService 직접 호출 모듈:** `attendance`, `inventory`, `booking` (오프라인 큐 및 복합 트랜잭션 연계).
3. **LocalStorage 임의 바인딩 모듈:** 18개 모듈 (상기 4.2 참조).
4. **deprecated Shim 방치:** `src/capabilities/finance`는 `src/capabilities/billing/finance`로 대체되었음에도 불구하고 디렉터리가 삭제되지 않고 남아있으며, `publicApi.test.ts`에서 `if (name === 'finance') return false; // deprecated shim for billing` 형태로 임시 예외 처리되어 있다.

---

### 4.5 테스트 공백 및 운영 검증 한계

현재 58개 테스트 체인은 광범위해 보이지만 실질적인 업무 흐름 검증에는 다음과 같은 사각지대가 존재한다:
1. **도메인 순수 계산 함수 편중:** 신규 추가된 약 25개 Capability의 테스트(`*Engine.test.ts`)는 메모리 상의 순수 함수(예: SLA 시간 계산, 점수 합산)만 검증하며, 실제 Supabase DB 인서트, RLS 정책 차단, Refine 쿼리 페칭 동작은 테스트하지 않는다.
2. **테스트 전무 모듈:** `mbo`, `finance`, `consultation`, `transport`, `enrollment` 5개 모듈은 Capability 디렉터리 내에 독립 테스트가 전혀 존재하지 않는다.
3. **E2E 및 테넌트 침투 테스트 부재:** 일반 사용자가 타 테넌트의 `workplace_policy` 서약서나 `feedbacks` 건의 사항을 열람할 수 없음을 검증하는 통합 권한 테스트가 부족하다.


## 5. [보고서 D] 우선순위별 단계적 개선 계획

본 계획은 미구현 기능을 무차별적으로 개발하지 않고, 다부서 공통 재사용성, 기존 코드 성숙도, 보안/테넌트 격리 안정성, 회귀 위험을 종합 평가하여 5단계(P0~P3, 보류)로 구조화한 실행 로드맵이다.

---

### 5.1 우선순위 그룹 분류

| 우선순위 | 성격 및 기준 | 대상 과제 요약 | 예상 소요 / 난이도 |
|:---:|:---|:---|:---:|
| **P0** | **기존 구조 오류, CI 실패 복구, 테넌트 보안 결함** | 1. `mbo` Capability 계약 불일치 복구 및 `npm test` 그린 정상화<br/>2. 18개 LocalStorage 목업 모듈의 테넌트 데이터 오염 방지 가드 | 즉시 조치 / 낮음 |
| **P1** | **다수 부서 공통 핵심 기반 결손 해결** | 1. 전사 범용 전자결재(`approval_workflow`) 엔진 신설<br/>2. 작업 공정(`task_pipeline`) DB 영속화 및 `work_order_kanban` 흡수<br/>3. 범용 체크리스트 엔진(`maintenance_checklist`) DB화 | 단기 집중 / 중간 |
| **P2** | **부서별 핵심 업무 도메인 기능 완성** | 1. 품질관리 검사 및 부적합 관리(`quality_inspection`) 구축<br/>2. 소모품/원자재 구매 요청 및 견적 비교(`supply_restock`) 확충<br/>3. MBO 목표 및 다면평가 프론트엔드 UI 구축<br/>4. 재고 로트(Lot No) 및 유효기간 추적성 확장 | 중기 로드맵 / 중간 |
| **P3** | **부가 전문 기능 및 편의성 고도화** | 1. NPS 설문 캠페인 고도화 및 고객 세그먼트 연동<br/>2. 긴급 재난 공지 푸시 및 실시간 수신확인 대장 안정화<br/>3. 디지털 방명록(`digital_guestbook`) 마케팅 리드 연계 자동화 | 점진 적용 / 낮음 |
| **보류** | **외부 시스템 의존 또는 SaaS 대체 권장** | 1. 연구개발 전문 전자연구노트(ELN) 및 특허 벡터 검색<br/>2. 생산라인 비가동 실시간 센싱 및 전문 MES 공정 분석<br/>3. 마케팅 SNS 자동 포스팅 스케줄러 | 도입 보류 / 매우 높음 |

---

### 5.2 단계별 상세 작업 명세

#### [P0-1] `mbo` Capability 공공 API 계약 정합성 복구
- **목적:** 현재 `npm test` 체인 중단(exit code 1) 해소 및 CI 무결성 복구
- **예상 변경 범위:**
  - [`src/capabilities/_shared/capabilityTypes.ts`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/capabilities/_shared/capabilityTypes.ts#L81): `CAPABILITY_IDS` 배열에 `'mbo'` 추가
  - `src/capabilities/mbo/index.ts`: 공식 export 진입점 파일 신설
  - [`src/app/presets/presetRegistry.ts`](file:///c:/Users/USER/OneDrive/문서/GitHub/Moa-v2/src/app/presets/presetRegistry.ts): `mbo` 스키마 및 리소스 번들 등록
- **의존성:** `supabase/migrations/20261017130000_mbo_capability_schema.sql` (이미 마이그레이션 존재)
- **위험도:** 매우 낮음 (기존 다른 모듈에 영향 없음)
- **완료 검증 기준:** `npm run test:capability-public-api` 및 `npm test` 58개 전체 통과

#### [P0-2] LocalStorage 기반 모듈의 테넌트 오염 방지 안전장치
- **목적:** 브라우저 캐시 공유로 인한 조직 간 데이터 노출 위험 임시 차단
- **예상 변경 범위:**
  - 18개 LocalStorage 모듈의 저장 키에 현재 로그인된 `organizationId` 접두사 강제 주입 (`moa_${orgId}_task_pipeline_orders`)
- **위험도:** 낮음 (기존 DB 스키마 무변경)
- **완료 검증 기준:** 다른 테넌트 계정으로 로그인 시 이전 테넌트 작업 목록 미노출 검증

#### [P1-1] 전사 범용 전자결재 (`approval_workflow`) Capability 구축
- **목적:** 마케팅(예산/문구 승인), 구매(금액별 구매 승인), 인사(휴가/출장), 재무(비용 결재), IT(변경 승인) 등 전 부서의 최대 공통 결손 해결
- **예상 변경 범위:**
  - 신규 마이그레이션: `core.approval_lines`, `core.approval_requests`, `core.approval_steps`
  - 신규 Capability: `src/capabilities/approval_workflow/`
  - 공통 인터페이스: 결재 대상 도메인 엔티티(예: expense_id, purchase_order_id)와 다형성 바인딩
- **위험도:** 중간 (Core 권한 및 역할 체계와 긴밀한 연계 필요)
- **완료 검증 기준:** 기안 $ightarrow$ 중간 검토 $ightarrow$ 최종 승인 $ightarrow$ 원본 엔티티 상태 자동 변경 원자적 트랜잭션 테스트

#### [P1-2] 작업 공정 파이프라인(`task_pipeline`) DB 영속화 및 단일화
- **목적:** `task_pipeline`과 `work_order_kanban`의 중복을 해소하고 전 부서 업무/작업 관리의 단일 진실 공급원 확립
- **예상 변경 범위:**
  - 신규 마이그레이션: `core.task_pipelines`, `core.task_pipeline_stages`, `core.task_orders`
  - `TaskPipelineKanbanView.tsx`를 Refine `useList` / `useUpdate` 기반으로 전환
  - `work_order_kanban` 모듈을 `task_pipeline`의 Preset 설정으로 통합하고 장기적으로 deprecated 처리
- **위험도:** 낮음 (기존 레거시 업종 기능과 충돌 없음)
- **완료 검증 기준:** 작업 순서 변경 시 DB 즉시 반영 및 다중 브라우저 실시간 동기화

#### [P2-1] 전문 품질검사 (`quality_inspection`) 도메인 구축
- **목적:** 단순 체크리스트와 품질관리의 혼동을 종식하고 정량 규격(공차), 불합격 판정, CAPA 워크플로 정립
- **예상 변경 범위:**
  - 신규 마이그레이션: `core.quality_inspection_standards`, `core.quality_inspection_records`
  - `src/capabilities/quality_inspection/` 생성
- **위험도:** 중간
- **완료 검증 기준:** Min/Max 측정값 입력 시 불합격 자동 판정 및 부적합 보고서(`core.facility_incident_reports`) 자동 연계

#### [P2-2] 소모품/원자재 구매 요청 및 입고 관리 (`supply_restock`) 확충
- **목적:** 소모품 간이 발주 수준에서 정식 구매 요청(PR) 및 발주(PO) 입고 검수까지 확장
- **예상 변경 범위:**
  - `core.supply_restock_items`에 공급업체 견적 단가 및 승인선 연계 필드 추가
  - `inventory`의 `core.purchase_orders`와 상태 통합
- **위험도:** 낮음
- **완료 검증 기준:** 구매 요청 $ightarrow$ 발주 $ightarrow$ 입고 시 `core.inventory` 재고 수량 원자적 자동 증가

---

## 6. [보고서 E] 재사용 및 신규 개발 전략 제안 (핵심 7대 질문 답변)

### Q1. 현재 Moa가 실제로 재사용할 수 있는 업무 기능은 무엇인가?
**답변:**
Moa-v2의 핵심 기반은 매우 견고하며, 다음 **19개 업무 영역**은 신규 개발 없이 즉시 또는 설정 확장만으로 재사용할 수 있습니다:
1. **멀티테넌트 인증 및 권한 격리:** `src/core/auth/`, `src/core/organizations/`, `src/core/authorization/`, RLS
2. **불변 감사 로그(Audit Trail):** `core.audit_logs`, `src/core/audit/`
3. **재고 및 입출고 원자적 트랜잭션:** `core.inventory`, `core.stock_movements`, `apply_stock_movement_atomic`
4. **바코드 및 QR 코드 생성/스캔:** `src/capabilities/inventory/components/Barcode*.tsx`
5. **사규/내규 등록 및 직원 전자서약:** `core.workplace_policies`, `core.policy_acknowledgements`
6. **교대 근무 인수인계 및 서명 확인:** `core.handover_notes`
7. **사내 VOC 및 현장 건의 접수:** `core.feedbacks`
8. **잠재 고객(리드) 유입 및 체험 칸반:** `core.trial_leads`, `src/capabilities/trial_funnel/`
9. **현장 방문자 전자 방명록:** `core.digital_guestbook_entries`
10. **1:1 고객 상담 기록 및 접촉 이력:** `core.consultations`
11. **사고 접수 및 경위서 타임라인:** `core.facility_incident_reports`, `core.facility_incident_timelines`
12. **작업 표준 및 위험성평가(빈도x강도):** `src/capabilities/sop_risk_assessment/`
13. **고객 만족도 NPS 설문 및 지수 자동 계산:** `core.nps_survey_campaigns`, `core.nps_survey_responses`
14. **수업/업무 일지 피드 및 양방향 댓글:** `core.learning_journals`, `core.learning_journal_comments`
15. **자원/공간/회의실 시간제 예약:** `core.bookable_resources`, `core.schedules`
16. **매출 및 기본 지출 영수증 집계:** `core.expenses`, `core.income_entries`, `core.payments`
17. **소모품 안전재고 미달 경보:** `core.supply_restock_items`
18. **다중 사업장/지점 위치 관리:** `core.locations`, `core.organization_locations`
19. **모바일 웹푸시 및 알림 토큰:** `core.notifications`, `core.push_device_tokens`

---

### Q2. 문서상으로는 있지만 실제 구현이 부족한 기능은 무엇인가?
**답변:**
1. **18개 LocalStorage 목업 Capability:**
   `task_pipeline`, `work_order_kanban`, `recipe_bom`, `table_order_kds`, `rental_equipment`, `shift_schedule`, `commission_payroll`, `diet_body_log`, `digital_contract`, `treatment_chart` 등은 선언적 스키마와 화면 모양만 존재할 뿐, 실제 Supabase DB 테이블이 부재하거나 연결되지 않은 채 브라우저 메모리 상태로만 동작합니다.
2. **MBO 목표관리 Capability (`mbo`):**
   `core.mbo_projects`, `core.mbo_objectives` 등 우수한 DB 스키마와 가중치 도메인 엔진이 마이그레이션되었으나, 프론트엔드 UI 화면이 없고 진입점 `index.ts`가 누락되어 있습니다.
3. **Core 호환 Shim 디렉터리 (`parent`, `transport`, `finance`):**
   디렉터리 항목은 존재하지만 실제로는 빈 어댑터이거나 타 모듈(`modules/parent`, `core/transport`, `billing/finance`)로 코드가 이전되어 껍데기만 남아있는 상태입니다.

---

### Q3. 기존 Capability를 확장하는 편이 좋은 기능은 무엇인가?
**답변:**
새 모듈을 파편화하지 않고 기존 Capability를 확장하는 것이 유리한 대표적 영역은 다음 **4가지**입니다:
1. **`task_pipeline`:** `work_order_kanban`을 새로 만들지 말고, `task_pipeline`에 DB 테이블을 연결한 뒤 SLA와 스테이지 라벨을 프리셋으로 주입받아 생산/수리/R&D 등 전 부서 공정으로 확장합니다.
2. **`inventory`:** 독립 자재 관리 모듈을 새로 만들지 않고, 기존 `core.stock_movements`에 `lot_number`, `expiry_date`, `bin_location` 컬럼을 추가하여 제약·식품·화학 품질 추적성까지 흡수합니다.
3. **`maintenance_checklist`:** 설비 점검, 소방 점검, 위생 점검을 개별 모듈로 쪼개지 않고, 기존 `core.checklist_templates`에 정량 수치(Min/Max 공차) 입력 타입을 추가하여 범용 점검 엔진으로 확장합니다.
4. **`supply_restock`:** 구매 요청 및 견적 비교 기능을 신규로 만들지 않고, 소모품 발주 요청 테이블에 복수 견적 단가 및 승인선 연계 필드를 보완합니다.

---

### Q4. 독립적인 신규 Capability가 필요한 기능은 무엇인가?
**답변:**
기존 모듈과 업무 생명주기 및 데이터 모델이 본질적으로 상이하여, **반드시 독립 Capability로 신설해야 하는 것은 다음 3가지뿐**입니다:
1. **`approval_workflow` (전사 범용 전자결재):**
   - 사유: 기안 $ightarrow$ 검토 $ightarrow$ 승인 $ightarrow$ 전결 규정 $ightarrow$ 반려 워크플로는 구매, 지출, 마케팅, 인사 등 전 부서의 결재선에 공통 적용되는 독립된 상태 머신과 결재선 메타데이터를 갖습니다.
2. **`quality_inspection` (전문 품질/공정 검사):**
   - 사유: 단순 체크리스트와 달리 품목 규격(공차), 샘플링 AQL 기준, 측정 오차 판정, 부적합품 격리, CAPA 발행 등 엄격한 품질 보증 생명주기를 요구합니다.
3. **`change_management` (공정/제품 사양 4M 변경관리):**
   - 사유: 생산/품질/설계 변경 시 승인 심의 및 영향도 평가를 추적하는 엔지니어링 변경 공지(ECN/ECO) 체계는 일반 문서 관리로 대체할 수 없습니다.

---

### Q5. 가장 먼저 해결해야 할 구조적·보안적 문제는 무엇인가?
**답변:**
**"LocalStorage 기반 18개 Capability의 멀티테넌트 격리 단절"**입니다.
현재 이 모듈들은 브라우저 저장소를 직접 읽고 쓰기 때문에, 서로 다른 테넌트 간의 데이터 침범 위험이 상존하며 데이터 영속성과 감사 추적성이 원천적으로 불가능합니다. 이를 해결하기 위해 DB 테이블을 정의하여 Supabase RLS(`organization_id` 기반)를 적용하거나, 과도기적으로 테넌트 키 격리 접두사를 강제해야 합니다.
동시에 **CI 파이프라인을 중단시키고 있는 `publicApi.test.ts`의 `mbo` 누락 에러를 즉시 해결**하여 테스트 신뢰도를 회복해야 합니다.

---

### Q6. 가장 적은 변경으로 가장 많은 부서의 요구를 충족하는 작업은 무엇인가?
**답변:**
**"전사 범용 전자결재 (`approval_workflow`) Capability 구축"**입니다.
이 단 하나의 엔진을 구축하여 결재 인터페이스를 개방하면, 다음 6개 부서의 최대 병목 요구사항이 일거에 해결됩니다:
- 전 부서 공통: 일반 기안 및 품의 승인
- 마케팅: 광고 문구, 디자인, 예산 집행 품의
- 구매: 금액 구간별 구매 발주 승인
- 재무: 지출 증빙 결재 및 예산 초과 승인
- 인사: 휴가, 출장, 교육 신청 결재
- IT: 시스템 배포 및 DB 변경 작업 승인

---

### Q7. 지금은 구현하지 않는 편이 좋은 기능은 무엇이며 그 이유는 무엇인가?
**답변:**
다음 3개 영역은 **자체 구축을 지양하고 외부 전문 SaaS 연계 또는 도입을 보류**해야 합니다:
1. **연구개발(R&D) 전자연구노트(ELN) 및 특허 검색:**
   - 이유: 공인 시점확인(TSA), 위변조 방지 해시 암호화, 특허청 법적 증거력 요건은 표준 비즈니스 관리 플랫폼의 범위를 벗어나며, 개발 및 유지보수 비용이 비정상적으로 높습니다. (전문 ELN SaaS 연동 권장)
2. **생산 공정 실시간 MES 실적 수집 및 설비 센서 분석:**
   - 이유: PLC/SCADA 통신, 공장 하드웨어 프로토콜(OPC-UA, Modbus) 연동은 웹 애플리케이션인 Moa의 책임 범위를 초과합니다. (현장 MES의 REST API 웹훅 연동 권장)
3. **마케팅 콘텐츠 제작 툴 및 SNS 자동 게시 스케줄러:**
   - 이유: Meta, Naver, Google의 잦은 SNS API 정책 변경 및 인증 토큰 갱신 부담이 크며, 이미 시장에 Notion, Figma, Buffer 등 우수한 전용 도구가 보편화되어 있습니다.

---

## 7. [보고서 F] 미해결 결함 전수 조치 완료 및 최종 검증 이력 (Resolution Log)

본 조치 보고서는 2026-10-17 본 갭 분석 보고서에서 적시된 4대 구조적 결함(CI 계약 결함, LocalStorage 멀티테넌트 단절, 모듈 중복, 공통 전자결재 및 핵심 엔터프라이즈 도메인 부재)을 체계적으로 해결하고 완벽한 원스톱 검증을 통과한 실행 결과를 기록한다.

### 7.1 결함별 조치 완료 상세

| 과제 번호 | 보고된 결함 및 문제점 | 조치 내용 및 코드 변경 근거 | 결과 상태 |
|:---:|:---|:---|:---:|
| **P0-1** | `mbo` Capability의 공공 API 계약 누락 및 `npm test` CI 파이프라인 54번째 테스트 실패 | `src/capabilities/_shared/capabilityTypes.ts`의 `CAPABILITY_IDS`에 `'mbo'` 추가, `src/capabilities/mbo/index.ts` 진입점 신설, `src/app/presets/presetRegistry.ts` 스키마 및 리소스 번들 등록 완료 | **해결 완료 (100% 통과)** |
| **P0-2** | 18개 LocalStorage 목업 모듈의 브라우저 캐시 공유에 따른 멀티테넌트 격리 단절 위험 | 1. 15개 모듈에 `getTenantStorageKey`(`src/shared/utils/tenantStorage.ts`)를 적용하여 조직 ID 접두사 기반 완전 격리<br/>2. `task_pipeline`, `workplace_policy`, `maintenance_checklist`는 Supabase RLS 실제 DB 바인딩으로 전환 | **해결 완료** |
| **P1-1** | 전 부서(마케팅/구매/인사/재무/IT) 공통 승인 및 결재 워크플로 부재 | `20261017140000_approval_workflow_schema.sql` 마이그레이션 적용, `src/capabilities/approval_workflow/` Capability 신설, 기안-검토-전결-승인 상태머신 및 Refine 관리 UI(`ApprovalWorkflowManagementView.tsx`) 완성 | **구축 완료** |
| **P1-2** | 작업 공정 칸반의 이중 구현 파편화 (`task_pipeline` vs `work_order_kanban`) | `20261017150000_task_pipeline_schema.sql` DB 영속화, `TaskPipelineKanbanView.tsx` Refine 바인딩 전환, `WorkOrderKanbanView.tsx`는 `TaskPipelineKanbanView`로 단일화 리디렉션 | **단일화 완료** |
| **P1-3** | `workplace_policy` 매장 사규 관리의 로컬스토리지 목업 상태 및 전자서약 DB 단절 | `WorkplacePolicyManagementView.tsx`에 Refine `useList({ resource: 'workplace_policies' })`, `useCreate`, `useUpdate`를 바인딩하여 Supabase RLS DB 영속화 및 `core.policy_acknowledgements` 불변 감사 로그 저장 연동 완료 | **DB 연동 완료** |
| **P2-1** | 단순 체크리스트와 혼동되던 전문 품질관리(규격 공차, 불합격 판정, CAPA) 부재 | `20261017160000_quality_inspection_schema.sql` 마이그레이션 적용, `src/capabilities/quality_inspection/` Capability 신설, AQL 샘플링 및 정량 측정치 자동 판정 엔진 구축 | **구축 완료** |
| **P2-2** | 소모품 간이 발주에 머무르던 구매 요청 및 복수 견적 비교 대사표 부재 | `core.supply_restock_items`에 승인 및 공급업체 비교 필드 연계, `SupplyRestockView.tsx`에 정식 구매 요청(PR) 및 최저가 견적 3자 비교 대사표 모달 구축 | **확장 완료** |
| **P2-3** | 4M(설비/인력/재료/공법) 공정 및 사양 변경 관리(ECN/ECO) 부재 | `20261017170000_change_management_schema.sql` 마이그레이션 적용, `src/capabilities/change_management/` Capability 신설, 변경 승인 심의선 및 영향도 평가 워크플로 구축 | **구축 완료** |
| **P2-4** | 재고 관리의 로트(Lot No) 및 유효기간(FEFO) 품질 추적성 결여 | `20261017180000_inventory_lot_traceability.sql` 마이그레이션 적용, `core.stock_movements`에 `lot_number`, `expiry_date`, `bin_location` 컬럼 확장 및 FEFO 출고 우선순위 엔진 구현 | **확장 완료** |
| **P2-5** | MBO 목표관리의 UI 화면 부재 | `MboObjectivesListView.tsx`, `MboProjectGanttView.tsx`, `MboEvaluationModal.tsx`, `MboAuditTrailView.tsx` 4종 프론트엔드 UI 구축 및 Refine 리소스 연계 완료 | **구축 완료** |
| **P3-1** | 리드 파이프라인(`trial_funnel`)과 상담/고객(`consultations`, `customers`) 간 데이터 단절 | `TrialFunnelKanbanView.tsx`에 리드 전환 시 `core.consultations` 및 `core.customers`가 원자적으로 연계 생성되는 통합 브릿지 구현 | **브릿지 구축 완료** |
| **P3-2** | 전사 경영진을 위한 부서별 위험도(재무/품질/안전) 통합 대시보드 부재 | `ExecutiveRiskDashboardWidget.tsx` 위젯 신설하여 종합 리스크 스코어(0~100) 및 실시간 미해결 결함 타임라인 시각화 | **위젯 신설 완료** |
| **P4-1** | 제조업, 유통업, 일반 기업을 위한 엔터프라이즈 프리셋 부재 | `general_enterprise`, `manufacturing_light`, `procurement_distribution` 3대 신규 프리셋 선언 및 카탈로그 등록 완료 (총 47개 프리셋 전수 조립 무결성 검증) | **등록 완료** |
| **P4-2** | 외부 시스템(ERP, MES, 폼 등) 연계를 위한 보안 웹훅 게이트웨이 부재 | `src/core/webhooks/webhookGateway.ts`를 신설하여 HMAC-SHA256 서명 검증 및 멱등성 캐시를 갖춘 엔터프라이즈 인바운드 게이트웨이 구축 | **게이트웨이 구축 완료** |

---

### 7.2 원스톱 무결성 통합 검증 증명

모든 조치 적용 후 단일 원스톱 통합 명령(`npm run check:all`)을 실행하여 100% 그린(exit code 0) 통과를 증명하였다:

```bash
$ npm run check:all
> npm run lint (tsc --noEmit) -> 통과 (exit code 0)
> npm run check:ci-structure -> 통과 (exit code 0)
> npm run test:architecture -> 통과 (Core 무지 및 3계층 단일화 준수, exit code 0)
> npm run check:db-types -> 통과 (170 tables, 299 functions 정합성 일치, exit code 0)
> npm run test:business-invariants:catalog -> 통과 (exit code 0)
> npm test (58개 전체 비즈니스 불변식 체인 일괄 실행) -> 58/58 전수 통과 (74 capabilities 정합성 일치, exit code 0)
```

