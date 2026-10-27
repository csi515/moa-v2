import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from '@refinedev/react-hook-form';
import {
  Building2,
  CheckCircle2,
  Sparkles,
  Music,
  Waves,
  Dumbbell,
  Clock,
  Layers,
  Shield,
  Plus,
  X,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Settings2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Tag,
  SlidersHorizontal,
  Factory,
  Wrench,
} from 'lucide-react';
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { createInitialDepartments } from '@/core/organizations/services/organizationService';
import { useTenant } from '@/core/auth/context/TenantContext';
import { applyDomainErrorToForm } from '@/core/utils/formErrorAdapter';
import {
  listIndustryPresets,
  listMoaVisiblePresets,
  getIndustryPreset,
  isPresetVisibleInMoa,
} from '@/app/presets/presetRegistry';
import {
  recommendIndustryPreset,
  type RecommendationResult,
} from '@/app/presets/presetRecommendationEngine';
import {
  getQuestionsForIndustry,
  getStandardPresetsForIndustry,
  buildPresetPayload,
  type PresetRoleConfig,
  type PresetRoomConfig,
  type PresetOperatingHoursConfig,
  type IndustryQuestionField,
} from '@/app/presets/presetQuestionEngine';
import {
  OPERATION_TOOL_SETS,
  getRecommendedToolSetsForPreset,
  resolveToolSetActivation,
  type OperationToolSetId,
} from '@/core/presets/operationBundles';
import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';
import { getCapabilityDisplayName } from '@/capabilities';
import { OrganizationOnboardingCard } from '@/pages/organization/OrganizationOnboardingCard';
import { mergeOpsRuntimeSettings } from '@/core/capabilities/opsRuntimeSettings';
import { shouldAskDepartmentSetup } from '@/core/organizations/departmentScope';

interface QuickSetupFormData {
  name: string;
  industry: string;
  [key: string]: any;
}

const INDUSTRY_CARDS = [
  {
    id: 'piano',
    title: '피아노 학원',
    subtitle: '피아노 연습실 5개, 전임/파트 강사 직급, 30분 상담시간 자동 세팅',
    badge: '추천',
    icon: Music,
    color: 'indigo',
  },
  {
    id: 'sauna',
    title: '사우나 / 찜질방',
    subtitle: '남탕/여탕 락커 1~50번, 주/야간 카운터, 상시 18시간 운영 자동 세팅',
    badge: '인기',
    icon: Waves,
    color: 'cyan',
  },
  {
    id: 'pilates',
    title: '필라테스 스튜디오',
    subtitle: '리포머/체어/개인레슨실, 수석/일반 강사, 50분 수업 슬롯 자동 세팅',
    badge: '피트니스',
    icon: Dumbbell,
    color: 'emerald',
  },
  {
    id: 'custom',
    title: '자유 맞춤 선택',
    subtitle: '필요한 운영 도구를 직접 골라 맞춤 매장을 구성합니다.',
    badge: '자유 커스텀',
    icon: Sparkles,
    color: 'indigo',
  },
];

const CUSTOM_MODE_CATEGORIES: Array<{
  categoryName: string;
  description: string;
  tools: Array<{ id: string; label: string; desc: string }>;
}> = [
  {
    categoryName: '출결 / 회원 관리',
    description: '고객 출결 체크인, 이용권 및 회원 정보 관리',
    tools: [
      { id: 'attendance', label: '출결 체크인', desc: '키오스크 및 번호 입력 출결 기록' },
      { id: 'passes', label: '이용권 / 회원권', desc: '횟수제, 기간제 수강권 및 패스' },
      { id: 'consultation_crm', label: '고객 상담 CRM', desc: '신규 문의 및 고객 상담 이력' },
      { id: 'trial_funnel', label: '체험 및 상담 리드', desc: '무료 체험 유입 및 전환 파이프라인' },
      { id: 'parent', label: '학부모 / 보호자 알림', desc: '출결 및 활동 알림장 연동' },
    ],
  },
  {
    categoryName: '시간표 / 수업 / 예약',
    description: '수업 예약, 스케줄표 및 마감 취소 대기열',
    tools: [
      { id: 'booking', label: '시간표 예약 관리', desc: '수업 및 레슨 타임테이블 예약' },
      { id: 'waitlist_queue', label: '마감 취소 대기열 FIFO', desc: '취소 발생 시 선착순 제안 발송' },
      { id: 'instructor_match', label: '강사 / 담당자 매칭', desc: '고객별 1:1 담당자 배정' },
      { id: 'shift_schedule', label: '직원 교대 근무', desc: '스태프 근무 스케줄 배정' },
    ],
  },
  {
    categoryName: '공간 / 좌석 / 시설 정비',
    description: '룸·타석·좌석 배정, 정비 버퍼 및 시간제 과금',
    tools: [
      { id: 'seat_room', label: '좌석 / 룸 배정', desc: '타석, 연습실, 스튜디오 공간 배정' },
      { id: 'space_turnaround', label: '공간 정비/청소 버퍼', desc: '이용 종료 후 15분 환기/청소 버퍼' },
      { id: 'seat_timer_billing', label: '시간제 공간 타이머', desc: '분/시간 단위 이용료 및 초과 과금' },
      { id: 'locker', label: '사물함 / 락커', desc: '고정 락커 및 일일 락커 관리' },
      { id: 'maintenance_checklist', label: '시설 점검 체크리스트', desc: '매장 일일 위생/안전 점검표' },
    ],
  },
  {
    categoryName: '판매 / 수납 / 매출 관리',
    description: '결제 청구서, 재고 관리 및 특가 이벤트',
    tools: [
      { id: 'billing_invoicing', label: '청구 / 수납 인보이스', desc: '이용료 청구서 및 수납 영수증' },
      { id: 'inventory', label: '상품 판매 및 재고', desc: '소매 제품 입출고 및 바코드 재고' },
      { id: 'promotional_deal', label: '기간 한정 특가 & 이벤트', desc: '얼리버드 및 시즌 할인 스케줄러' },
      { id: 'ledger_simple', label: '간편 매출 장부', desc: '일일 수납액 및 간편 손익 집계' },
      { id: 'credit_wallet', label: '선불 충전금 크레딧', desc: '선불 적립금 충전 및 차감' },
    ],
  },
  {
    categoryName: '현장 파견 / 고객 만족',
    description: '출장 방문 관리, 안전 서약 및 고객 소통',
    tools: [
      { id: 'field_dispatch', label: '출장 및 방문 파견', desc: '방문 일정, 이동 버퍼 및 지도 길안내' },
      { id: 'safety_consent', label: '전자 동의 / 안전 서약', desc: '터치패드 전자 서명 및 면책 동의' },
      { id: 'loyalty_stamp', label: '모바일 전자 스탬프', desc: '방문 칭찬 스탬프 및 쿠폰' },
      { id: 'feedbacks', label: '고객 건의 / 소통함', desc: '고객 피드백 수집 및 인수인계' },
    ],
  },
];

