/**
 * retailPresets - Multi-vertical Industry Presets
 */
import type { IndustryPresetDefinition } from '@/core/presets/types';

export const retailPresets: Record<string, IndustryPresetDefinition> = {
  retail: {
    id: 'retail',
    theme: {
        "accentColor": "teal",
        "badgeEmoji": "🛍️"
    },
    starterPassTemplates: [
        {
            "name": "VIP 매장 포인트 10만 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 100000,
            "badge": "VIP"
        },
        {
            "name": "시즌 패스 멤버십 (전품목 10% 할인)",
            "passType": "PERIOD_BASED",
            "totalCount": 90,
            "validityDays": 90,
            "recommendedPrice": 30000,
            "badge": "인기"
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "매장직원",
      "space": "매대/카운터",
      "pass": "포인트카드",
      "fee": "판매금액"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "10:00",
      "end_time": "21:00",
      "slot_minutes": 60
    },

    name: '일반 소매점',
    description: '바코드 상품 카탈로그, 재고 수불, POS 판매 및 포인트 적립/사용',
    category: 'other',
    capabilities: ['inventory', 'credit_wallet', 'ledger_simple', 'pickup_orders', 'loyalty_stamp'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple'] as const,
    optionalCapabilities: ['credit_wallet', 'pickup_orders', 'loyalty_stamp'] as const,
    businessRules: { pointEarnPercent: 1.0, lowStockAlertThreshold: 5 },
    resourceTypes: [{ name: 'POS 카운터', type: 'equipment' }],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '캐셔', rank_order: 2, permissions: ['inventory:view', 'ledger_simple:*'] },
    ],
    readinessLevel: 'verified',
  },

  apparel_store: {
    id: 'apparel_store',
    theme: {
        "accentColor": "rose",
        "badgeEmoji": "👗"
    },
    starterPassTemplates: [
        {
            "name": "VIP 쇼핑 지원금 20만 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 200000,
            "badge": "VIP"
        },
        {
            "name": "퍼스널 스타일링 & 쇼핑 컨설팅 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 50000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "스타일리스트/직원",
      "space": "피팅룸/매대",
      "pass": "적립멤버십",
      "fee": "결제금액"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "10:30",
      "end_time": "21:30",
      "slot_minutes": 60
    },

    name: '의류매장',
    description: '사이즈/색상 옵션 재고, 피팅룸 관리, 멤버십 포인트 및 스태프 근무',
    category: 'other',
    capabilities: ['inventory', 'ledger_simple', 'credit_wallet', 'shift_schedule'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple'] as const,
    optionalCapabilities: ['credit_wallet', 'shift_schedule'] as const,
    businessRules: { sizeColorSkuSupport: true },
    resourceTypes: [{ name: '피팅룸 1~2', type: 'room', capacity: 1 }],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '스태프', rank_order: 2, permissions: ['inventory:view', 'ledger_simple:*'] },
    ],
    readinessLevel: 'isolated',
  },

  convenience_store: {
    id: 'convenience_store',
    theme: {
        "accentColor": "emerald",
        "badgeEmoji": "🏪"
    },
    starterPassTemplates: [
        {
            "name": "모바일 편의점 5만원 금액권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 50000,
            "badge": "인기"
        },
        {
            "name": "원두커피 월 30잔 구독 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 30000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "손님",
      "instructor": "스태프/점원",
      "space": "계산대",
      "pass": "스탬프쿠폰",
      "fee": "결제금액"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },

    name: '편의점',
    description: '식음료/생필품 고회전 재고, 3교대 알바 근무표, 일일 시재 마감 및 점검',
    category: 'other',
    capabilities: ['inventory', 'shift_schedule', 'ledger_simple', 'maintenance_checklist'] as const,
    requiredCapabilities: ['inventory', 'shift_schedule', 'ledger_simple'] as const,
    optionalCapabilities: ['maintenance_checklist'] as const,
    businessRules: { shiftHandoverCashCount: true },
    resourceTypes: [{ name: '포스기', type: 'equipment' }],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '근무자', rank_order: 2, permissions: ['shift_schedule:view', 'ledger_simple:*'] },
    ],
    readinessLevel: 'isolated',
  },

  pet_supplies: {
    id: 'pet_supplies',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🐶"
    },
    starterPassTemplates: [
        {
            "name": "사료/간식 10만 정기 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 100000,
            "badge": "인기"
        },
        {
            "name": "월간 맞춤 장난감&간식 구독 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 35000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "반려인/고객",
      "instructor": "매장스태프",
      "space": "진열존",
      "pass": "회원포인트",
      "fee": "결제금액"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "10:00",
      "end_time": "21:00",
      "slot_minutes": 60
    },

    name: '반려동물용품점',
    description: '사료/간식 유통기한 재고, 반려동물 등록 상담, 포인트 적립 및 정산',
    category: 'other',
    capabilities: ['inventory', 'ledger_simple', 'credit_wallet', 'consultation_crm'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple'] as const,
    optionalCapabilities: ['credit_wallet', 'consultation_crm'] as const,
    businessRules: { expiryDateTracking: true },
    resourceTypes: [{ name: '매대', type: 'table' }],
    roles: [{ name: '점주', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  cafe: {
    id: 'cafe',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "☕"
    },
    starterPassTemplates: [
        {
            "name": "아메리카노 10잔 모바일 선불권 (1잔 무료)",
            "passType": "COUNT_BASED",
            "totalCount": 11,
            "validityDays": 90,
            "recommendedPrice": 45000,
            "badge": "인기"
        },
        {
            "name": "월 평일 모닝커피 구독 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 55000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "손님/단골",
      "instructor": "바리스타",
      "space": "테이블",
      "pass": "스탬프쿠폰",
      "fee": "음료결제"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "08:00",
      "end_time": "22:00",
      "slot_minutes": 60
    },

    name: '카페 / 디저트전문점',
    description: '원두/부자재 재고, 테이블 홀 좌석, 바리스타 시프트 근무 및 선불 충전금',
    category: 'food',
    capabilities: ['inventory', 'seat_room', 'ledger_simple', 'shift_schedule', 'credit_wallet', 'table_order_kds', 'recipe_bom', 'waitlist_turn_queue', 'equipment_lifecycle', 'kiosk_staff_call', 'hygiene_haccp_log', 'vendor_ap_invoice', 'work_attendance_payroll', 'pickup_orders', 'loyalty_stamp'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple', 'shift_schedule'] as const,
    optionalCapabilities: ['seat_room', 'credit_wallet', 'table_order_kds', 'recipe_bom', 'waitlist_turn_queue', 'equipment_lifecycle', 'kiosk_staff_call', 'hygiene_haccp_log', 'vendor_ap_invoice', 'work_attendance_payroll', 'pickup_orders', 'loyalty_stamp'] as const,

    businessRules: { prepaidCardDiscount: 5 },
    resourceTypes: [
      { name: '에스프레소 머신', type: 'equipment' },
      { name: '홀 테이블 1~8', type: 'table', capacity: 4 },
    ],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '바리스타', rank_order: 2, permissions: ['shift_schedule:view', 'inventory:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  restaurant: {
    id: 'restaurant',
    theme: {
        "accentColor": "orange",
        "badgeEmoji": "🍽️"
    },
    starterPassTemplates: [
        {
            "name": "점심 런치특선 10회 식권 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 95000,
            "badge": "인기"
        },
        {
            "name": "VIP 디너 코스 2인 식사권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 140000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "손님",
      "instructor": "서버/홀직원",
      "space": "식탁/테이블",
      "pass": "식사권",
      "fee": "음식값"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "11:00",
      "end_time": "21:30",
      "slot_minutes": 60
    },

    name: '소형 음식점 / 식당',
    description: '테이블 좌석 예약, 식자재 식별 재고, 주방/홀 근무 교대 및 일일 결산',
    category: 'food',
    capabilities: ['booking', 'seat_room', 'inventory', 'ledger_simple', 'shift_schedule', 'table_order_kds', 'recipe_bom', 'waitlist_turn_queue', 'kiosk_staff_call', 'hygiene_haccp_log', 'vendor_ap_invoice', 'work_attendance_payroll'] as const,
    requiredCapabilities: ['seat_room', 'ledger_simple', 'shift_schedule'] as const,
    optionalCapabilities: ['booking', 'inventory', 'table_order_kds', 'recipe_bom', 'waitlist_turn_queue', 'kiosk_staff_call', 'hygiene_haccp_log', 'vendor_ap_invoice', 'work_attendance_payroll'] as const,
    businessRules: { reservationDepositPolicy: false },
    resourceTypes: [{ name: '식탁 테이블 1~10', type: 'table', capacity: 4 }],
    roles: [
      { name: '사장', rank_order: 1, permissions: ['*'] },
      { name: '스태프', rank_order: 2, permissions: ['booking:view', 'shift_schedule:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 6: 생활서비스·정비·특수 (Service & Automotive) - 4종
  // ==========================================
  auto_repair: {
    id: 'auto_repair',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "🔧"
    },
    starterPassTemplates: [
        {
            "name": "엔진오일 + 정밀 점검 3회 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 3,
            "validityDays": 365,
            "recommendedPrice": 210000,
            "badge": "추천"
        },
        {
            "name": "에어컨 필터 + 브레이크 점검권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 60000,
            "badge": "인기"
        },
        {
            "name": "타이어 로테이션 & 얼라인먼트 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 80000
        }
    ],
    terms: {
      "customer": "고객/차주",
      "instructor": "엔지니어/정비사",
      "space": "정비베이",
      "pass": "정기점검권",
      "fee": "공임비/정비료",
      "lesson": "정비작업"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "08:30",
      "end_time": "18:30",
      "slot_minutes": 60
    },

    name: '자동차 정비소',
    description: '정비 리프트 배정, 부품 재고, 작업지시서 파이프라인, 차량 수리 이력 및 청구',
    category: 'automotive',
    capabilities: ['task_pipeline', 'inventory', 'billing_invoicing', 'consultation_crm', 'booking', 'commission_payroll', 'work_order_kanban', 'equipment_lifecycle', 'sop_risk_assessment', 'vendor_ap_invoice', 'quality_inspection', 'change_management'] as const,
    requiredCapabilities: ['task_pipeline', 'inventory', 'billing_invoicing'] as const,
    optionalCapabilities: ['consultation_crm', 'booking', 'commission_payroll', 'work_order_kanban', 'equipment_lifecycle', 'sop_risk_assessment', 'vendor_ap_invoice', 'quality_inspection', 'change_management'] as const,
    businessRules: { vinRequired: true, workOrderStages: 4 },
    resourceTypes: [
      { name: '리프트 베이 1~3', type: 'bay', capacity: 1 },
      { name: '진단기', type: 'equipment' },
    ],
    roles: [
      { name: '대표/공장장', rank_order: 1, permissions: ['*'] },
      { name: '정비기사', rank_order: 2, permissions: ['task_pipeline:*', 'inventory:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  cleaning_service: {
    id: 'cleaning_service',
    theme: {
        "accentColor": "teal",
        "badgeEmoji": "✨"
    },
    starterPassTemplates: [
        {
            "name": "정기 오피스/매장 청소 월 4회권",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 30,
            "recommendedPrice": 280000,
            "badge": "인기"
        },
        {
            "name": "에어컨/세탁기 분해 살균 세척권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 120000,
            "badge": "추천"
        },
        {
            "name": "입주/이사 대청소 1회 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 350000
        }
    ],
    terms: {
      "customer": "고객/의뢰인",
      "instructor": "방문클리너/매니저",
      "space": "서비스현장",
      "pass": "정기청소권",
      "fee": "용역비",
      "lesson": "홈클리닝"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "08:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },

    name: '청소·방문 서비스 업체',
    description: '클리너 출장 배정 근무표, 현장 작업 체크리스트, 완료 확인서 및 청구서 발행',
    category: 'property',
    capabilities: ['shift_schedule', 'task_pipeline', 'billing_invoicing', 'consultation_crm', 'booking'] as const,
    requiredCapabilities: ['shift_schedule', 'task_pipeline', 'billing_invoicing'] as const,
    optionalCapabilities: ['consultation_crm', 'booking'] as const,
    businessRules: { dispatchAddressRequired: true },
    resourceTypes: [{ name: '서비스 차량', type: 'vehicle' }],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '현장팀장', rank_order: 2, permissions: ['task_pipeline:*', 'shift_schedule:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  equipment_rental: {
    id: 'equipment_rental',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🚜"
    },
    starterPassTemplates: [
        {
            "name": "전동 공구/촬영 장비 1일 렌탈권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 50000
        },
        {
            "name": "장비 10일 정액 충전 패스",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 400000,
            "badge": "인기"
        },
        {
            "name": "월간 전속 렌탈 패키지",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 900000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "대여자/고객",
      "instructor": "장비관리자",
      "space": "장비보관소",
      "pass": "렌탈이용권",
      "fee": "대여료"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },

    name: '장비·렌탈업',
    description: '건설/촬영/파티 장비 대여, 장비 일련번호 재고, 대여료 청구 및 안전 서약',
    category: 'studio',
    capabilities: ['rental_equipment', 'inventory', 'passes', 'billing_invoicing', 'safety_consent'] as const,
    requiredCapabilities: ['rental_equipment', 'inventory', 'billing_invoicing'] as const,
    optionalCapabilities: ['passes', 'safety_consent'] as const,
    businessRules: { returnInspectionMandatory: true, lateFeeDailyRate: true },
    resourceTypes: [
      { name: '대여 장비 창고', type: 'room' },
      { name: '렌탈 기기 목록', type: 'equipment' },
    ],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '출고관리원', rank_order: 2, permissions: ['rental_equipment:*', 'inventory:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // 추가 2종 (레거시 호환 및 기타 특수 프리셋)
  // ==========================================
  craft_repair: {
    id: 'craft_repair',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "🔨"
    },
    starterPassTemplates: [
        {
            "name": "명품 신발/가방 케어&수선 기본권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 60000,
            "badge": "인기"
        },
        {
            "name": "시계 배터리 교체 및 방수 점검 3회권",
            "passType": "COUNT_BASED",
            "totalCount": 3,
            "validityDays": 180,
            "recommendedPrice": 45000
        },
        {
            "name": "가죽 영양 코팅 복원 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 120000,
            "badge": "추천"
        }
    ],
    terms: {
      "customer": "수강생/의뢰인",
      "instructor": "공방장/마스터",
      "space": "작업대/물레",
      "pass": "공방이용권",
      "fee": "수강료/공임",
      "lesson": "공방클래스"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },

    name: '맞춤 제작 공방 & 수리점',
    description: '단계별 제작/수리 칸반 파이프라인, 원자재 재고 관리 및 픽업 예약',
    category: 'studio',
    capabilities: ['task_pipeline', 'inventory', 'booking', 'ledger_simple', 'sop_risk_assessment', 'pickup_orders', 'quality_inspection', 'change_management', 'loyalty_stamp'] as const,
    requiredCapabilities: ['task_pipeline', 'inventory'] as const,
    optionalCapabilities: ['booking', 'ledger_simple', 'sop_risk_assessment', 'pickup_orders', 'quality_inspection', 'change_management', 'loyalty_stamp'] as const,
    resourceTypes: [{ name: '작업대', type: 'table' }],
    roles: [{ name: '공방장', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  self_carwash: {
    id: 'self_carwash',
    theme: {
        "accentColor": "sky",
        "badgeEmoji": "🚗"
    },
    starterPassTemplates: [
        {
            "name": "셀프 세차 IC카드 5만 충전권 (1만 보너스)",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 180,
            "recommendedPrice": 50000,
            "badge": "인기"
        },
        {
            "name": "개인 베이 2시간 무제한 정액권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 30000,
            "badge": "추천"
        },
        {
            "name": "월 무제한 폼건&고압수 야간 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 89000
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "스태프/관리인",
      "space": "세차베이/드라잉존",
      "pass": "세차충전권",
      "fee": "세차비"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "00:00",
      "end_time": "24:00",
      "slot_minutes": 60
    },

    name: '셀프 세차장 & 코인샵',
    description: 'RF카드 선불 충전금/보너스, 시설 기물 루틴 점검 및 세차 소모품 재고 관리',
    category: 'automotive',
    capabilities: ['credit_wallet', 'maintenance_checklist', 'inventory', 'loyalty_stamp'] as const,
    requiredCapabilities: ['credit_wallet', 'maintenance_checklist'] as const,
    optionalCapabilities: ['inventory', 'loyalty_stamp'] as const,
    resourceTypes: [{ name: '세차 베이 1~6', type: 'bay' }],
    roles: [{ name: '점주', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },


  sauna_jjimjilbang: {
    id: 'sauna_jjimjilbang',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "♨️"
    },
    starterPassTemplates: [
        {
            "name": "사우나 10회 정기 이용권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 90,
            "recommendedPrice": 90000,
            "badge": "인기"
        },
        {
            "name": "사우나+찜질방 1개월 정기 회원권",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 160000,
            "badge": "추천"
        },
        {
            "name": "세신(때밀이) + 사우나 패키지권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 35000
        }
    ],
    terms: {
      "customer": "고객",
      "instructor": "카운터/스태프",
      "space": "사물함",
      "pass": "입장권/정기권",
      "fee": "입장료"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "05:00",
      "end_time": "23:00",
      "slot_minutes": 60
    },
    facilities: {
      "needsLocker": true,
      "defaultLockerCount": 50
    },

    name: '사우나·찜질방',
    description: '남녀 락커 배정, 이용권/회원권, 선불 크레딧 및 시설 점검 루틴 관리',
    category: 'wellness',
    capabilities: ['locker', 'passes', 'maintenance_checklist', 'credit_wallet', 'lost_found'] as const,
    requiredCapabilities: ['locker', 'passes'] as const,
    optionalCapabilities: ['maintenance_checklist', 'credit_wallet', 'lost_found'] as const,
    resourceTypes: [{ name: '사물함/락커', type: 'locker', capacity: 100 }],
    roles: [
      { name: '사장', rank_order: 1, permissions: ['*'] },
      { name: '주간 카운터', rank_order: 2, permissions: ['passes:*', 'lockers:*'] },
      { name: '야간 카운터', rank_order: 3, permissions: ['passes:deduct', 'lockers:assign'] },
    ],
    readinessLevel: 'persisted',
  },

  // ==========================================
  // Group 7: 기업·제조·유통 엔터프라이즈 (Enterprise Suites) - 3종
  // ==========================================
  baby_food_coop: {
    id: 'baby_food_coop',
    name: '이유식 품앗이 / 공동육아',
    description: '월령별 맞춤 추천 및 알레르기 관리, 1/N 재료비 자동 정산 커뮤니티',
    category: 'COMMUNITY',
    theme: {
      accentColor: 'indigo',
      badgeEmoji: '🍼',
    },
    starterPassTemplates: [
      {
        name: '이유식 품앗이 4회 정기 분담권',
        passType: 'COUNT_BASED',
        totalCount: 4,
        validityDays: 30,
        recommendedPrice: 30000,
        badge: '정기',
      },
    ],
    terms: {
      customer: '참여 가족 (아기)',
      instructor: '모임장 (이번 달 방장)',
      space: '모임 거점 (주방/공간)',
      pass: '큐브 교환권 (품앗이 티켓)',
      fee: '재료비 1/N 정산',
      lesson: '공동 당번 (요리 조)',
      tenant: '우리 품앗이 모임',
      owner: '모임장 (이번 달 방장)',
      staff: '공동 당번 (요리 조)',
      billing: '재료비 1/N 정산',
    },
    operatingHours: {
      day_type: 'WEEKDAYS',
      start_time: '10:00',
      end_time: '17:00',
      slot_minutes: 60,
    },
    facilities: {
      hasDepartments: false,
    },
    capabilities: [
      'baby_food_coop',
      'consultation_crm',
      'feedbacks',
      'daily_care_report',
      'billing_invoicing',
      'booking',
      'rental_equipment',
    ] as const,
    requiredCapabilities: [
      'baby_food_coop',
      'consultation_crm',
      'billing_invoicing',
    ] as const,
    optionalCapabilities: [
      'feedbacks',
      'daily_care_report',
      'booking',
      'rental_equipment',
    ] as const,
    roles: [
      { name: '모임장 (총무)', rank_order: 1, permissions: ['*'] },
      { name: '공동 참여맘/보호자', rank_order: 2, permissions: ['baby_food_coop:*', 'billing_invoicing:view', 'consultation_crm:view'] },
    ],
    resourceTypes: [
      { name: '품앗이 공유 조리대', type: 'room', capacity: 6 },
      { name: '이유식 마스터기/소독기', type: 'equipment', capacity: 2 },
    ],
    defaultSettings: {
      defaultMeetingCycle: '주 1회 (화요일)',
      settlementRule: '1/N 원단위 절사 분담 (잔여금 모임 적립)',
      allergyCheckMandatory: true,
    },
    businessRules: {
      auto_calculate_per_person: true,
      require_allergy_acknowledgement: true,
    },
    readinessLevel: 'basic_ui',
  },
};
