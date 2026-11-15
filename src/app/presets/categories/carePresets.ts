/**
 * carePresets - Multi-vertical Industry Presets
 */
import type { IndustryPresetDefinition } from '@/core/presets/types';

export const carePresets: Record<string, IndustryPresetDefinition> = {
  pet_grooming: {
    id: 'pet_grooming',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🐾"
    },
    starterPassTemplates: [
        {
            "name": "소형견 위생목욕 5회 패키지",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 90,
            "recommendedPrice": 150000,
            "badge": "인기"
        },
        {
            "name": "스포팅+가위컷 디자인 미용권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 70000,
            "badge": "추천"
        },
        {
            "name": "스파+하이드로바스 3회 정기권",
            "passType": "COUNT_BASED",
            "totalCount": 3,
            "validityDays": 60,
            "recommendedPrice": 90000
        }
    ],
    terms: {
      "customer": "보호자/반려견",
      "instructor": "그루머/미용사",
      "space": "미용부스/드라이룸",
      "pass": "미용회차권",
      "fee": "미용비",
      "lesson": "미용/스파"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "10:00",
      "end_time": "19:00",
      "slot_minutes": 60
    },

    name: '반려동물 미용실',
    description: '반려견 체중/견종별 예약, 미용 특이사항 차트, 스파 관리 및 간이 매출',
    category: 'beauty',
    capabilities: ['booking', 'consultation_crm', 'treatment_chart', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'treatment_chart'] as const,
    optionalCapabilities: ['consultation_crm', 'ledger_simple'] as const,
    businessRules: { rabiesVaccinationCheck: true },
    resourceTypes: [
      { name: '미용 테이블', type: 'table', capacity: 1 },
      { name: '하이드로바스', type: 'equipment' },
    ],
    roles: [
      { name: '원장미용사', rank_order: 1, permissions: ['*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 4: 공간·대여·숙박 (Space & Rental) - 6종
  // ==========================================
  pet_hotel: {
    id: 'pet_hotel',
    theme: {
        "accentColor": "amber",
        "badgeEmoji": "🏨"
    },
    starterPassTemplates: [
        {
            "name": "소형견 디럭스룸 1박 숙박권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 60,
            "recommendedPrice": 40000,
            "badge": "인기"
        },
        {
            "name": "정기 유치원 놀이방 10회 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 250000,
            "badge": "추천"
        },
        {
            "name": "주말 2박3일 힐링 호텔링 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 90000
        }
    ],
    terms: {
      "customer": "보호자/반려동물",
      "instructor": "케어매니저/훈련사",
      "space": "호텔룸/플레이존",
      "pass": "숙박권/등원권",
      "fee": "돌봄료",
      "lesson": "유치원수업"
    },
    operatingHours: {
      "day_type": "ALL_WEEK",
      "start_time": "08:00",
      "end_time": "20:00",
      "slot_minutes": 60
    },

    name: '반려동물 호텔·유치원',
    description: '호텔룸/유치원 좌석 점유, 등원 출결 체크, 알림장 상담 일지 및 시설 위생 점검',
    category: 'pet',
    capabilities: ['seat_room', 'attendance', 'passes', 'consultation_crm', 'maintenance_checklist'] as const,
    requiredCapabilities: ['seat_room', 'attendance', 'passes'] as const,
    optionalCapabilities: ['consultation_crm', 'maintenance_checklist'] as const,
    businessRules: { emergencyContactMandatory: true },
    resourceTypes: [
      { name: '호텔룸 1~10', type: 'room', capacity: 1 },
      { name: '놀이방', type: 'court', capacity: 15 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '케어강사', rank_order: 2, permissions: ['attendance:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  daycare: {
    id: 'daycare',
    theme: {
        "accentColor": "sky",
        "badgeEmoji": "👶"
    },
    starterPassTemplates: [
        {
            "name": "월 정규 안심 보육 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 20,
            "validityDays": 30,
            "recommendedPrice": 0,
            "badge": "정규"
        },
        {
            "name": "시간제 긴급 돌봄 10시간 충전권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 50000,
            "badge": "인기"
        }
    ],
    terms: {
      "customer": "원아/학부모",
      "instructor": "담임교사",
      "space": "보육실(반)",
      "pass": "입학/원서",
      "fee": "보육료",
      "lesson": "일일활동"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "07:30",
      "end_time": "19:30",
      "slot_minutes": 60
    },

    name: '어린이집·유치원',
    description: '원아 등하원 출결, 보육료 결제, 학부모 상담 및 안전 동의서 관리',
    category: 'childcare',
    capabilities: ['attendance', 'billing_invoicing', 'consultation_crm', 'safety_consent', 'vehicle_shuttle', 'hygiene_haccp_log'] as const,
    requiredCapabilities: ['attendance', 'billing_invoicing'] as const,
    optionalCapabilities: ['consultation_crm', 'safety_consent', 'vehicle_shuttle', 'hygiene_haccp_log'] as const,
    resourceTypes: [{ name: '보육실 (반)', type: 'room', capacity: 15 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '보육교사', rank_order: 2, permissions: ['attendance:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'persisted',
  },

};