const CAPABILITY_LABEL_MAP: Record<string, string> = {
  attendance: '출결 체크인',
  booking: '예약 관리',
  passes: '이용권·회원권',
  locker: '사물함·락커',
  inventory: '재고 관리',
  seat_room: '좌석·공간 배정',
  rental_equipment: '장비 렌탈',
  maintenance_checklist: '점검 체크리스트',
  instructor_match: '강사 매칭',
  shift_schedule: '교대 근무',
  task_pipeline: '작업 파이프라인',
  billing_invoicing: '청구·인보이스',
  ledger_simple: '간편 장부',
  credit_wallet: '충전금·크레딧',
  consultation_crm: '상담 CRM',
  treatment_chart: '시술 차트',
  safety_consent: '안전 서약',
  parking_validator: '주차 정산·등록',
  emergency_alert_broadcast: '긴급 재난·공지 방송',
  digital_guestbook: '전자 방명록',
  trial_funnel: '체험 수업 유입',
  learning_journal: '수업·학습 일지',
  level_assessment: '급수·레벨 평가',
  daily_care_report: '돌봄·활동 알림장',
  vehicle_shuttle: '등하원 셔틀',
  makeup_lesson_pass: '보강권 발행',
  diet_body_log: '식단·체형 일지',
  exam_grade_analytics: '단원평가·성적 분석',
  entry_pass_ticket: '출입 티켓·패스',
  achievement_quest_badge: '퀘스트 뱃지·메달',
  facility_incident_report: '사고·파손 보고서',
  nps_survey_collector: '만족도 NPS 조사',
  workplace_policy: '매장 사규·서약',
  feedbacks: '고객 건의함',
  substitute_dispatch: '대강사 파견',
  recipe_bom: '부품표(BOM)·소모',
  sop_risk_assessment: '작업표준 SOP·위험성평가',
  quality_inspection: '품질검사·공차',
  approval_workflow: '전자결재·승인',
  change_management: '4M 변경관리(ECN)',
  supply_restock: '자재 발주·입고',
};

function formatCapabilityLabel(cap: string): string {
  return CAPABILITY_LABEL_MAP[cap] || getCapabilityDisplayName(cap);
}

const CATEGORY_TABS = [
  { id: 'all', label: '전체' },
  { id: 'education', label: '교육·학원' },
  { id: 'fitness', label: '운동·피트니스' },
  { id: 'beauty', label: '뷰티' },
  { id: 'wellness', label: '웰니스·스파' },
  { id: 'studio', label: '공간·스튜디오' },
  { id: 'childcare', label: '키즈·돌봄' },
  { id: 'manufacturing', label: '제조·가공', icon: Factory },
  { id: 'other', label: '기타 서비스' },
];

export function normalizeRankOrders<T extends { rank_order: number }>(roles: readonly T[]): T[] {
  return roles.map((r, index) => ({
    ...r,
    rank_order: (index + 1) * 100,
  }));
}

