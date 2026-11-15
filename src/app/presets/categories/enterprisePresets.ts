/**
 * enterprisePresets - Multi-vertical Industry Presets
 */
import type { IndustryPresetDefinition } from '@/core/presets/types';

export const enterprisePresets: Record<string, IndustryPresetDefinition> = {
  general_enterprise: {
    id: 'general_enterprise',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🏢"
    },
    starterPassTemplates: [
        {
            "name": "사내 공용 회의실 월 40시간 패스",
            "passType": "COUNT_BASED",
            "totalCount": 40,
            "validityDays": 30,
            "recommendedPrice": 0,
            "badge": "사내"
        },
        {
            "name": "업무용 법인 차량 10회 배차권",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 60,
            "recommendedPrice": 0
        }
    ],
    terms: {
      "customer": "고객사/임직원",
      "instructor": "담당자/팀원",
      "space": "회의실/집무실",
      "pass": "사원패스",
      "fee": "청구금액"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: '일반 기업 / 경영관리',
    description: '전사 다단계 전자결재, 부서별 업무 칸반 파이프라인, MBO 성과관리, 사규 및 피드백 중심',
    category: 'other',
    capabilities: [
      'approval_workflow',
      'task_pipeline',
      'workplace_policy',
      'mbo',
      'feedbacks',
      'billing_invoicing',
      'seat_room',
      'leave_management',
      'supply_restock',
    ] as const,
    requiredCapabilities: ['approval_workflow', 'task_pipeline'] as const,
    optionalCapabilities: [
      'workplace_policy',
      'mbo',
      'feedbacks',
      'billing_invoicing',
      'seat_room',
      'leave_management',
      'supply_restock',
      'shuttle_dispatch',
      'hazardous_substance_msds',
    ] as const,
    roles: [
      { name: '대표이사/임원', rank_order: 1, permissions: ['*'] },
      { name: '팀장/관리자', rank_order: 2, permissions: ['approval_workflow:*', 'task_pipeline:*', 'mbo:*'] },
      { name: '팀원', rank_order: 3, permissions: ['task_pipeline:*', 'mbo:view', 'workplace_policy:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  manufacturing_light: {
    id: 'manufacturing_light',
    theme: {
        "accentColor": "slate",
        "badgeEmoji": "🏭"
    },
    starterPassTemplates: [
        {
            "name": "안전보건 정기 교육 4회 이수권",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 90,
            "recommendedPrice": 0,
            "badge": "사내"
        },
        {
            "name": "생산라인 공구 세트 불출 패스",
            "passType": "COUNT_BASED",
            "totalCount": 10,
            "validityDays": 30,
            "recommendedPrice": 0
        }
    ],
    terms: {
      "customer": "발주처/고객사",
      "instructor": "작업자/반장",
      "space": "가공/조립라인",
      "pass": "작업지시서",
      "fee": "납품단가"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "08:00",
      "end_time": "17:00",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: '제조·가공업 (공정/BOM/품질 관리)',
    description: '생산 공정 파이프라인, 부품표(BOM), 원자재 재고, 설비 점검 및 현장 안전 관리',
    category: 'manufacturing',
    capabilities: [
      'task_pipeline',
      'recipe_bom',
      'inventory',
      'quality_inspection',
      'maintenance_checklist',
      'sop_risk_assessment',
      'facility_incident_report',
      'shift_schedule',
      'workplace_policy',
      'feedbacks',
      'supply_restock',
      'change_management',
      'approval_workflow',
      'leave_management',
      'vehicle_shuttle',
      'shuttle_dispatch',
      'seat_room',
    ] as const,
    requiredCapabilities: ['task_pipeline', 'recipe_bom', 'inventory'] as const,
    optionalCapabilities: [
      'quality_inspection',
      'maintenance_checklist',
      'sop_risk_assessment',
      'facility_incident_report',
      'shift_schedule',
      'workplace_policy',
      'feedbacks',
      'supply_restock',
      'change_management',
      'approval_workflow',
      'leave_management',
      'vehicle_shuttle',
      'shuttle_dispatch',
      'seat_room',
    ] as const,
    roles: [
      { name: '공장장/관리자', rank_order: 1, permissions: ['*'], description: '공장 총괄 및 최종 승인권자' },
      { name: '생산반장', rank_order: 2, permissions: ['task_pipeline:*', 'recipe_bom:*', 'inventory:*', 'quality_inspection:*', 'maintenance_checklist:*'], description: '공정 및 자재/설비 관리자' },
      { name: '현장작업자', rank_order: 3, permissions: ['task_pipeline:view', 'task_pipeline:update', 'sop_risk_assessment:view', 'maintenance_checklist:submit', 'feedbacks:create'], description: '작업 수행 및 일상 점검' },
    ],
    resourceTypes: [
      { name: '1호 가공 라인', type: 'line', capacity: 10 },
      { name: '2호 조립 라인', type: 'line', capacity: 10 },
      { name: '검사실/완제품실', type: 'room', capacity: 5 },
    ],
    defaultSettings: {
      shift_system: '2_shift',
      daily_safety_briefing: true,
      lot_tracking_mandatory: true,
    },
    businessRules: {
      bom_auto_deduct: true,
      inspection_required_before_shipment: true,
      incident_capa_linkage: true,
    },
    readinessLevel: 'basic_ui',
  },

  procurement_distribution: {
    id: 'procurement_distribution',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🚚"
    },
    starterPassTemplates: [
        {
            "name": "물류 입출고 독(Dock) 1일 배정권",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 30,
            "recommendedPrice": 0,
            "badge": "물류"
        },
        {
            "name": "파렛트 적치 월간 정기 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 0
        }
    ],
    terms: {
      "customer": "매입/매출처",
      "instructor": "물류/영업담당",
      "space": "물류창고",
      "pass": "납품전표",
      "fee": "정산금액"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "08:30",
      "end_time": "17:30",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: '도소매 / 자재 유통업',
    description: '구매 요청(PR) 및 최적 견적 비교, FEFO 로트별 창고 재고, 외상매입금(AP) 및 전자결재',
    category: 'other',
    capabilities: ['supply_restock', 'inventory', 'approval_workflow', 'billing_invoicing', 'vendor_ap_invoice', 'credit_wallet'] as const,
    requiredCapabilities: ['supply_restock', 'inventory', 'billing_invoicing'] as const,
    optionalCapabilities: ['approval_workflow', 'vendor_ap_invoice', 'credit_wallet'] as const,
    roles: [
      { name: '유통총괄', rank_order: 1, permissions: ['*'] },
      { name: '물류/자재담당', rank_order: 2, permissions: ['inventory:*', 'supply_restock:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  iso_ims_enterprise: {
    id: 'iso_ims_enterprise',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "🛡️"
    },
    starterPassTemplates: [
        {
            "name": "통합 경영시스템 위험성평가 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 0
        },
        {
            "name": "환경/안전 내부심사 점검권 (5회)",
            "passType": "COUNT_BASED",
            "totalCount": 5,
            "validityDays": 180,
            "recommendedPrice": 0,
            "badge": "사내"
        }
    ],
    terms: {
      "customer": "이해관계자/심사원",
      "instructor": "품질/안전담당자",
      "space": "회의실/현장",
      "pass": "승인문서",
      "fee": "심사비"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: 'ISO 통합경영시스템 (QEHS)',
    description: 'ISO 9001(품질), ISO 14001(환경), ISO 45001(안전보건) 3대 통합경영시스템 (품질검사, 위험성평가, 환경측면, 사고/CAPA, 전자결재)',
    category: 'other',
    capabilities: [
      'quality_inspection',
      'sop_risk_assessment',
      'facility_incident_report',
      'change_management',
      'approval_workflow',
      'maintenance_checklist',
      'workplace_policy',
      'mbo',
      'inventory',
      'seat_room',
      'leave_management',
    ] as const,
    requiredCapabilities: [
      'quality_inspection',
      'sop_risk_assessment',
      'facility_incident_report',
      'approval_workflow',
    ] as const,
    optionalCapabilities: [
      'change_management',
      'maintenance_checklist',
      'workplace_policy',
      'mbo',
      'inventory',
      'seat_room',
      'leave_management',
    ] as const,
    roles: [
      { name: 'QEHS 최고경영자/총괄책임', rank_order: 1, permissions: ['*'] },
      { name: '내부심사원/품질안전관리자', rank_order: 2, permissions: ['quality_inspection:*', 'sop_risk_assessment:*', 'facility_incident_report:*', 'approval_workflow:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  iso_human_capital: {
    id: 'iso_human_capital',
    theme: {
        "accentColor": "indigo",
        "badgeEmoji": "📋"
    },
    starterPassTemplates: [
        {
            "name": "ISO 30414 감사 대비 역량 평가 패스",
            "passType": "COUNT_BASED",
            "totalCount": 1,
            "validityDays": 90,
            "recommendedPrice": 0
        },
        {
            "name": "임직원 필수 직무 트레이닝 4과정",
            "passType": "COUNT_BASED",
            "totalCount": 4,
            "validityDays": 60,
            "recommendedPrice": 0,
            "badge": "사내"
        }
    ],
    terms: {
      "customer": "임직원",
      "instructor": "인사/HR담당자",
      "space": "세미나실/회의실",
      "pass": "교육이수증",
      "fee": "인건비"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: 'ISO 인적자본 경영 (HR & MBO)',
    description: 'ISO 30414 인적자본 보고 지표, MBO 성과관리, 직무 역량 및 법정 자격증, 교육훈련 유효성 평가, 직무 스트레스 및 익명 고충처리',
    category: 'other',
    capabilities: [
      'mbo',
      'shift_schedule',
      'work_attendance_payroll',
      'workplace_policy',
      'feedbacks',
      'approval_workflow',
      'leave_management',
    ] as const,
    requiredCapabilities: [
      'mbo',
      'work_attendance_payroll',
      'workplace_policy',
    ] as const,
    optionalCapabilities: [
      'shift_schedule',
      'feedbacks',
      'approval_workflow',
      'leave_management',
    ] as const,
    roles: [
      { name: '대표이사/총괄임원', rank_order: 1, permissions: ['*'] },
      { name: '인사팀장/HRD', rank_order: 2, permissions: ['mbo:*', 'work_attendance_payroll:*', 'workplace_policy:*', 'feedbacks:*', 'approval_workflow:*'] },
      { name: '부서장/팀장', rank_order: 2, permissions: ['mbo:update', 'shift_schedule:*', 'feedbacks:view', 'approval_workflow:submit'] },
      { name: '사원/팀원', rank_order: 3, permissions: ['mbo:view', 'workplace_policy:view', 'feedbacks:create', 'work_attendance_payroll:view'] },
    ],
    resourceTypes: [
      { name: '본사 대회의실', type: 'room', capacity: 20 },
      { name: 'HR 상담실', type: 'room', capacity: 4 },
      { name: '교육 세미나실', type: 'room', capacity: 30 },
    ],
    defaultSettings: {
      evaluation_cycle: 'quarterly',
      grievance_anonymous_allowed: true,
      competence_expiry_alert_days: 30,
    },
    businessRules: {
      mbo_peer_review_enabled: true,
      training_effectiveness_threshold: 70,
      nda_mandatory_before_work: true,
    },
    readinessLevel: 'basic_ui',
  },

  rnd_lab_management: {
    id: 'rnd_lab_management',
    theme: {
        "accentColor": "purple",
        "badgeEmoji": "🔬"
    },
    starterPassTemplates: [
        {
            "name": "정밀 분석 장비 20시간 예약권",
            "passType": "COUNT_BASED",
            "totalCount": 20,
            "validityDays": 60,
            "recommendedPrice": 0,
            "badge": "연구"
        },
        {
            "name": "클린룸 출입 및 시약 불출 패스",
            "passType": "PERIOD_BASED",
            "totalCount": 30,
            "validityDays": 30,
            "recommendedPrice": 0
        }
    ],
    terms: {
      "customer": "연구원/과제담당자",
      "instructor": "책임연구원/관리자",
      "space": "실험실/분석기기실",
      "pass": "연구과제/승인",
      "fee": "연구비"
    },
    operatingHours: {
      "day_type": "WEEKDAY",
      "start_time": "09:00",
      "end_time": "18:00",
      "slot_minutes": 60
    },
    facilities: {
      "hasDepartments": true
    },

    name: '연구소 & 랩실 관리 (기업 R&D / 대학 연구실)',
    description: '연구 프로젝트 및 학술 논문/특허 파이프라인, 연구 장비 예약 및 자동 사용일지, 특허/직무발명 보상 관리, 연구 설비 자산/수리 이력, 연구실안전법 일일점검 및 시약 MSDS 관리',
    category: 'other',
    capabilities: [
      'task_pipeline',
      'seat_room',
      'research_project',
      'patent_ip_asset',
      'equipment_lifecycle',
      'facility_incident_report',
      'sop_risk_assessment',
      'supply_restock',
      'mbo',
      'approval_workflow',
      'leave_management',
      'vehicle_shuttle',
      'hazardous_substance_msds',
      'electronic_lab_notebook',
    ] as const,
    requiredCapabilities: [
      'task_pipeline',
      'seat_room',
      'research_project',
      'patent_ip_asset',
      'sop_risk_assessment',
    ] as const,
    optionalCapabilities: [
      'equipment_lifecycle',
      'facility_incident_report',
      'supply_restock',
      'mbo',
      'approval_workflow',
      'leave_management',
      'vehicle_shuttle',
      'hazardous_substance_msds',
      'electronic_lab_notebook',
    ] as const,
    roles: [
      { name: '연구책임자(PI) / 연구소장', rank_order: 1, permissions: ['*'] },
      { name: '부책임자 / 랩장 / 박사후연구원', rank_order: 2, permissions: ['research_project:*', 'task_pipeline:*', 'resources:*', 'patent_ip_asset:*', 'equipment_lifecycle:*', 'mbo:*'] },
      { name: '참여연구원 / 석·박사과정생', rank_order: 3, permissions: ['research_project:update', 'task_pipeline:update', 'resources:book', 'patent_ip_asset:submit', 'sop_risk_assessment:view'] },
      { name: '학부연구생 / 연구보조원', rank_order: 4, permissions: ['resources:book', 'task_pipeline:view', 'sop_risk_assessment:view'] },
      { name: '연구실 안전관리담당자', rank_order: 2, permissions: ['sop_risk_assessment:*', 'supply_restock:*', 'facility_incident_report:*', 'approval_workflow:*', 'research_project:view'] },
    ],
    resourceTypes: [
      { name: '정밀분석기기 (FE-SEM / XRD / NMR)', type: 'equipment', capacity: 1 },
      { name: '공용 분석대 (클린벤치 / 흄후드)', type: 'equipment', capacity: 2 },
      { name: '제1실험실 (합성·배양실)', type: 'room', capacity: 8 },
      { name: '랩 세미나실 / 프로젝트 미팅룸', type: 'room', capacity: 12 },
    ],
    defaultSettings: {
      lab_safety_inspection_cycle: 'daily',
      patent_share_sum_mandatory: true,
      equipment_logbook_auto_generate: true,
      statutory_safety_training_hours: 6,
    },
    businessRules: {
      require_fume_hood_daily_check: true,
      auto_generate_logbook_on_reservation: true,
      invention_review_grade_mandatory: true,
    },
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 7: 생활·커뮤니티 (Community) - 1종
  // ==========================================
};
