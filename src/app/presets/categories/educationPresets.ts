/**
 * educationPresets - Multi-vertical Industry Presets
 */
import type { IndustryPresetDefinition } from '@/core/presets/types';

export const educationPresets: Record<string, IndustryPresetDefinition> = {
  piano: {
    id: 'piano',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🎹"
    },
    starterPassTemplates: [
        {
            "name": "월 주2회 정규 클래식 과정",
            "passType": "PERIOD_BASED",
            "totalCount": 8,
            "validityDays": 30,
            "recommendedPrice": 160000,
            "badge": "인기"
        },
        {
            "name": "성인 취미 1:1 맞춤 레슨 4회권",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 45,
            "recommendedPrice": 180000,
            "badge": "추천"
        },
        {
            "name": "입시 집중반 (월 주4회 + 연습실 무료)",
            "passType": "PERIOD_BASED",
            "totalCount": 16,
            "validityDays": 30,
            "recommendedPrice": 380000
        }
    ],
    terms: {
      "customer": "원생",
      "instructor": "선생님",
      "space": "연습실",
      "pass": "수강권",
      "fee": "교습비",
      "lesson": "피아노레슨",
      "level": "진도"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "13:00",
      "end_time": "19:00",
      "slot_minutes": 30
    },
    facilities: {
      "turnaroundBufferMinutes": 5
    },

    name: '피아노·음악학원',
    description: '원생 출결, 1:1 레슨 피아노 연습실 배정, 교습비 정기 청구, 교재 및 진도 관리',
    category: 'education',
    // Soft launch 기본: wave-1 핵심만 ON. 리텐션·셔틀·추천은 opt-in(optional)
    capabilities: ['seat_room', 'attendance', 'passes', 'billing_invoicing', 'consultation_crm'] as const,
    requiredCapabilities: ['attendance', 'passes', 'billing_invoicing'] as const,
    optionalCapabilities: ['seat_room', 'consultation_crm', 'inventory', 'curriculum_progress', 'retention_marketing', 'vehicle_shuttle', 'membership_referral_tree'] as const,
    businessRules: {
      practiceMode: 'free',
      lessonDurationMinutes: 30,
      autoCheckInDeduct: true,
      unpaidNoticeDayOfMonth: 25,
    },
    resourceTypes: [
      { name: '그랜드룸', type: 'room', capacity: 2 },
      { name: '연습실 1~4호', type: 'room', capacity: 1 },
      { name: '업라이트 피아노', type: 'equipment' },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'], description: '학원 총괄 및 수납·인사 전권' },
      { name: '전임강사', rank_order: 2, permissions: ['attendance:*', 'passes:view', 'consultation:*'], description: '레슨 배정 및 출결/상담' },
      { name: '파트강사', rank_order: 3, permissions: ['attendance:checkin'], description: '출결 체크인 보조' },
    ],
    onboardingSteps: ['연습실 룸 등록', '교습비 단가 및 납부일 설정', '원생 일괄 등록'],
    readinessLevel: 'verified',
  },

  general_academy: {
    id: 'general_academy',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🎓"
    },
    starterPassTemplates: [
        {
            "name": "국영수 단과 월정규 수강권",
            "passType": "PERIOD_BASED",
            "totalCount": 12,
            "validityDays": 30,
            "recommendedPrice": 250000,
            "badge": "인기"
        },
        {
            "name": "종합 집중 케어반 (주5회)",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 420000,
            "badge": "추천"
        },
        {
            "name": "내신 파이널 2주 특강",
            "passType": "COUNT_BASED",
            "totalCount": 6,
            "validityDays": 14,
            "recommendedPrice": 150000
        }
    ],
    terms: {
      "customer": "원생",
      "instructor": "선생님/강사",
      "space": "강의실",
      "pass": "수강권",
      "fee": "수강료",
      "lesson": "수업"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "14:00",
      "end_time": "22:00",
      "slot_minutes": 50
    },

    name: '일반 보습학원',
    description: 'PIN/QR 등하원 출결, 월 교습비 정기 청구서, 학부모 상담일지 및 수강권 관리',
    category: 'education',
    capabilities: ['attendance', 'billing_invoicing', 'consultation_crm', 'passes', 'curriculum_progress', 'retention_marketing', 'vehicle_shuttle', 'exam_grade_analytics', 'membership_referral_tree'] as const,
    requiredCapabilities: ['attendance', 'billing_invoicing', 'passes'] as const,
    optionalCapabilities: ['consultation_crm', 'shift_schedule', 'curriculum_progress', 'retention_marketing', 'vehicle_shuttle', 'exam_grade_analytics', 'membership_referral_tree'] as const,
    businessRules: {
      attendanceGraceMinutes: 10,
      tuitionBillingCycle: 'monthly',
    },
    resourceTypes: [{ name: '강의실 1~3관', type: 'room', capacity: 20 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '전임강사', rank_order: 2, permissions: ['attendance:*', 'consultation:*'] },
      { name: '조교', rank_order: 3, permissions: ['attendance:checkin'] },
    ],
    readinessLevel: 'basic_ui',
  },

  language_academy: {
    id: 'language_academy',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🗣️"
    },
    starterPassTemplates: [
        {
            "name": "원어민 회화 주2회 월정규권",
            "passType": "PERIOD_BASED",
            "totalCount": 8,
            "validityDays": 30,
            "recommendedPrice": 220000,
            "badge": "인기"
        },
        {
            "name": "토익/오픽 단기 완성 패키지",
            "passType": "PERIOD_BASED",
            "totalCount": 16,
            "validityDays": 60,
            "recommendedPrice": 380000,
            "badge": "추천"
        },
        {
            "name": "1:1 비즈니스 영어 8회권",
            "passType": "COUNT_BASED",
            "totalCount": 8,
            "validityDays": 45,
            "recommendedPrice": 350000
        }
    ],
    terms: {
      "customer": "수강생",
      "instructor": "강사/원어민강사",
      "space": "실습실/랩실",
      "pass": "수강권",
      "fee": "수강료",
      "lesson": "회화수업",
      "level": "레벨"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "21:00",
      "slot_minutes": 50
    },

    name: '어학원',
    description: '레벨별 수업 예약, 수강권 차감, 어학 실습실 및 원어민 강사 일정 관리',
    category: 'education',
    capabilities: ['attendance', 'booking', 'passes', 'billing_invoicing', 'consultation_crm', 'curriculum_progress', 'vehicle_shuttle', 'exam_grade_analytics'] as const,
    requiredCapabilities: ['attendance', 'passes', 'billing_invoicing'] as const,
    optionalCapabilities: ['booking', 'consultation_crm', 'curriculum_progress', 'vehicle_shuttle', 'exam_grade_analytics'] as const,
    businessRules: { allowLevelReservation: true, maxStudentsPerClass: 12 },
    resourceTypes: [{ name: '어학랩실', type: 'room', capacity: 15 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '원어민강사', rank_order: 2, permissions: ['attendance:*', 'booking:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  art_academy: {
    id: 'art_academy',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🎨"
    },
    starterPassTemplates: [
        {
            "name": "유초등 창의미술 주2회 (월)",
            "passType": "PERIOD_BASED",
            "totalCount": 8,
            "validityDays": 30,
            "recommendedPrice": 160000,
            "badge": "인기"
        },
        {
            "name": "예고/미대 입시 실기 집중반 (월)",
            "passType": "PERIOD_BASED",
            "totalCount": 16,
            "validityDays": 30,
            "recommendedPrice": 450000,
            "badge": "추천"
        },
        {
            "name": "성인 취미 드로잉 4회 쿠폰권",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 45,
            "recommendedPrice": 140000
        }
    ],
    terms: {
      "customer": "원생",
      "instructor": "선생님/작가",
      "space": "실기실",
      "pass": "회차수강권",
      "fee": "교습비",
      "lesson": "실기수업"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "13:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },

    name: '미술학원',
    description: '회차별 실기 출결, 미술 재료 소모품 재고, 수강료 청구 및 포트폴리오 관리',
    category: 'education',
    capabilities: ['attendance', 'billing_invoicing', 'inventory', 'passes', 'curriculum_progress', 'vehicle_shuttle'] as const,
    requiredCapabilities: ['attendance', 'billing_invoicing', 'passes'] as const,
    optionalCapabilities: ['inventory', 'consultation_crm', 'curriculum_progress', 'vehicle_shuttle'] as const,
    businessRules: { materialFeeIncluded: true },
    resourceTypes: [{ name: '실기실', type: 'room', capacity: 12 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '실기강사', rank_order: 2, permissions: ['attendance:*', 'inventory:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  taekwondo_academy: {
    id: 'taekwondo_academy',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🥋"
    },
    starterPassTemplates: [
        {
            "name": "월 정규 수련권 (주5회 매일반)",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 180000,
            "badge": "인기"
        },
        {
            "name": "월 정규 수련권 (주3회 선택반)",
            "passType": "PERIOD_BASED",
            "totalCount": 12,
            "validityDays": 30,
            "recommendedPrice": 150000
        },
        {
            "name": "신규 입관 패키지 (도복+수련 1개월)",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 220000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "수련생/관원",
      "instructor": "관장/사범",
      "space": "수련실/도장",
      "pass": "월수련권",
      "fee": "수련비",
      "lesson": "수련",
      "level": "품/단"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "13:00",
      "end_time": "20:30",
      "slot_minutes": 50
    },

    name: '태권도장',
    description: '수련부 출결, 정기 수련권, 도복/띠 재고, 차량 탑승 및 안전 서약서',
    category: 'education',
    capabilities: ['attendance', 'passes', 'billing_invoicing', 'safety_consent', 'curriculum_progress', 'vehicle_shuttle', 'membership_referral_tree', 'loyalty_stamp'] as const,
    requiredCapabilities: ['attendance', 'passes', 'billing_invoicing'] as const,
    optionalCapabilities: ['safety_consent', 'consultation_crm', 'curriculum_progress', 'vehicle_shuttle', 'membership_referral_tree', 'loyalty_stamp'] as const,
    businessRules: { promotionBeltLevels: 9, attendancePinDigits: 4 },
    resourceTypes: [{ name: '수련장', type: 'court', capacity: 40 }],
    roles: [
      { name: '관장', rank_order: 1, permissions: ['*'] },
      { name: '사범', rank_order: 2, permissions: ['attendance:*', 'passes:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  dance_academy: {
    id: 'dance_academy',
    theme: {
        "accentColor": "purple",
        "badgeEmoji": "💃"
    },
    starterPassTemplates: [
        {
            "name": "K-POP 댄스 주2회 월정규권",
            "passType": "PERIOD_BASED",
            "totalCount": 8,
            "validityDays": 30,
            "recommendedPrice": 150000,
            "badge": "인기"
        },
        {
            "name": "취미 쿠폰제 10회 수강권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 200000,
            "badge": "추천"
        },
        {
            "name": "오디션/전문반 월집중 클래스",
            "passType": "PERIOD_BASED",
            "totalCount": 16,
            "validityDays": 30,
            "recommendedPrice": 350000
        }
    ],
    terms: {
      "customer": "수강생",
      "instructor": "강사/안무가",
      "space": "연습홀",
      "pass": "쿠폰/수강권",
      "fee": "수강료",
      "lesson": "댄스레슨"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "12:00",
      "end_time": "22:00",
      "slot_minutes": 60
    },

    name: '무용·댄스학원',
    description: '클래스별 정원 예약, 무용홀 대관, 쿠폰제 수강권 차감 및 발표회 일정',
    category: 'education',
    capabilities: ['attendance', 'booking', 'passes', 'seat_room', 'billing_invoicing', 'curriculum_progress'] as const,
    requiredCapabilities: ['attendance', 'passes', 'seat_room'] as const,
    optionalCapabilities: ['booking', 'billing_invoicing', 'curriculum_progress'] as const,
    businessRules: { classCapacityLimit: 20 },
    resourceTypes: [{ name: 'A홀', type: 'room', capacity: 25 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '강사', rank_order: 2, permissions: ['attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  coding_academy: {
    id: 'coding_academy',
    theme: {
        "accentColor": "sky",
        "badgeEmoji": "🤖"
    },
    starterPassTemplates: [
        {
            "name": "초중등 엔트리/스크래치 월정규권",
            "passType": "PERIOD_BASED",
            "totalCount": 4,
            "validityDays": 30,
            "recommendedPrice": 160000,
            "badge": "인기"
        },
        {
            "name": "파이썬/C언어 기초 알고리즘 8회권",
            "passType": "COUNT_BASED",
            "totalCount": 8,
            "validityDays": 60,
            "recommendedPrice": 320000,
            "badge": "추천"
        },
        {
            "name": "정보올림피아드 대비 특강",
            "passType": "COUNT_BASED",
            "totalCount": 6,
            "validityDays": 30,
            "recommendedPrice": 240000
        }
    ],
    terms: {
      "customer": "수강생",
      "instructor": "멘토/강사",
      "space": "PC실습실",
      "pass": "코스수강권",
      "fee": "수강료",
      "lesson": "실습수업"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "21:00",
      "slot_minutes": 60
    },

    name: '코딩·IT 학원',
    description: 'PC 실습 좌석 배정, 프로젝트 과제 파이프라인, 출결 및 월 교습비 관리',
    category: 'education',
    capabilities: ['attendance', 'seat_room', 'billing_invoicing', 'task_pipeline', 'curriculum_progress', 'exam_grade_analytics'] as const,
    requiredCapabilities: ['attendance', 'seat_room', 'billing_invoicing'] as const,
    optionalCapabilities: ['task_pipeline', 'consultation_crm', 'curriculum_progress', 'exam_grade_analytics'] as const,
    businessRules: { pcSeatAssignment: true },
    resourceTypes: [{ name: 'PC실습실', type: 'room', capacity: 20 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '멘토강사', rank_order: 2, permissions: ['attendance:*', 'task_pipeline:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  exam_tutoring: {
    id: 'exam_tutoring',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "📝"
    },
    starterPassTemplates: [
        {
            "name": "1:1 밀착 과외 주2회 월정규권",
            "passType": "PERIOD_BASED",
            "totalCount": 8,
            "validityDays": 30,
            "recommendedPrice": 400000,
            "badge": "추천"
        },
        {
            "name": "소수정예 3:1 클리닉 8회권",
            "passType": "COUNT_BASED",
            "totalCount": 8,
            "validityDays": 45,
            "recommendedPrice": 280000,
            "badge": "인기"
        },
        {
            "name": "오답노트 & 모의고사 첨삭 4회권",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 30,
            "recommendedPrice": 120000
        }
    ],
    terms: {
      "customer": "학생",
      "instructor": "선생님/멘토",
      "space": "상담지도실",
      "pass": "수강권",
      "fee": "수업료",
      "lesson": "개별지도"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "15:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },

    name: '입시·과외 학원',
    description: '1:1 개별지도 스케줄, 학습 플래너 상담 일지, 시급/수강료 정산 관리',
    category: 'education',
    capabilities: ['attendance', 'consultation_crm', 'billing_invoicing', 'shift_schedule', 'curriculum_progress', 'exam_grade_analytics'] as const,
    requiredCapabilities: ['attendance', 'consultation_crm', 'billing_invoicing'] as const,
    optionalCapabilities: ['shift_schedule', 'passes', 'curriculum_progress', 'exam_grade_analytics'] as const,
    businessRules: { oneOnOneSchedule: true },
    resourceTypes: [{ name: '상담지도실', type: 'room', capacity: 4 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '과외강사', rank_order: 2, permissions: ['attendance:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  culture_center: {
    id: 'culture_center',
    theme: {
        "accentColor": "purple",
        "badgeEmoji": "🏛️"
    },
    starterPassTemplates: [
        {
            "name": "정기 문화강좌 12주 수강권",
            "passType": "PERIOD_BASED",
            "totalCount": 12,
            "validityDays": 90,
            "recommendedPrice": 180000,
            "badge": "인기"
        },
        {
            "name": "주말 일일 특강 체험권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 20000,
            "badge": "체험"
        }
    ],
    terms: {
      "customer": "회원/수강생",
      "instructor": "강사",
      "space": "강의실/실습실",
      "pass": "학기수강권",
      "fee": "수강료",
      "lesson": "강좌"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "20:00",
      "slot_minutes": 50
    },

    name: '문화센터·평생교육원',
    description: '강의실-강사-시간표 스케줄링, 강사료 수강매출 배분(RS %) 위탁계약서 및 강사 스펙 인쇄 포스터 관리',
    category: 'education',
    capabilities: [
      'booking',
      'instructor_match',
      'seat_room',
      'commission_payroll',
      'digital_contract',
      'passes',
      'attendance',
      'billing_invoicing',
      'feedbacks',
    ] as const,
    requiredCapabilities: [
      'booking',
      'instructor_match',
      'seat_room',
      'commission_payroll',
      'digital_contract',
    ] as const,
    optionalCapabilities: [
      'passes',
      'attendance',
      'billing_invoicing',
      'feedbacks',
    ] as const,
    businessRules: {
      defaultRevenueShareRate: 0.50,
      materialCostDeduction: true,
      cardFeeRate: 0.03,
      withholdingTaxRate: 0.033,
    },
    resourceTypes: [
      { name: '301호 조리실습실', type: 'room', capacity: 16 },
      { name: '201호 무용실', type: 'room', capacity: 25 },
      { name: '202호 미술실', type: 'room', capacity: 20 },
      { name: '101호 대강의실', type: 'room', capacity: 60 },
    ],
    roles: [
      { name: '센터장', rank_order: 1, permissions: ['*'], description: '센터 운영 총괄 및 위탁 계약/매출 정산 승인' },
      { name: '강좌매니저', rank_order: 2, permissions: ['scheduling:*', 'seat_room:*', 'instructor_match:*', 'passes:*', 'attendance:*'], description: '학기별 강좌 개설, 강의실 배정 및 수강생 접수' },
      { name: '전임강사', rank_order: 3, permissions: ['instructor_match:view', 'attendance:*', 'feedbacks:view'], description: '강좌 강의 진행, 출결 확인 및 피드백 열람' },
      { name: '파트강사', rank_order: 4, permissions: ['attendance:checkin'], description: '수업 출결 확인 보조' },
    ],
    onboardingSteps: ['강의실 및 실습실 등록', '강좌 개설 및 시간표 편성', '강사 위탁계약 체결', '수강생 모집'],
    readinessLevel: 'verified',
  },

  // ==========================================
  // Group 2: 체육·피트니스 (Fitness & Sports) - 8종
  // ==========================================
};