export const QuickSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchTenant } = useTenant();

  const [selectedIndustry, setSelectedIndustry] = useState<string>('piano');
  const [setupDepartments, setSetupDepartments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // 40개 전체 업종 브라우저 상태
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const allPresets = useMemo(() => listMoaVisiblePresets(), []);

  const filteredPresets = useMemo(() => {
    return allPresets.filter((p) => {
      const matchCat =
        selectedCategory === 'all' ||
        p.category === selectedCategory ||
        (selectedCategory === 'other' &&
          !['education', 'fitness', 'beauty', 'wellness', 'studio', 'childcare', 'manufacturing'].includes(
            p.category
          ));

      const matchSearch =
        !searchKeyword.trim() ||
        p.name.toLowerCase().includes(searchKeyword.toLowerCase().trim()) ||
        p.description.toLowerCase().includes(searchKeyword.toLowerCase().trim()) ||
        p.id.toLowerCase().includes(searchKeyword.toLowerCase().trim());

      return matchCat && matchSearch;
    });
  }, [allPresets, selectedCategory, searchKeyword]);

  const activePreset = useMemo(() => {
    return getIndustryPreset(selectedIndustry);
  }, [selectedIndustry]);

  // Pre-fill 상태 관리
  const [roles, setRoles] = useState<PresetRoleConfig[]>([]);
  const [hasUserEditedRoles, setHasUserEditedRoles] = useState(false);
  const [rooms, setRooms] = useState<PresetRoomConfig[]>([]);
  const [lockerCount, setLockerCount] = useState<number>(50);
  const [operatingHours, setOperatingHours] = useState<PresetOperatingHoursConfig>({
    day_type: 'WEEKDAY',
    start_time: '13:00',
    end_time: '19:00',
    slot_minutes: 30,
  });

  const customerTerm = activePreset?.terms?.customer || '회원/고객';
  const instructorTerm = activePreset?.terms?.instructor || '담당자/직원';
  const spaceTerm =
    activePreset?.terms?.space ||
    activePreset?.resourceTypes?.[0]?.name ||
    '공간/시설';

  const needsLocker = useMemo(() => {
    return (
      activePreset?.facilities?.needsLocker ??
      (activePreset?.capabilities ?? []).includes('locker')
    );
  }, [activePreset]);

  const needsSpace = useMemo(() => {
    return (
      (activePreset?.capabilities ?? []).some((c) =>
        ['seat_room', 'booking', 'resources', 'space_turnaround', 'seat_timer_billing'].includes(c)
      ) ||
      Boolean(activePreset?.resourceTypes && activePreset.resourceTypes.length > 0) ||
      rooms.length > 0
    );
  }, [activePreset, rooms.length]);

  // 직급 / 룸 인라인 추가 상태
  const [addingRole, setAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(1);

  // 동적 질문 필드 목록
  const [dynamicQuestions, setDynamicQuestions] = useState<IndustryQuestionField[]>([]);

  // 맞춤 도구 세트 선택 상태
  const [selectedToolSetIds, setSelectedToolSetIds] = useState<OperationToolSetId[]>([]);

  // AI 프리셋 진단 추천 상태
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState<RecommendationResult | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  // 세부 커스텀 (직급, 룸, 운영시간, 도구세트) 접힘/펼침 상태
  const [isAdvancedCustomOpen, setIsAdvancedCustomOpen] = useState(false);
  // [자유 커스텀 모드] 사장님이 직접 선택한 도구 목록
  const [customCapabilities, setCustomCapabilities] = useState<string[]>([
    'attendance',
    'booking',
    'passes',
    'billing_invoicing',
  ]);

  // 기업/제조업 다중 부서 스코프 상태 (소상공인은 Auto-Skip)
  const isEnterpriseOrManufacturing = useMemo(() => {
    const cat = activePreset?.category;
    const id = selectedIndustry.toLowerCase();
    return (
      cat === 'manufacturing' ||
      cat === 'enterprise' ||
      id.includes('enterprise') ||
      id.includes('manufacturing') ||
      id.includes('plant_ops') ||
      id.includes('corp') ||
      id === 'iso_ims_enterprise' ||
      id === 'iso_human_capital' ||
      id === 'rnd_lab_management' ||
      id === 'general_enterprise' ||
      id === 'manufacturing_light'
    );
  }, [activePreset, selectedIndustry]);

  const [enableDepartments, setEnableDepartments] = useState<boolean>(true);
  const [departments, setDepartments] = useState<Array<{ name: string; code?: string }>>([
    { name: '생산라인', code: 'PROD' },
    { name: '연구개발팀', code: 'RND' },
    { name: '총무/운영팀', code: 'GA' },
  ]);
  const [newDeptName, setNewDeptName] = useState('');

  const handleAddDepartment = () => {
    const name = newDeptName.trim();
    if (!name) return;
    if (departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      setGeneralError('이미 등록된 부서명입니다.');
      return;
    }
    setDepartments((prev) => [...prev, { name }]);
    setNewDeptName('');
  };

  const handleRemoveDepartment = (index: number) => {
    setDepartments((prev) => prev.filter((_, i) => i !== index));
  };

  // 인사팀 CEO 변경/소유권 이전 대행 권한 부여 여부 초기 질문 상태 (기본값: false, 명시적 승인 필요)
  const [grantHrCeoTransferPerm, setGrantHrCeoTransferPerm] = useState<boolean>(false);

  // Refine / React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<QuickSetupFormData>({
    defaultValues: {
      name: '',
      industry: 'piano',
    },
  });

  // 업종 선택 시 추천값 자동 주입 (Pre-fill)
  const applyIndustryDefaults = (industry: string) => {
    if (industry !== 'custom' && !isPresetVisibleInMoa(industry)) {
      setGeneralError('해당 프리셋은 moa 앱에서 선택할 수 없습니다.');
      return;
    }
    setSelectedIndustry(industry);
    setValue('industry', industry);
    setGeneralError(null);

    const defaults = getStandardPresetsForIndustry(industry);
    setRoles(normalizeRankOrders(defaults.roles));
    setHasUserEditedRoles(false);
    setRooms(defaults.rooms ? [...defaults.rooms] : []);
    if (defaults.locker_count !== undefined) {
      setLockerCount(defaults.locker_count);
    }
    setOperatingHours({ ...defaults.operating_hours });

    const questions = getQuestionsForIndustry(industry);
    setDynamicQuestions(questions);

    // 업종별 추천 맞춤 도구 세트 자동 체크
    const recommendedSets = getRecommendedToolSetsForPreset(industry);
    setSelectedToolSetIds(recommendedSets);

    // 질문 기본값도 폼에 주입
    for (const q of questions) {
      setValue(q.id, q.defaultValue);
    }
  };

  // AI 프리셋 진단 실행
  const handleRunAiRecommendation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiAnalyzing(true);
    setIsAiPanelOpen(true);
    setTimeout(() => {
      const result = recommendIndustryPreset(aiQuery);
      if (
        result.topRecommendation &&
        (!isPresetVisibleInMoa(result.topRecommendation.presetId))
      ) {
        result.topRecommendation = null;
      }
      result.alternativeRecommendations = result.alternativeRecommendations.filter(
        (alt) => isPresetVisibleInMoa(alt.presetId)
      );
      setAiResult(result);
      setIsAiAnalyzing(false);

      if (result.topRecommendation) {
        applyIndustryDefaults(result.topRecommendation.presetId);
      }
    }, 200);
  };

  const handleToggleToolSetOption = (setId: OperationToolSetId) => {
    setSelectedToolSetIds((prev) =>
      prev.includes(setId) ? prev.filter((id) => id !== setId) : [...prev, setId]
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialPreset = params.get('industry') || params.get('preset') || 'piano';
    applyIndustryDefaults(initialPreset);
  }, []);

  // 직급 조작
  const handleRemoveRole = (index: number) => {
    setHasUserEditedRoles(true);
    setRoles((prev) => normalizeRankOrders(prev.filter((_, i) => i !== index)));
  };

  const handleMoveRole = (index: number, direction: 'up' | 'down') => {
    setHasUserEditedRoles(true);
    setRoles((prev) => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return normalizeRankOrders(next);
    });
  };

  const handleAddRole = () => {
    const roleName = newRoleName.trim();
    if (!roleName) return;
    if (roles.some((r) => r.name.toLowerCase() === roleName.toLowerCase())) {
      setGeneralError('이미 등록된 직급명입니다.');
      return;
    }
    setHasUserEditedRoles(true);
    setRoles((prev) =>
      normalizeRankOrders([
        ...prev,
        {
          name: roleName,
          rank_order: (prev.length + 1) * 100,
          permissions: ['attendance:checkin'],
        },
      ])
    );
    setNewRoleName('');
    setAddingRole(false);
    setGeneralError(null);
  };

  // 룸 조작
  const handleRemoveRoom = (index: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddRoom = () => {
    const roomName = newRoomName.trim();
    if (!roomName) return;
    if (rooms.some((r) => r.name.toLowerCase() === roomName.toLowerCase())) {
      setGeneralError('이미 등록된 공간/룸 이름입니다.');
      return;
    }
    setRooms((prev) => [
      ...prev,
      {
        name: roomName,
        capacity: newRoomCapacity || 1,
      },
    ]);
    setNewRoomName('');
    setNewRoomCapacity(1);
    setAddingRoom(false);
    setGeneralError(null);
  };

  // 1회 원자적 DB 생성 RPC 호출
  const onSubmit = async (data: QuickSetupFormData) => {
    const trimmedName = data.name?.trim() || '';
    if (!trimmedName || trimmedName.length < 2) {
      setError('name', { message: '사업장 상호명을 공백 제외 2자 이상 입력해 주세요.' });
      return;
    }

    if (roles.length === 0) {
      setGeneralError('사업장 운영을 위해 최소 1개 이상의 직급(예: 대표, 원장, 사장 등)이 필요합니다.');
      return;
    }

    if (
      selectedIndustry !== 'custom' &&
      !isPresetVisibleInMoa(selectedIndustry)
    ) {
      setGeneralError('해당 프리셋은 moa 앱에서 선택할 수 없습니다.');
      return;
    }

    setSubmitting(true);
    setGeneralError(null);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error('데이터베이스 서비스에 연결할 수 없습니다. 네트워크 연결 또는 환경 설정을 확인해 주세요.');
      }

      // 선택된 맞춤 세트로부터 필요한 추가 Capability 자동 계산
      const presetCaps = (activePreset?.capabilities ?? []) as CapabilityId[];
      const activationResult = resolveToolSetActivation(selectedToolSetIds, presetCaps);
      const additionalCaps = activationResult.nextCapabilities.filter(
        (id) => !presetCaps.includes(id as CapabilityId)
      );

      const activeCapabilitiesPayload =
        selectedIndustry === 'custom'
          ? Array.from(new Set([...customCapabilities, ...additionalCaps]))
          : additionalCaps;

      const effectiveRoles = roles.map((r) => {
        if (
          grantHrCeoTransferPerm &&
          (r.name.includes('총무') || r.name.includes('인사') || r.name.includes('관리') || r.name.includes('매니저'))
        ) {
          const perms = Array.isArray(r.permissions) ? [...r.permissions] : [];
          if (!perms.includes('ownership:transfer')) {
            perms.push('ownership:transfer');
          }
          return { ...r, permissions: perms };
        }
        return r;
      });

      const basePayload = buildPresetPayload(selectedIndustry, {
        ...data,
        name: trimmedName,
        roles: effectiveRoles,
        rooms: needsSpace ? rooms : (rooms.length > 0 ? rooms : undefined),
        locker_count: needsLocker ? lockerCount : undefined,
        operating_hours: operatingHours,
        active_capabilities: activeCapabilitiesPayload,
      });
      const payload = {
        ...basePayload,
        custom_terms: activePreset?.terms ? {
          'term.customer': activePreset.terms.customer,
          'term.instructor': activePreset.terms.instructor,
          'term.space': activePreset.terms.space,
          'term.pass': activePreset.terms.pass,
          'term.fee': activePreset.terms.fee,
          'term.lesson': activePreset.terms.lesson,
        } : undefined,
        ...mergeOpsRuntimeSettings((basePayload as Record<string, unknown>) ?? {}, {
          turnaround_buffer_minutes:
            Number((data as { turnaround_buffer_minutes?: number }).turnaround_buffer_minutes) ||
            activePreset?.facilities?.turnaroundBufferMinutes ||
            15,
          seat_capacity_default: rooms[0]?.capacity || 1,
          require_cleaning_checklist: true,
        }),
        org_chart_enabled:
          activePreset?.defaultSettings?.org_chart_enabled === true ||
          (shouldAskDepartmentSetup(selectedIndustry, activePreset?.category) && setupDepartments.length > 0),
        setup_departments: shouldAskDepartmentSetup(selectedIndustry, activePreset?.category) ? setupDepartments : [],
      };

      const { data: rpcResult, error } = await getCoreClient().rpc(
        'create_organization_with_preset',
        {
          p_org_name: trimmedName,
          p_industry: selectedIndustry,
          p_custom_config: payload as any,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      const result = rpcResult as any;
      if (!result?.success || !result?.organization_id) {
        throw new Error('사업장 생성 결과가 올바르지 않습니다.');
      }

      // 기업/제조업 프리셋: 다중 부서 동시 인서트 (소상공인은 Auto-Skip)
      if (isEnterpriseOrManufacturing && enableDepartments && departments.length > 0) {
        try {
          await createInitialDepartments(result.organization_id, departments);
        } catch {
          // 부서 인서트 실패 시 기본 사업장 생성은 유지 (Graceful fallback)
        }
      }

      // 테넌트 즉시 전환 및 워크스페이스 이동
      await switchTenant(result.organization_id);
      navigate('/workspace');
    } catch (err: unknown) {
      const applied = applyDomainErrorToForm(err, setError, 'name');
      if (!applied) {
        setGeneralError(
          err instanceof Error ? err.message : '사업장 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* 상단 타이틀 */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>10초 만에 끝나는 원자적 셋업</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            신규 사업장 맞춤 온보딩
          </h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            업종만 선택하면 최적화된 직급, 룸/락커 공간, 운영 시간표가 자동 채워집니다.
            모든 설정은 언제든 수정 가능합니다.
          </p>
        </div>

        {generalError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-700 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* AI 기반 사업장 맞춤 추천 섹션 (경량화 & 접이식 컴팩트 카드) */}
          <div className="bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/90 text-slate-800 rounded-3xl shadow-xs border border-indigo-100 overflow-hidden transition-all">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>내 매장에 딱 맞는 업종이 고민되시나요?</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      AI 스마트 추천
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    매장 특징이나 제공 서비스를 자유롭게 적어주시면 가장 알맞은 도구와 운영 방식을 제안해 드립니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-600 transition flex items-center gap-1.5 shrink-0 shadow-2xs"
              >
                <span>{isAiPanelOpen ? '추천창 닫기' : '✨ AI에게 추천받기'}</span>
                {isAiPanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* 펼쳐졌을 때만 입력창 및 결과 표시 */}
            {isAiPanelOpen && (
              <div className="px-4 pb-5 sm:px-5 space-y-4 border-t border-indigo-100 pt-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRunAiRecommendation();
                        }
                      }}
                      placeholder="예: 판교에서 20명 규모 성인 피아노 학원을 운영하고 연습실 대여와 주차 등록이 필요해요"
                      className="w-full h-11 pl-4 pr-10 rounded-xl bg-white border border-indigo-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition shadow-2xs"
                    />
                    {aiQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setAiQuery('');
                          setAiResult(null);
                        }}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunAiRecommendation()}
                    disabled={isAiAnalyzing || !aiQuery.trim()}
                    className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 min-h-[44px]"
                  >
                    {isAiAnalyzing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isAiAnalyzing ? '분석 중...' : '추천 진단하기'}</span>
                  </button>
                </div>

                {/* AI 추천 결과 카드 */}
                {aiResult?.topRecommendation && (
                  <div className="bg-indigo-50/70 border border-indigo-200/80 p-4 rounded-2xl space-y-3 animate-in fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-100">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs text-slate-500">추천 1순위:</span>
                        <span className="text-sm font-bold text-slate-900">
                          {aiResult.topRecommendation.presetName}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          일치도 {aiResult.topRecommendation.score}%
                        </span>
                      </div>
                      <span className="text-xs text-indigo-700 font-medium">
                        ✓ 추천 설정이 아래 폼에 자동 적용되었습니다
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {aiResult.topRecommendation.explanation}
                    </p>

                    {/* 추가 추천 Add-on 배지 */}
                    {aiResult.topRecommendation.recommendedAddons.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-600 font-semibold">
                          함께 추천하는 [매장 도구]:
                        </span>
                        {aiResult.topRecommendation.recommendedAddons.map((addon) => (
                          <span
                            key={addon.capabilityId}
                            className="text-xs px-2.5 py-1 rounded-lg bg-white text-indigo-700 border border-indigo-200 flex items-center gap-1.5 shadow-2xs"
                            title={addon.reason}
                          >
                            <Tag className="w-3 h-3 text-indigo-500" />
                            <span>{addon.name}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 대안 추천 */}
                    {aiResult.alternativeRecommendations.length > 0 && (
                      <div className="pt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span>다른 후보:</span>
                        {aiResult.alternativeRecommendations.map((alt) => (
                          <button
                            key={alt.presetId}
                            type="button"
                            onClick={() => applyIndustryDefaults(alt.presetId)}
                            className="underline text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            {alt.presetName} ({alt.score}%)
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 1: 기본 사업장 정보 & 업종 선택 */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                사업장 (상호명) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register('name', {
                    required: '사업장 상호명을 입력해주세요.',
                    validate: (v) =>
                      v.trim().length >= 2 || '상호명은 공백을 제외하고 2자 이상 입력해 주세요.',
                  })}
                  placeholder="예: 모아 피아노 스튜디오, 청담 사우나, 바른 필라테스"
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">
                  {errors.name.message as string}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                업종 선택 (추천 프리셋)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {INDUSTRY_CARDS.map((card) => {
                  const isSelected = selectedIndustry === card.id;
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => applyIndustryDefaults(card.id)}
                      className={`relative p-5 text-left rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {card.badge}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">
                          {card.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {card.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 40개 전체 업종 토글 & 브라우저 */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCatalogOpen(!isCatalogOpen)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition text-sm font-semibold text-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    <span>전체 업종 프리셋 카탈로그 ({allPresets.length}개 업종)</span>
                  </div>
                  {isCatalogOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {isCatalogOpen && (
                  <div className="mt-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3.5 animate-fade-in">
                    {/* 검색창 */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="업종명 또는 키워드로 검색 (예: 태권도, 네일, 골프, 스터디카페, 세차장...)"
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>

                    {/* 카테고리 필터 탭 */}
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_TABS.map((tab) => {
                        const TabIcon = (tab as any).icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedCategory(tab.id)}
                            className={`text-xs px-3 py-1 rounded-full font-medium transition inline-flex items-center gap-1.5 ${
                              selectedCategory === tab.id
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* 업종 카드 그리드 */}
                    <div className="max-h-72 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {filteredPresets.map((preset) => {
                        const isSelected = selectedIndustry === preset.id;
                        const isManufacturing = preset.category === 'manufacturing';
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              applyIndustryDefaults(preset.id);
                            }}
                            className={`p-3 text-left rounded-xl border transition flex flex-col justify-between ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="text-xs font-bold text-slate-900 inline-flex items-center gap-1.5">
                                {isManufacturing && <Factory className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                {preset.name}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-sm shrink-0 font-medium ${
                                  isManufacturing
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isManufacturing ? '제조·가공' : preset.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                              {preset.description}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {preset.capabilities.slice(0, 3).map((cap) => (
                                <span
                                  key={cap}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                                >
                                  {formatCapabilityLabel(cap)}
                                </span>
                              ))}
                              {preset.capabilities.length > 3 && (
                                <span className="text-[9px] text-slate-400">
                                  +{preset.capabilities.length - 3}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <OrganizationOnboardingCard
                presetId={selectedIndustry}
                category={activePreset?.category}
                departments={setupDepartments}
                onChange={setSetupDepartments}
              />

              {/* 선택된 업종 및 활성화 Capability 요약 배너 */}
              <div className="mt-4 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                      현재 선택: {activePreset?.name || (selectedIndustry === 'custom' ? '직접 설정' : selectedIndustry)}
                    </span>
                    {activePreset?.readinessLevel && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        {activePreset.readinessLevel === 'verified'
                          ? '운영 검증'
                          : activePreset.readinessLevel === 'basic_ui'
                          ? '기본 UI 지원'
                          : activePreset.readinessLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    {activePreset?.description || '사용자 정의 커스텀 설정으로 진행합니다.'}
                  </p>
                </div>
                {activePreset?.capabilities && activePreset.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:max-w-md">
                    {activePreset.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 shadow-2xs"
                      >
                        <Tag className="w-2.5 h-2.5 text-indigo-500" />
                        {formatCapabilityLabel(cap)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* [자유 커스텀 모드] 카테고리별 매장 운영 도구 직접 선택 체크박스 리스트 */}
              {selectedIndustry === 'custom' && (
                <div className="mt-4 p-6 rounded-2xl bg-white border-2 border-indigo-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-base font-bold text-slate-900">
                          운영 도구 직접 선택
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        매장 운영에 필요한 기능을 카테고리별로 선택하세요.
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                      {customCapabilities.length}개 도구 선택됨
                    </span>
                  </div>

                  <div className="space-y-5">
                    {CUSTOM_MODE_CATEGORIES.map((cat) => (
                      <div key={cat.categoryName} className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                            <span>{cat.categoryName}</span>
                          </h4>
                          <span className="text-[11px] text-slate-400">{cat.description}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {cat.tools.map((tool) => {
                            const checked = customCapabilities.includes(tool.id);
                            return (
                              <label
                                key={tool.id}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                                  checked
                                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCustomCapabilities((prev) => [...prev, tool.id]);
                                    } else {
                                      setCustomCapabilities((prev) =>
                                        prev.filter((id) => id !== tool.id)
                                      );
                                    }
                                  }}
                                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                                    <span>{tool.label}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                                    {tool.desc}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* 기업/제조업 전용: 다중 부서/현장 분리 카드 (소상공인은 Auto-Skip) */}
          {isEnterpriseOrManufacturing && (
            <div
              data-testid="department-setup-card"
              className="bg-white p-6 sm:p-8 rounded-3xl border border-indigo-200/80 shadow-xs space-y-5 animate-in fade-in"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Factory className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">다중 부서/현장 분리 (Department Scope)</h2>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        기업/제조 전용
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      생산라인, 연구소, 총무팀 등 부서별로 데이터와 자원 스코프를 격리하여 관리합니다.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
                  <input
                    type="checkbox"
                    checked={enableDepartments}
                    onChange={(e) => setEnableDepartments(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">부서 격리 활성화</span>
                </label>
              </div>

              {enableDepartments && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {departments.map((dept, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-xs font-semibold text-indigo-800 border border-indigo-100"
                      >
                        <span>{dept.name}</span>
                        {dept.code && <span className="text-[10px] text-indigo-500 font-mono">({dept.code})</span>}
                        {departments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDepartment(index)}
                            className="p-0.5 hover:bg-indigo-100 rounded-full text-indigo-500 hover:text-indigo-800"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="신규 부서/라인명 입력 (예: 조립라인, 품질관리팀)"
                      className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDepartment();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddDepartment}
                      className="px-4 h-10 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
                    >
                      부서 추가
                    </button>
                  </div>
                </div>
              )}

              {/* 인사팀 CEO 소유권 이전 권한 위임 초기 질문 */}
              <div className="pt-3 border-t border-indigo-100">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-950">
                          인사/총무팀에 대표이사(CEO) 변경 대행 권한을 위임하시겠습니까?
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-800">
                          선택 질문
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        {grantHrCeoTransferPerm
                          ? '✅ 위임 활성화: 인사팀 관리자가 주총/이사회 결의 및 등기 절차에 따라 대표이사 변경 및 소유권 이관을 대행할 수 있습니다. (전임/신임 세션 즉시 만료 및 불변 감사 로그 적재)'
                          : '🔒 안전 기본값: 대표이사 본인만 소유권을 이전할 수 있으며, 인사팀은 일반 직원 직급 배정/회수 권한만 가집니다.'}
                      </p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={grantHrCeoTransferPerm}
                        onChange={(e) => setGrantHrCeoTransferPerm(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs font-bold text-amber-900">
                        {grantHrCeoTransferPerm ? '위임 허용됨' : '위임 안 함 (권장)'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 완료 & 검토 (2단계 점진적 정보 공개 위자드) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-100 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                      {activePreset ? `${activePreset.name} 추천 설정 준비 완료` : '맞춤 매장 설정 준비 완료'}
                    </h2>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      10초 셋업
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    업종 표준 직급, 공간, 운영시간 및 추천 [매장 도구]가 자동으로 최적 세팅되었습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 빠른 검토 요약 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>직급 ({roles.length}개)</span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {roles.map((r) => r.name).join(', ') || '기본 직급'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{needsLocker && !needsSpace ? '사물함' : spaceTerm}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {needsLocker && !needsSpace
                    ? `락커 ${lockerCount}개`
                    : rooms.length > 0
                    ? `${rooms.map((r) => r.name).slice(0, 3).join(', ')}${rooms.length > 3 ? ' 외' : ''}`
                    : needsLocker
                    ? `락커 ${lockerCount}개`
                    : '기본 설정 적용'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>운영 시간</span>
                </div>
                <p className="text-xs text-slate-500">
                  {operatingHours.start_time} ~ {operatingHours.end_time} ({operatingHours.slot_minutes}분 단위)
                </p>
              </div>
            </div>

            {/* 메인 원클릭 시작 버튼 */}
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 transition disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>맞춤 매장 및 리소스 생성 중...</span>
                  </>
                ) : (
                  <>
                    <span>이 추천 설정으로 바로 시작하기 (10초 완료)</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-slate-400 mt-2.5">
                단 1회의 원자적 트랜잭션으로 사업장, 소유자 권한, 직급, 룸/락커, 운영시간이 구축됩니다.
              </p>
            </div>

            {/* 세부 커스텀 아코디언 토글 */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdvancedCustomOpen(!isAdvancedCustomOpen)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition text-xs sm:text-sm font-semibold text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-indigo-600" />
                  <span>매장 세부 설정 직접 조정하기 (직급·공간·운영시간·도구)</span>
                </div>
                {isAdvancedCustomOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>

            {/* 아코디언 접힘/펼침 세부 설정 영역 */}
            {isAdvancedCustomOpen && (
              <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
                {/* [우리 매장 맞춤 세트] */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-900">
                          [추천 운영 기능] 세트 선택
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        필요한 도구 세트를 자유롭게 추가·해제하세요.
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {selectedToolSetIds.length}개 세트 선택됨
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {OPERATION_TOOL_SETS.map((set) => {
                      const isSelected = selectedToolSetIds.includes(set.id);
                      const isRecommended = set.recommendedFor.includes('*') || set.recommendedFor.includes(selectedIndustry);

                      return (
                        <button
                          key={set.id}
                          type="button"
                          onClick={() => handleToggleToolSetOption(set.id)}
                          className={`p-3.5 text-left rounded-2xl border-2 transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/30 shadow-2xs'
                              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <span className="font-bold text-xs sm:text-sm text-slate-900">
                                {set.displayName}
                              </span>
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-white border-slate-300'
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed mb-2.5">
                              {set.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isRecommended && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  추천
                                </span>
                              )}
                              {set.badge && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                  {set.badge}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {set.capabilities.slice(0, 3).map((capId) => (
                                <span
                                  key={capId}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200/80"
                                >
                                  {formatCapabilityLabel(capId)}
                                </span>
                              ))}
                              {set.capabilities.length > 3 && (
                                <span className="text-[10px] text-slate-400">
                                  +{set.capabilities.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

            {/* A. 직급 구성 칩 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>직급 및 계급도 ({roles.length}개)</span>
                </label>
                {!addingRole && (
                  <button
                    type="button"
                    onClick={() => setAddingRole(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>직급 추가</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {roles.map((r, idx) => (
                  <div
                    key={`${r.name}-${idx}`}
                    className="h-9 pl-2.5 pr-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold flex items-center space-x-1.5 border border-slate-200/60"
                  >
                    <span className="text-[10px] font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded shadow-2xs">
                      #{idx + 1}
                    </span>
                    <span>{r.name}</span>
                    {idx === 0 && (
                      <span className="text-[9px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                        최종결재
                      </span>
                    )}
                    {idx === roles.length - 1 && roles.length > 1 && (
                      <span className="text-[9px] font-medium bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded">
                        일반실무
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">({r.rank_order})</span>
                    <div className="flex items-center space-x-0.5 ml-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveRole(idx, 'up')}
                        className="w-4 h-4 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 flex items-center justify-center transition"
                        title="순서 올리기"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === roles.length - 1}
                        onClick={() => handleMoveRole(idx, 'down')}
                        className="w-4 h-4 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 flex items-center justify-center transition"
                        title="순서 내리기"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(idx)}
                      className="w-5 h-5 rounded-md hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 flex items-center justify-center transition ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {addingRole && (
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="신규 직급명"
                      className="h-9 px-3 rounded-xl border border-indigo-400 text-xs font-medium focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddRole}
                      className="h-9 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingRole(false)}
                      className="h-9 px-2 text-slate-400 hover:text-slate-600"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* B. 공간 (${spaceTerm}) 구성 */}
            {needsSpace && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{spaceTerm} 목록 ({rooms.length}개)</span>
                  </label>
                  {!addingRoom && (
                    <button
                      type="button"
                      onClick={() => setAddingRoom(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{spaceTerm} 추가</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {rooms.map((rm, idx) => (
                    <div
                      key={`${rm.name}-${idx}`}
                      className="h-9 pl-3 pr-2 rounded-xl bg-indigo-50/70 text-indigo-900 text-xs font-semibold flex items-center space-x-1.5 border border-indigo-200/60"
                    >
                      <span>{rm.name}</span>
                      {rm.capacity && (
                        <span className="text-[10px] text-indigo-500">
                          ({rm.capacity}인)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveRoom(idx)}
                        className="w-5 h-5 rounded-md hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 flex items-center justify-center transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {addingRoom && (
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder={`${spaceTerm}명`}
                        className="h-9 px-3 rounded-xl border border-indigo-400 text-xs font-medium focus:outline-none"
                        autoFocus
                      />
                      <input
                        type="number"
                        min="1"
                        value={newRoomCapacity}
                        onChange={(e) => setNewRoomCapacity(Number(e.target.value) || 1)}
                        className="h-9 w-16 px-2 rounded-xl border border-slate-300 text-xs text-center"
                        title="수용 정원"
                      />
                      <button
                        type="button"
                        onClick={handleAddRoom}
                        className="h-9 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                      >
                        추가
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingRoom(false)}
                        className="h-9 px-2 text-slate-400 hover:text-slate-600"
                      >
                        취소
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* C. 락커/사물함 수량 구성 */}
            {needsLocker && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {selectedIndustry === 'sauna' ? '남탕/여탕 락커 수량 (개)' : '사물함/락커 수량 (개)'}
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={lockerCount}
                    onChange={(e) => setLockerCount(Number(e.target.value) || 1)}
                    className="h-12 w-32 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <p className="text-xs text-slate-500">
                    {selectedIndustry === 'sauna'
                      ? `남탕 1~${lockerCount}번, 여탕 1~${lockerCount}번 사물함이 자동 벌크 생성됩니다.`
                      : `1번부터 ${lockerCount}번까지 락커가 자동 생성됩니다.`}
                  </p>
                </div>
              </div>
            )}

            {/* D. 운영 및 상담 시간 */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>운영 / 상담 시간대</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">시작 시각</span>
                  <input
                    type="time"
                    value={operatingHours.start_time}
                    onChange={(e) =>
                      setOperatingHours((prev) => ({ ...prev, start_time: e.target.value }))
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">종료 시각</span>
                  <input
                    type="time"
                    value={operatingHours.end_time}
                    onChange={(e) =>
                      setOperatingHours((prev) => ({ ...prev, end_time: e.target.value }))
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">시간 간격 (슬롯)</span>
                  <select
                    value={operatingHours.slot_minutes}
                    onChange={(e) =>
                      setOperatingHours((prev) => ({
                        ...prev,
                        slot_minutes: Number(e.target.value) || 30,
                      }))
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value={30}>30분 단위</option>
                    <option value={50}>50분 단위</option>
                    <option value={60}>60분 (1시간) 단위</option>
                    <option value={90}>90분 단위</option>
                  </select>
                </div>
              </div>
            </div>

            {/* E. Capability 동적 질문 필드 (선언형 조립) */}
            {dynamicQuestions.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>세부 Capability 정책 (선택 조정)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dynamicQuestions.map((q) => (
                    <div key={q.id} className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        {q.label}
                      </label>
                      {q.type === 'select' && q.options ? (
                        <select
                          {...register(q.id)}
                          className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                          {q.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : q.type === 'boolean' ? (
                        <div className="flex items-center space-x-2 pt-2">
                          <input
                            type="checkbox"
                            id={q.id}
                            {...register(q.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <label htmlFor={q.id} className="text-xs text-slate-600 cursor-pointer">
                            {q.description || '활성화'}
                          </label>
                        </div>
                      ) : q.type === 'number' ? (
                        <input
                          type="number"
                          {...register(q.id, { valueAsNumber: true })}
                          placeholder={q.placeholder}
                          className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      ) : (
                        <input
                          type="text"
                          {...register(q.id)}
                          placeholder={q.placeholder}
                          className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      )}
                      {q.description && q.type !== 'boolean' && (
                        <p className="text-[11px] text-slate-400">{q.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
              </div>
            )}
          </div>

          {/* Step 3: 제출 버튼 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>원자적 사업장 및 리소스 생성 중...</span>
                </>
              ) : (
                <>
                  <span>이 설정으로 10초 만에 시작하기</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              단 1회의 원자적 트랜잭션으로 사업장, 소유자 권한, 직급, 룸/락커, 운영시간이 구축됩니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
