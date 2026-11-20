/**
 * spacePresets - Multi-vertical Industry Presets
 */
import type { IndustryPresetDefinition } from '@/core/presets/types';

export const spacePresets: Record<string, IndustryPresetDefinition> = {
  photo_studio: {
    id: 'photo_studio',
    theme: {
        "accentColor": "purple",
        "badgeEmoji": "📷"
    },
    starterPassTemplates: [
        {
            "name": "프로필/증명사진 프리미엄 보정권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 60000,
            "badge": "인기"
        },
        {
            "name": "자율 렌탈 스튜디오 2시간 대관권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 70000,
            "badge": "추천"
        },
        {
            "name": "정기 촬영 10시간 충전 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 300000
        }
    ],
    terms: {
      "customer": "고객/모델",
      "instructor": "포토그래퍼",
      "space": "스튜디오/호수",
      "pass": "촬영패키지권",
      "fee": "촬영료",
      "lesson": "촬영세션"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "19:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 20
    },

    name: '사진 스튜디오',
    description: '컨셉 촬영실 예약, 장비 대여, 보정/인화 작업 파이프라인 및 정산',
    category: 'beauty',
    capabilities: ['booking', 'rental_equipment', 'seat_room', 'task_pipeline', 'ledger_simple', 'deposit_escrow'] as const,
    requiredCapabilities: ['booking', 'seat_room', 'task_pipeline'] as const,
    optionalCapabilities: ['rental_equipment', 'ledger_simple', 'deposit_escrow'] as const,
    businessRules: { proofingPipelineSteps: 3 },
    resourceTypes: [
      { name: '호리존 스튜디오', type: 'room', capacity: 10 },
      { name: '조명/렌즈', type: 'equipment' },
    ],
    roles: [
      { name: '실장/작가', rank_order: 1, permissions: ['*'] },
      { name: '보정스태프', rank_order: 2, permissions: ['task_pipeline:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  study_cafe: {
    id: 'study_cafe',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "📚"
    },
    starterPassTemplates: [
        {
            "name": "당일 4시간 시간권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 1,
            "recommendedPrice": 6000
        },
        {
            "name": "100시간 충전 정액권",
            "passType": "COUNT_BASED",
            "totalCount": 100,
            "validityDays": 90,
            "recommendedPrice": 120000,
            "badge": "인기"
        },
        {
            "name": "4주 기간 자유석 정기권",
            "passType": "PERIOD_BASED",
            "totalCount": 28,
            "validityDays": 28,
            "recommendedPrice": 150000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "이용자/회원",
      "instructor": "매니저",
      "space": "좌석/스터디룸",
      "pass": "시간권/기간권",
      "fee": "이용료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 30,
      "needsKiosk": true
    },

    name: '스터디카페 / 공간대여',
    description: '좌석 점유 타이머, 시간제 이용권, 사물함 및 일일 청소 점검 루틴 중심',
    category: 'studio',
    capabilities: ['seat_room', 'passes', 'locker', 'maintenance_checklist', 'lost_found', 'seat_timer_billing', 'kiosk_staff_call', 'work_attendance_payroll'] as const,
    requiredCapabilities: ['seat_room', 'passes'] as const,
    optionalCapabilities: ['locker', 'maintenance_checklist', 'lost_found', 'seat_timer_billing', 'kiosk_staff_call', 'work_attendance_payroll'] as const,
    businessRules: { timePassAutoExpire: true },
    resourceTypes: [
      { name: '자유석 1~50', type: 'seat', capacity: 1 },
      { name: '스터디룸 A, B', type: 'room', capacity: 6 },
      { name: '사물함 1~60', type: 'locker' },
    ],
    roles: [{ name: '관리자', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  shared_office: {
    id: 'shared_office',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🏢"
    },
    starterPassTemplates: [
        {
            "name": "오픈데스크 월 자유 이용권",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 200000,
            "badge": "인기"
        },
        {
            "name": "1인 독립 오피스 3개월 정기권",
            "passType": "PERIOD_BASED",
            "totalCount": 90,
            "validityDays": 90,
            "recommendedPrice": 1200000,
            "badge": "추천"
        },
        {
            "name": "회의실 20시간 크레딧 팩",
            "passType": "COUNT_BASED",
            "totalCount": 20,
            "validityDays": 60,
            "recommendedPrice": 250000
        }
    ],
    terms: {
      "customer": "입주사/멤버",
      "instructor": "커뮤니티매니저",
      "space": "핫데스크/미팅룸",
      "pass": "멤버십패스",
      "fee": "월이용료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 50
    },

    name: '공유오피스',
    description: '지정석/독립실 배정, 월간 청구서, 회의실 예약, 전자결재 및 목표관리(MBO)',
    category: 'studio',
    capabilities: ['seat_room', 'passes', 'billing_invoicing', 'maintenance_checklist', 'booking', 'mbo', 'approval_workflow'] as const,
    requiredCapabilities: ['seat_room', 'billing_invoicing'] as const,
    optionalCapabilities: ['booking', 'passes', 'maintenance_checklist', 'mbo', 'approval_workflow'] as const,
    businessRules: { monthlyRentBillingDay: 1 },
    resourceTypes: [
      { name: '독립오피스 1~8', type: 'room', capacity: 4 },
      { name: '회의실', type: 'room', capacity: 10 },
      { name: '핫데스크', type: 'seat', capacity: 1 },
    ],
    roles: [{ name: '센터장', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  space_rental: {
    id: 'space_rental',
    theme: {
        "accentColor": "purple",
        "badgeEmoji": "🎉"
    },
    starterPassTemplates: [
        {
            "name": "파티룸 주간 4시간 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 80000,
            "badge": "인기"
        },
        {
            "name": "올나잇 패키지 (20:00~08:00)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 150000,
            "badge": "추천"
        },
        {
            "name": "정기 소모임 10시간 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 180000
        }
    ],
    terms: {
      "customer": "예약자/게스트",
      "instructor": "호스트",
      "space": "파티룸/홀",
      "pass": "대관권",
      "fee": "대관료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "09:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 30
    },

    name: '공간대여·대관업',
    description: '파티룸/스튜디오 시간 단위 대관, 보증금/시재 관리 및 퇴실 청소 점검',
    category: 'studio',
    capabilities: ['booking', 'seat_room', 'ledger_simple', 'maintenance_checklist', 'seat_timer_billing', 'deposit_escrow'] as const,
    requiredCapabilities: ['booking', 'seat_room'] as const,
    optionalCapabilities: ['ledger_simple', 'maintenance_checklist', 'seat_timer_billing', 'deposit_escrow'] as const,
    businessRules: { securityDepositRequired: true },
    resourceTypes: [{ name: '파티룸 루프탑', type: 'room', capacity: 15 }],
    roles: [{ name: '호스트', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  locker_storage: {
    id: 'locker_storage',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "📦"
    },
    starterPassTemplates: [
        {
            "name": "S타입 미니 사물함 1개월 이용권",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 20000
        },
        {
            "name": "M타입 개인 수납창고 3개월 정기권",
            "passType": "PERIOD_BASED",
            "totalCount": 90,
            "validityDays": 90,
            "recommendedPrice": 150000,
            "badge": "인기"
        },
        {
            "name": "골프백/대형 장비 전용 6개월 보관권",
            "passType": "PERIOD_BASED",
            "totalCount": 180,
            "validityDays": 180,
            "recommendedPrice": 250000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "이용자/회원",
      "instructor": "관리자",
      "space": "창고유닛/락커",
      "pass": "보관권",
      "fee": "월보관료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 60,
      "needsKiosk": true
    },

    name: '사물함·개인창고 대여업',
    description: '수납 락커/스토리지 유닛 배정, 정기 자동 청구 및 잠금장치 점검',
    category: 'studio',
    capabilities: ['locker', 'passes', 'billing_invoicing', 'maintenance_checklist'] as const,
    requiredCapabilities: ['locker', 'billing_invoicing'] as const,
    optionalCapabilities: ['passes', 'maintenance_checklist'] as const,
    businessRules: { lockerOverdueLockout: true },
    resourceTypes: [{ name: '개인창고 1~20', type: 'locker' }],
    roles: [{ name: '관리자', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  guesthouse: {
    id: 'guesthouse',
    theme: {
        "accentColor": "teal",
        "badgeEmoji": "🏡"
    },
    starterPassTemplates: [
        {
            "name": "도미토리 1박 숙박권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 30000,
            "badge": "인기"
        },
        {
            "name": "워케이션 7일 숙박 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 7,
            "validityDays": 30,
            "recommendedPrice": 180000,
            "badge": "추천"
        },
        {
            "name": "전체 독채 주말 대관권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 350000
        }
    ],
    terms: {
      "customer": "게스트/투숙객",
      "instructor": "호스트",
      "space": "도미토리/객실",
      "pass": "숙박예약권",
      "fee": "숙박료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "08:00",
      "end_time": "22:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 60
    },

    name: '게스트하우스',
    description: '도미토리 베드/객실 예약, 일일 입실/퇴실, 시재 마감 및 침구 교체 점검',
    category: 'travel',
    capabilities: ['booking', 'seat_room', 'maintenance_checklist', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'seat_room'] as const,
    optionalCapabilities: ['maintenance_checklist', 'ledger_simple'] as const,
    businessRules: { checkInHour: 15, checkOutHour: 11 },
    resourceTypes: [
      { name: '도미토리 베드 1~8', type: 'seat', capacity: 1 },
      { name: '2인 전용실', type: 'room', capacity: 2 },
    ],
    roles: [{ name: '호스트', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  small_hotel: {
    id: 'small_hotel',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "🏨"
    },
    starterPassTemplates: [
        {
            "name": "스탠다드룸 대실 4시간 이용권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 30000,
            "badge": "인기"
        },
        {
            "name": "디럭스룸 1박 숙박권 (조식 포함)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 80000,
            "badge": "추천"
        },
        {
            "name": "비즈니스 장기투숙 7박 패키지",
            "passType": "PERIOD_BASED",
            "totalCount": 7,
            "validityDays": 30,
            "recommendedPrice": 450000
        }
    ],
    terms: {
      "customer": "투숙객/고객",
      "instructor": "프런트매니저",
      "space": "객실",
      "pass": "숙박/대실권",
      "fee": "숙박비"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },
    facilities: {
      "turnaroundBufferMinutes": 30
    },

    name: '소형 호텔 / 부티크 호텔',
    description: '객실 타입별 숙박 예약, 프론트 교대 근무표, 하우스키핑 룸체크 및 현금 시재',
    category: 'travel',
    capabilities: ['booking', 'seat_room', 'maintenance_checklist', 'shift_schedule', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'seat_room', 'maintenance_checklist'] as const,
    optionalCapabilities: ['shift_schedule', 'ledger_simple'] as const,
    businessRules: { housekeepingInspectionRequired: true },
    resourceTypes: [
      { name: '스탠다드룸 201~210', type: 'room', capacity: 2 },
      { name: '디럭스룸 301~305', type: 'room', capacity: 3 },
    ],
    roles: [
      { name: '총지배인', rank_order: 1, permissions: ['*'] },
      { name: '프론트스태프', rank_order: 2, permissions: ['booking:*', 'shift_schedule:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  first_birthday_party: {
    id: 'first_birthday_party',
    theme: {
      accentColor: 'amber',
      badgeEmoji: '🎂',
    },
    starterPassTemplates: [
      {
        name: '프리미엄 돌잔치 올인원 패키지 (보증 50인 + 돌상 + 뷔페)',
        passType: 'COUNT_BASED',
        totalCount: 1,
        validityDays: 180,
        recommendedPrice: 2800000,
        badge: '인기',
      },
      {
        name: '직계가족 소규모 돌잔치 패키지 (보증 15인 + 전통돌상)',
        passType: 'COUNT_BASED',
        totalCount: 1,
        validityDays: 180,
        recommendedPrice: 950000,
        badge: '추천',
      },
      {
        name: '단독홀 대관 & 돌상 베이직 패키지',
        passType: 'COUNT_BASED',
        totalCount: 1,
        validityDays: 180,
        recommendedPrice: 600000,
      },
    ],
    terms: {
      customer: '혼주/부모님',
      instructor: '행사 디렉터',
      space: '연회홀/파티룸',
      pass: '행사 패키지권',
      fee: '대관 및 연회비',
      lesson: '행사 타임',
    },
    operatingHours: {
      day_type: 'ALL_WEEK',
      start_time: '10:00',
      end_time: '21:30',
      slot_minutes: 150,
    },
    facilities: {
      turnaroundBufferMinutes: 60,
    },
    name: '돌잔치·연회 전문점',
    description: '돌잔치·가족연회 타임별 홀 예약, 최소 보증인원 및 식순 시나리오 관리, 플래너 일정 공유 및 업체 소개자료 공개',
    category: 'studio',
    capabilities: [
      'booking',
      'seat_room',
      'space_turnaround',
      'custom_order_craft',
      'task_pipeline',
      'deposit_escrow',
      'digital_contract',
      'consultation_crm',
    ] as const,
    requiredCapabilities: ['booking', 'seat_room', 'custom_order_craft'] as const,
    optionalCapabilities: [
      'space_turnaround',
      'task_pipeline',
      'deposit_escrow',
      'digital_contract',
      'consultation_crm',
    ] as const,
    businessRules: {
      defaultMinGuaranteedGuests: 20,
      turnaroundBufferMinutes: 60,
      allowPlannerPublicSharing: true,
      supportsCustomTimeline: true,
    },
    resourceTypes: [
      { name: '메인 다이닝홀 (Main Hall)', type: 'room', capacity: 80 },
      { name: '프라이빗 가든룸 (Garden Room)', type: 'room', capacity: 35 },
      { name: '전통 한옥룸 (Traditional Room)', type: 'room', capacity: 50 },
    ],
    roles: [
      { name: '대표/총지배인', rank_order: 1, permissions: ['*'] },
      {
        name: '돌잔치 전담 플래너',
        rank_order: 2,
        permissions: ['booking:*', 'seat_room:*', 'custom_order_craft:*', 'task_pipeline:*', 'consultation_crm:*'],
      },
      {
        name: '홀 서빙/세팅 스태프',
        rank_order: 3,
        permissions: ['booking:read', 'seat_room:read', 'task_pipeline:read', 'task_pipeline:update'],
      },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 5: 도소매·외식 (Retail & Food) - 6종
  // ==========================================
};
