/**
 * fitnessPresets - Multi-vertical Industry Presets
 */
import type { IndustryPresetDefinition } from '@/core/presets/types';

export const fitnessPresets: Record<string, IndustryPresetDefinition> = {
  pilates: {
    id: 'pilates',
    theme: {
        "accentColor": "teal",
        "badgeEmoji": "🧘"
    },
    starterPassTemplates: [
        {
            "name": "1:1 개인레슨 10회권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 700000,
            "badge": "추천"
        },
        {
            "name": "6:1 그룹레슨 30회권",
            "passType": "COUNT_BASED",
            "totalCount": 30,
            "validityDays": 90,
            "recommendedPrice": 360000,
            "badge": "인기"
        },
        {
            "name": "체험 1회권 (체형 분석 포함)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 14,
            "recommendedPrice": 30000,
            "badge": "체험"
        }
    ],
    terms: {
      "customer": "회원",
      "instructor": "강사",
      "space": "기구룸/개인실",
      "pass": "회원권/회차권",
      "fee": "레슨비",
      "lesson": "필라테스레슨"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "21:00",
      "slot_minutes": 50
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 30,
      "turnaroundBufferMinutes": 10
    },

    name: '필라테스 스튜디오',
    description: '리포머/체어 그룹 및 개인레슨 예약, 횟수권 차감, 강사 배정 및 락커 관리',
    category: 'fitness',
    capabilities: ['booking', 'passes', 'instructor_match', 'seat_room', 'locker', 'diet_body_log', 'commission_payroll', 'digital_contract', 'equipment_lifecycle', 'membership_referral_tree', 'promotional_deal'] as const,
    requiredCapabilities: ['booking', 'passes', 'instructor_match'] as const,
    optionalCapabilities: ['seat_room', 'locker', 'treatment_chart', 'diet_body_log', 'commission_payroll', 'digital_contract', 'equipment_lifecycle', 'membership_referral_tree', 'promotional_deal'] as const,
    businessRules: { cancelCutoffHours: 6, maxGroupCapacity: 6 },
    resourceTypes: [
      { name: '리포머룸', type: 'room', capacity: 6 },
      { name: '체어룸', type: 'room', capacity: 6 },
      { name: '개인레슨실', type: 'room', capacity: 1 },
      { name: '락커 1~30번', type: 'locker' },
    ],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '수석강사', rank_order: 2, permissions: ['booking:*', 'passes:*'] },
      { name: '강사', rank_order: 3, permissions: ['attendance:checkin', 'booking:view'] },
    ],
    readinessLevel: 'verified',
  },

  yoga_studio: {
    id: 'yoga_studio',
    theme: {
        "accentColor": "teal",
        "badgeEmoji": "🧘"
    },
    starterPassTemplates: [
        {
            "name": "힐링/빈야사 요가 3개월 정기권",
            "passType": "PERIOD_BASED",
            "totalCount": 36,
            "validityDays": 90,
            "recommendedPrice": 360000,
            "badge": "인기"
        },
        {
            "name": "자유 예약 10회 쿠폰권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 180000,
            "badge": "추천"
        },
        {
            "name": "싱잉볼 명상 원데이 클래스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 40000,
            "badge": "체험"
        }
    ],
    terms: {
      "customer": "회원/요기",
      "instructor": "선생님/지도자",
      "space": "요가룸",
      "pass": "수련권/기간권",
      "fee": "월회비",
      "lesson": "요가수련"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "21:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 20
    },

    name: '요가 스튜디오',
    description: '수련 타임테이블 예약, 기간제/횟수제 이용권, 출결 체크인 및 락커 관리',
    category: 'fitness',
    capabilities: ['booking', 'passes', 'attendance', 'locker', 'seat_room', 'diet_body_log', 'promotional_deal'] as const,
    requiredCapabilities: ['booking', 'passes', 'attendance'] as const,
    optionalCapabilities: ['locker', 'seat_room', 'diet_body_log', 'promotional_deal'] as const,
    businessRules: { allowWalkInCheckIn: true },
    resourceTypes: [{ name: '메인 수련실', type: 'room', capacity: 18 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '요가강사', rank_order: 2, permissions: ['booking:*', 'attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  gym_fitness: {
    id: 'gym_fitness',
    theme: {
        "accentColor": "orange",
        "badgeEmoji": "⚡"
    },
    starterPassTemplates: [
        {
            "name": "헬스 3개월 정기 회원권",
            "passType": "PERIOD_BASED",
            "totalCount": 90,
            "validityDays": 90,
            "recommendedPrice": 180000,
            "badge": "인기"
        },
        {
            "name": "1:1 PT 10회권 (락커/운동복 무료)",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 600000,
            "badge": "추천"
        },
        {
            "name": "헬스 12개월 연간 회원권",
            "passType": "PERIOD_BASED",
            "totalCount": 365,
            "validityDays": 365,
            "recommendedPrice": 480000
        }
    ],
    terms: {
      "customer": "회원",
      "instructor": "트레이너",
      "space": "운동존/머신존",
      "pass": "헬스이용권",
      "fee": "월회비",
      "lesson": "PT"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "06:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 80
    },

    name: '헬스장 / 피트니스 센터',
    description: '회원권 기간 관리, 입장 바코드/PIN 출결, 개인 락커 배정, 운동복 대여',
    category: 'fitness',
    capabilities: ['passes', 'attendance', 'locker', 'rental_equipment', 'ledger_simple', 'retention_marketing', 'diet_body_log', 'lost_found', 'digital_contract', 'equipment_lifecycle', 'package_split_billing', 'sop_risk_assessment', 'work_attendance_payroll', 'promotional_deal'] as const,
    requiredCapabilities: ['passes', 'attendance', 'locker'] as const,
    optionalCapabilities: ['rental_equipment', 'ledger_simple', 'retention_marketing', 'diet_body_log', 'lost_found', 'digital_contract', 'equipment_lifecycle', 'package_split_billing', 'sop_risk_assessment', 'work_attendance_payroll', 'promotional_deal'] as const,
    businessRules: { membershipHoldMaxDays: 30 },
    resourceTypes: [
      { name: '헬스존', type: 'room', capacity: 100 },
      { name: '개인락커', type: 'locker' },
      { name: '회원복', type: 'equipment' },
    ],
    roles: [
      { name: '관장', rank_order: 1, permissions: ['*'] },
      { name: 'FC/트레이너', rank_order: 2, permissions: ['passes:*', 'locker:*'] },
    ],
    readinessLevel: 'persisted',
  },

  pt_fitness: {
    id: 'pt_fitness',
    theme: {
        "accentColor": "orange",
        "badgeEmoji": "🏋️"
    },
    starterPassTemplates: [
        {
            "name": "1:1 개인 PT 20회 패키지 (식단 관리)",
            "passType": "COUNT_BASED",
            "totalCount": 20,
            "validityDays": 90,
            "recommendedPrice": 1200000,
            "badge": "인기"
        },
        {
            "name": "바디프로필 3개월 집중반 (30회)",
            "passType": "COUNT_BASED",
            "totalCount": 30,
            "validityDays": 100,
            "recommendedPrice": 1800000,
            "badge": "추천"
        },
        {
            "name": "1:1 체형교정/재활 10회권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 700000
        }
    ],
    terms: {
      "customer": "회원",
      "instructor": "트레이너/코치",
      "space": "PT존/세션룸",
      "pass": "PT세션권",
      "fee": "세션비",
      "lesson": "1:1 PT"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "07:00",
      "end_time": "22:00",
      "slot_minutes": 50
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 30
    },

    name: '1:1 피트니스 / PT 샵',
    description: 'PT 세션 차감권, 트레이너 배정, 고객 체형 상담 일지 및 락커 관리',
    category: 'fitness',
    capabilities: ['passes', 'booking', 'instructor_match', 'consultation_crm', 'locker', 'curriculum_progress', 'retention_marketing', 'diet_body_log', 'commission_payroll', 'digital_contract', 'deposit_escrow', 'membership_referral_tree', 'promotional_deal'] as const,
    requiredCapabilities: ['passes', 'booking', 'instructor_match'] as const,
    optionalCapabilities: ['consultation_crm', 'locker', 'treatment_chart', 'curriculum_progress', 'retention_marketing', 'diet_body_log', 'commission_payroll', 'digital_contract', 'deposit_escrow', 'membership_referral_tree', 'promotional_deal'] as const,
    businessRules: { ptSessionDurationMinutes: 50 },
    resourceTypes: [{ name: 'PT 세션존', type: 'room', capacity: 3 }],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '트레이너', rank_order: 2, permissions: ['booking:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  indoor_golf: {
    id: 'indoor_golf',
    theme: {
        "accentColor": "emerald",
        "badgeEmoji": "⛳"
    },
    starterPassTemplates: [
        {
            "name": "60분 타석 10회권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 200000,
            "badge": "인기"
        },
        {
            "name": "1:1 프로 레슨 10회 + 타석 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 550000,
            "badge": "추천"
        },
        {
            "name": "종일 무제한 3개월 정기권",
            "passType": "PERIOD_BASED",
            "totalCount": 90,
            "validityDays": 90,
            "recommendedPrice": 450000
        }
    ],
    terms: {
      "customer": "회원",
      "instructor": "레슨프로",
      "space": "타석/룸",
      "pass": "타석이용권",
      "fee": "이용료",
      "lesson": "골프레슨"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "06:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 50
    },

    name: '실내 골프연습장',
    description: '타석/레슨 예약, 정기 회원권, 골프백 락커, 대여채 및 간이 시재 관리',
    category: 'fitness',
    capabilities: ['passes', 'booking', 'locker', 'rental_equipment', 'ledger_simple', 'curriculum_progress', 'diet_body_log', 'commission_payroll', 'lost_found', 'seat_timer_billing', 'package_split_billing', 'kiosk_staff_call', 'sop_risk_assessment'] as const,
    requiredCapabilities: ['passes', 'booking', 'locker'] as const,
    optionalCapabilities: ['rental_equipment', 'ledger_simple', 'instructor_match', 'curriculum_progress', 'diet_body_log', 'commission_payroll', 'lost_found', 'seat_timer_billing', 'package_split_billing', 'kiosk_staff_call', 'sop_risk_assessment'] as const,
    businessRules: { bayReservationMinutes: 60 },
    resourceTypes: [
      { name: '타석 1~12번', type: 'bay', capacity: 1 },
      { name: '골프백 락커', type: 'locker' },
      { name: '연습채', type: 'equipment' },
    ],
    roles: [
      { name: '점장', rank_order: 1, permissions: ['*'] },
      { name: '레슨프로', rank_order: 2, permissions: ['booking:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  swim_school: {
    id: 'swim_school',
    theme: {
        "accentColor": "sky",
        "badgeEmoji": "🏊"
    },
    starterPassTemplates: [
        {
            "name": "새벽/저녁 수영 정규 강습 (월)",
            "passType": "PERIOD_BASED",
            "totalCount": 12,
            "validityDays": 30,
            "recommendedPrice": 120000,
            "badge": "인기"
        },
        {
            "name": "자유수영 10회 입장권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 70000
        },
        {
            "name": "1:1 영법 교정 레슨 5회권",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 45,
            "recommendedPrice": 250000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "회원/원생",
      "instructor": "코치/강사",
      "space": "수영레인",
      "pass": "수영강습권",
      "fee": "강습료",
      "lesson": "수영강습"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "06:00",
      "end_time": "21:00",
      "slot_minutes": 50
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 100
    },

    name: '수영장·수영교실',
    description: '레인별 강습 예약, 정기 회원권, 탈의실 락커 배정 및 안전 서약서',
    category: 'fitness',
    capabilities: ['attendance', 'passes', 'booking', 'locker', 'safety_consent', 'curriculum_progress', 'diet_body_log', 'vehicle_shuttle', 'lost_found', 'sop_risk_assessment'] as const,
    requiredCapabilities: ['attendance', 'passes', 'locker'] as const,
    optionalCapabilities: ['booking', 'safety_consent', 'curriculum_progress', 'diet_body_log', 'vehicle_shuttle', 'lost_found', 'sop_risk_assessment'] as const,
    businessRules: { laneCapacityLimit: 15 },
    resourceTypes: [
      { name: '25m 레인 1~6', type: 'court', capacity: 15 },
      { name: '탈의실 락커', type: 'locker' },
    ],
    roles: [
      { name: '센터장', rank_order: 1, permissions: ['*'] },
      { name: '수영강사', rank_order: 2, permissions: ['attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  climbing_activity: {
    id: 'climbing_activity',
    theme: {
        "accentColor": "orange",
        "badgeEmoji": "🧗"
    },
    starterPassTemplates: [
        {
            "name": "일일 자유이용권 (암벽화 대여 포함)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 1,
            "recommendedPrice": 25000,
            "badge": "체험"
        },
        {
            "name": "정기 10회 이용권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 180000,
            "badge": "인기"
        },
        {
            "name": "1개월 정기 회원권 (전지점)",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 130000
        }
    ],
    terms: {
      "customer": "클라이머/회원",
      "instructor": "강사/세터",
      "space": "볼더링월/지구력존",
      "pass": "암장패스",
      "fee": "이용료",
      "lesson": "강습세션"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "10:00",
      "end_time": "22:30",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 40
    },

    name: '클라이밍 & 액티비티 짐',
    description: '일일/정기 이용권, 암벽화/장비 대여, 전자 면책 동의서 및 출결/락커 관리',
    category: 'fitness',
    capabilities: ['passes', 'attendance', 'rental_equipment', 'safety_consent', 'locker', 'diet_body_log', 'lost_found', 'waitlist_turn_queue'] as const,
    requiredCapabilities: ['passes', 'attendance', 'safety_consent'] as const,
    optionalCapabilities: ['rental_equipment', 'locker', 'diet_body_log', 'lost_found', 'waitlist_turn_queue'] as const,
    businessRules: { mandatorySafetyWaiver: true },
    resourceTypes: [
      { name: '볼더링 벽 A~D', type: 'court', capacity: 25 },
      { name: '암벽화 렌탈', type: 'equipment' },
    ],
    roles: [
      { name: '센터장', rank_order: 1, permissions: ['*'] },
      { name: '스태프', rank_order: 2, permissions: ['attendance:*', 'rental_equipment:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  boxing_mma: {
    id: 'boxing_mma',
    theme: {
        "accentColor": "orange",
        "badgeEmoji": "🥊"
    },
    starterPassTemplates: [
        {
            "name": "복싱/MMA 3개월 정기 수련권",
            "passType": "PERIOD_BASED",
            "totalCount": 60,
            "validityDays": 90,
            "recommendedPrice": 390000,
            "badge": "인기"
        },
        {
            "name": "월 자유 수련권 (주5회)",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 150000
        },
        {
            "name": "1:1 미트 트레이닝 10회권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 400000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "관원/회원",
      "instructor": "관장/코치",
      "space": "링/샌드백존",
      "pass": "체육관등록권",
      "fee": "월회비",
      "lesson": "미트트레이닝"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "22:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 40
    },

    name: '복싱·격투기 체육관',
    description: '수련 출결 체크, 정기 이용권, 글러브/보호구 대여, 안전 서약 및 락커',
    category: 'fitness',
    capabilities: ['passes', 'attendance', 'locker', 'safety_consent', 'rental_equipment', 'diet_body_log'] as const,
    requiredCapabilities: ['passes', 'attendance', 'safety_consent'] as const,
    optionalCapabilities: ['locker', 'rental_equipment', 'diet_body_log'] as const,
    businessRules: { mandatorySafetyWaiver: true },
    resourceTypes: [
      { name: '링 & 샌드백존', type: 'court', capacity: 30 },
      { name: '락커', type: 'locker' },
    ],
    roles: [
      { name: '관장', rank_order: 1, permissions: ['*'] },
      { name: '코치', rank_order: 2, permissions: ['attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 3: 뷰티·웰빙 (Beauty & Wellness) - 8종
  // ==========================================
};
