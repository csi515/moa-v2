/**
 * beautyPresets - Multi-vertical Industry Presets
 */
import type { IndustryPresetDefinition } from '@/core/presets/types';

export const beautyPresets: Record<string, IndustryPresetDefinition> = {
  hair_salon: {
    id: 'hair_salon',
    theme: {
        "accentColor": "rose",
        "badgeEmoji": "✂️"
    },
    starterPassTemplates: [
        {
            "name": "여성 디자인컷 + 스칼프 케어",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 35000,
            "badge": "인기"
        },
        {
            "name": "뿌리염색 + 클리닉 3회 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 3,
            "validityDays": 120,
            "recommendedPrice": 180000,
            "badge": "추천"
        },
        {
            "name": "VIP 50만원 정액 선불권 (10% 적립)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 365,
            "recommendedPrice": 500000,
            "badge": "VIP"
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "헤어디자이너",
      "space": "시술체어",
      "pass": "시술권/정액권",
      "fee": "시술비",
      "lesson": "헤어시술"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 10
    },

    name: '헤어샵 / 뷰티 살롱',
    description: '디자이너 예약, 염색약/시술 차트, 스태프 근무표 및 일일 매출 마감',
    category: 'beauty',
    capabilities: ['booking', 'treatment_chart', 'shift_schedule', 'ledger_simple', 'inventory', 'commission_payroll', 'treatment_portfolio', 'waitlist_turn_queue', 'membership_referral_tree', 'vendor_ap_invoice', 'work_attendance_payroll'] as const,
    requiredCapabilities: ['booking', 'treatment_chart', 'shift_schedule'] as const,
    optionalCapabilities: ['ledger_simple', 'inventory', 'commission_payroll', 'treatment_portfolio', 'waitlist_turn_queue', 'membership_referral_tree', 'vendor_ap_invoice', 'work_attendance_payroll'] as const,
    businessRules: { doubleBookingAllowed: false, slotMinutes: 30 },
    resourceTypes: [
      { name: '경대 1~6', type: 'seat', capacity: 1 },
      { name: '샴푸실', type: 'room', capacity: 2 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '디자이너', rank_order: 2, permissions: ['booking:*', 'treatment_chart:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  barber_shop: {
    id: 'barber_shop',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "💈"
    },
    starterPassTemplates: [
        {
            "name": "맨즈 클래식컷 + 쉐이빙 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 45000,
            "badge": "인기"
        },
        {
            "name": "바버컷 5회 정기권 (두피스케일링 포함)",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 120,
            "recommendedPrice": 200000,
            "badge": "추천"
        },
        {
            "name": "다운펌 + 디자인컷 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 65000
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "바버",
      "space": "바버체어",
      "pass": "회원권",
      "fee": "커트비",
      "lesson": "바버링"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "20:00",
      "slot_minutes": 50
    },

    name: '바버숍',
    description: '바버별 1:1 예약, 면도/커트 시술 이력, 근무표 및 일일 시재 마감',
    category: 'beauty',
    capabilities: ['booking', 'shift_schedule', 'ledger_simple', 'inventory', 'treatment_portfolio'] as const,
    requiredCapabilities: ['booking', 'shift_schedule'] as const,
    optionalCapabilities: ['ledger_simple', 'inventory', 'treatment_portfolio'] as const,
    businessRules: { slotMinutes: 45 },
    resourceTypes: [{ name: '바버체어 1~3', type: 'seat', capacity: 1 }],
    roles: [
      { name: '마스터바버', rank_order: 1, permissions: ['*'] },
      { name: '바버', rank_order: 2, permissions: ['booking:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  nail_salon: {
    id: 'nail_salon',
    theme: {
        "accentColor": "rose",
        "badgeEmoji": "💅"
    },
    starterPassTemplates: [
        {
            "name": "이달의 아트 젤네일 시술권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 60000,
            "badge": "인기"
        },
        {
            "name": "속눈썹 펌 3회권",
            "passType": "COUNT_BASED",
            "totalCount": 3,
            "validityDays": 120,
            "recommendedPrice": 100000,
            "badge": "추천"
        },
        {
            "name": "선불 회원권 30만원 (젤제거 무료)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 300000,
            "badge": "VIP"
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "시술아티스트",
      "space": "네일테이블/베드",
      "pass": "정액권/회차권",
      "fee": "시술비",
      "lesson": "네일아트"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },

    name: '네일숍',
    description: '아트/젤네일 예약, 선불 회원권 잔액 차감, 젤네일 컬러 차트 및 재고',
    category: 'beauty',
    capabilities: ['booking', 'passes', 'treatment_chart', 'inventory', 'ledger_simple', 'commission_payroll', 'treatment_portfolio'] as const,
    requiredCapabilities: ['booking', 'passes'] as const,
    optionalCapabilities: ['treatment_chart', 'inventory', 'ledger_simple', 'commission_payroll', 'treatment_portfolio'] as const,
    businessRules: { prepaidPassBalanceDeduct: true },
    resourceTypes: [
      { name: '네일 테이블 1~3', type: 'table', capacity: 1 },
      { name: '패디 체어', type: 'seat', capacity: 1 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '아티스트', rank_order: 2, permissions: ['booking:*', 'passes:deduct'] },
    ],
    readinessLevel: 'basic_ui',
  },

  skin_clinic: {
    id: 'skin_clinic',
    theme: {
        "accentColor": "rose",
        "badgeEmoji": "💆"
    },
    starterPassTemplates: [
        {
            "name": "수분 진정 맞춤 케어 5회권",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 60,
            "recommendedPrice": 350000,
            "badge": "인기"
        },
        {
            "name": "윤곽 리프팅 프로그램 10회권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 120,
            "recommendedPrice": 900000,
            "badge": "추천"
        },
        {
            "name": "첫 방문 1회 체험권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 14,
            "recommendedPrice": 50000,
            "badge": "체험"
        }
    ],
    terms: {
      "customer": "고객/회원",
      "instructor": "에스테티션",
      "space": "케어룸/스킨케어실",
      "pass": "관리회차권",
      "fee": "관리비",
      "lesson": "스킨케어"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "21:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 15
    },

    name: '피부관리실·에스테틱',
    description: '스킨케어 룸 예약, 코스 티켓팅 차감, 피부 진단 차트 및 에스테틱 화장품 재고',
    category: 'beauty',
    capabilities: ['booking', 'passes', 'treatment_chart', 'consultation_crm', 'inventory', 'commission_payroll', 'package_split_billing'] as const,
    requiredCapabilities: ['booking', 'passes', 'treatment_chart'] as const,
    optionalCapabilities: ['consultation_crm', 'inventory', 'commission_payroll', 'package_split_billing'] as const,
    businessRules: { skinAnalysisBeforeTreatment: true },
    resourceTypes: [
      { name: '관리실 1~3', type: 'room', capacity: 2 },
      { name: '에스테틱 베드', type: 'seat', capacity: 1 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '관리사', rank_order: 2, permissions: ['booking:*', 'treatment_chart:*', 'passes:*'] },
    ],
    readinessLevel: 'persisted',
  },

  massage_spa: {
    id: 'massage_spa',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🌿"
    },
    starterPassTemplates: [
        {
            "name": "아로마 림프 전신 테라피 60분 (5회)",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 90,
            "recommendedPrice": 450000,
            "badge": "인기"
        },
        {
            "name": "딥티슈 힐링 바디케어 90분 (10회)",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 180,
            "recommendedPrice": 1100000,
            "badge": "추천"
        },
        {
            "name": "풋케어 & 어깨 집중 40분권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 50000
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "테라피스트",
      "space": "스파룸/베드",
      "pass": "테라피이용권",
      "fee": "관리료",
      "lesson": "테라피세션"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "10:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 20,
      "turnaroundBufferMinutes": 15
    },

    name: '마사지·스파',
    description: '개인/커플 스파룸 예약, 관리사 근무 교대, 정기 바우처 및 간이 정산',
    category: 'beauty',
    capabilities: ['booking', 'passes', 'shift_schedule', 'seat_room', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'seat_room', 'shift_schedule'] as const,
    optionalCapabilities: ['passes', 'ledger_simple'] as const,
    businessRules: { coupleRoomAvailable: true },
    resourceTypes: [{ name: '스파룸 1~4', type: 'room', capacity: 2 }],
    roles: [
      { name: '관리자', rank_order: 1, permissions: ['*'] },
      { name: '테라피스트', rank_order: 2, permissions: ['booking:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  tattoo_studio: {
    id: 'tattoo_studio',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "🖋️"
    },
    starterPassTemplates: [
        {
            "name": "미니/레터링 타투 시술권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 80000,
            "badge": "인기"
        },
        {
            "name": "원포인트 블랙앤그레이 커스텀 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 250000,
            "badge": "추천"
        },
        {
            "name": "리터치 & 애프터케어 서비스권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 30000
        }
    ],
    terms: {
      "customer": "의뢰인/고객",
      "instructor": "타투이스트/아티스트",
      "space": "작업부스",
      "pass": "예약권",
      "fee": "작업비",
      "lesson": "타투작업"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "11:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },

    name: '타투 스튜디오',
    description: '도안 상담, 예약 일정, 전자 면책 서약서, 작업 단계 파이프라인 관리',
    category: 'beauty',
    capabilities: ['booking', 'safety_consent', 'consultation_crm', 'task_pipeline'] as const,
    requiredCapabilities: ['booking', 'safety_consent'] as const,
    optionalCapabilities: ['consultation_crm', 'task_pipeline'] as const,
    businessRules: { ageVerificationRequired: true, waiverMandatory: true },
    resourceTypes: [{ name: '작업 부스 1~2', type: 'room', capacity: 1 }],
    roles: [
      { name: '아티스트', rank_order: 1, permissions: ['*'] },
    ],
    readinessLevel: 'basic_ui',
  },

};
