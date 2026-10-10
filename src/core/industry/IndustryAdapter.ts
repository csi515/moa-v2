import { getActiveIndustryContext, type IndustryContext } from './contextResolver';
import type {
  IndustryPluginManifest,
  IndustryRosterListConfig,
  IndustryRoomConfig,
  IndustryAttendanceCopy,
} from './pluginTypes';
import type { BookingIndustryAdapter } from './bookingIndustryAdapter';
import { getIndustryPlugin, getInstalledIndustryPlugin } from './registry';
import { buildGenericPluginManifest } from './genericPlugin';
import { getIndustryDefinition, INDUSTRY_DEFINITIONS } from './catalog';
import { isBlankIndustryInput, type IndustryType } from './types';
import type {
  FacilityCapabilityConfig,
  BillingCapabilityConfig,
  AttendanceCapabilityConfig,
  PortalCapabilityConfig,
  PresetManifest,
} from '@/core/presets/types';

/**
 * 정형화된 비즈니스/UI 기능 키 (Feature Flags)
 * 파편화된 개별 boolean 플래그들을 단일 인터페이스로 수렴
 */
export type IndustryFeatureKey =
  | 'class_based_schedule'
  | 'deposit'
  | 'textbooks_link'
  | 'pin_side_effects'
  | 'makeup_list'
  | 'withdrawal_exit_label'
  | 'attendance_with_pass'
  | 'practice_room_tab'
  | 'customer_points'
  | 'adult_practice_guide'
  | 'staff_practice_guide'
  | 'linked_billing_income'
  | 'performance_videos'
  | 'song_stamps'
  | 'public_landing_adult_first'
  | 'school_fields'
  | 'pickup_fields';

export type IndustryLabelKey =
  | 'place'
  | 'customer'
  | 'owner'
  | 'fee'
  | 'level';

/**
 * 정형화된 업종 플러그인 어댑터 계약 (Contract Interface)
 * 업종 설정 누락 또는 미지원 업종 입력 시에도 DefaultFallbackPluginAdapter를 통해
 * 안전하게 동작함을 보장한다.
 */
export interface IndustryPluginAdapter {
  readonly id: string;
  readonly manifest: IndustryPluginManifest;

  /** 표준 어휘/라벨 조회 */
  getLabel(key: IndustryLabelKey, fallback?: string): string;

  /** 기능 지원 여부 조회 (파편화된 boolean 플래그 단일화) */
  hasFeature(feature: IndustryFeatureKey): boolean;

  /** 비즈니스 규칙 및 추가 설정값 조회 */
  getRule<T = unknown>(ruleKey: string, defaultValue?: T): T;

  /** 예약 서브 어댑터 */
  readonly bookingAdapter?: BookingIndustryAdapter;

  /** 출결 특수 안내 문구 */
  readonly attendanceCopy?: IndustryAttendanceCopy;

  /** 명단 목록 설정 */
  readonly rosterConfig: IndustryRosterListConfig;

  /** 룸/공간 설정 */
  readonly roomConfig: IndustryRoomConfig;

  /** 도메인 기능 팩 (Capability Pack) 설정 조회 */
  getFacilityConfig(): FacilityCapabilityConfig;
  getBillingConfig(): BillingCapabilityConfig;
  getAttendanceConfig(): AttendanceCapabilityConfig;
  getPortalConfig(): PortalCapabilityConfig;
  getPresetManifest(): PresetManifest;
}

/**
 * 기본 Fallback 어댑터: 업종 정보가 없거나 미지원 업종인 경우 런타임 크래시를 방지
 */
export class DefaultFallbackPluginAdapter implements IndustryPluginAdapter {
  readonly id: string;
  readonly manifest: IndustryPluginManifest;

  constructor(industryId = 'generic', customManifest?: IndustryPluginManifest) {
    this.id = industryId;
    this.manifest =
      customManifest ??
      buildGenericPluginManifest(getIndustryDefinition(industryId) ?? INDUSTRY_DEFINITIONS.academy);
  }

  getLabel(key: IndustryLabelKey, fallback = ''): string {
    switch (key) {
      case 'place':
        return this.manifest.placeLabel ?? fallback ?? '사업장';
      case 'customer':
        return this.manifest.customerLabel ?? fallback ?? '고객';
      case 'owner':
        return this.manifest.ownerLabel ?? fallback ?? '대표';
      case 'fee':
        return this.manifest.feeLabel ?? fallback ?? '이용료';
      case 'level':
        return this.manifest.levelLabel ?? fallback ?? '등급';
      default:
        return fallback;
    }
  }

  hasFeature(feature: IndustryFeatureKey): boolean {
    switch (feature) {
      case 'class_based_schedule':
        return Boolean(this.manifest.usesClassBasedSchedule);
      case 'deposit':
        return Boolean(this.manifest.supportsDeposit);
      case 'textbooks_link':
        return Boolean(this.manifest.showsTextbooksLink);
      case 'pin_side_effects':
        return Boolean(this.manifest.runsPinCheckInSideEffects);
      case 'makeup_list':
        return Boolean(this.manifest.showsMakeupList);
      case 'withdrawal_exit_label':
        return Boolean(this.manifest.usesWithdrawalExitLabel);
      case 'attendance_with_pass':
        return Boolean(this.manifest.savesAttendanceWithPass);
      case 'practice_room_tab':
        return Boolean(this.manifest.showsPracticeRoomTab);
      case 'customer_points':
        return Boolean(this.manifest.showsCustomerPoints);
      case 'adult_practice_guide':
        return Boolean(this.manifest.showsAdultPracticeGuide);
      case 'staff_practice_guide':
        return Boolean(this.manifest.showsStaffPracticeGuide);
      case 'linked_billing_income':
        return Boolean(this.manifest.includesLinkedBillingIncome);
      case 'performance_videos':
        return Boolean(this.manifest.showsPerformanceVideos);
      case 'song_stamps':
        return Boolean(this.manifest.showsSongStamps);
      case 'public_landing_adult_first':
        return Boolean(this.manifest.publicLandingAdultFirst);
      case 'school_fields':
        return Boolean(this.manifest.showSchoolFields);
      case 'pickup_fields':
        return Boolean(this.manifest.showPickupFields);
      default:
        return false;
    }
  }

  getRule<T = unknown>(ruleKey: string, defaultValue?: T): T {
    const val = (this.manifest as any)[ruleKey];
    if (val !== undefined && val !== null) {
      return val as T;
    }
    return defaultValue as T;
  }

  get bookingAdapter(): BookingIndustryAdapter | undefined {
    return this.manifest.bookingAdapter;
  }

  get attendanceCopy(): IndustryAttendanceCopy | undefined {
    return this.manifest.attendanceCopy;
  }

  get rosterConfig(): IndustryRosterListConfig {
    return (
      this.manifest.rosterList ?? {
        searchPlaceholder: undefined,
        filterButtonAriaLabel: '추가 필터',
        showFilterFieldLabels: false,
        staffFilterLabel: undefined,
        controlMinHeight: 36,
        fitAdvancedFilterGrid: false,
        showSessionColumns: false,
        withdrawnLabel: '퇴원',
        filterEmptyUsesSearchHint: false,
      }
    );
  }

  get roomConfig(): IndustryRoomConfig {
    return (
      this.manifest.roomConfig ?? {
        sectionTitle: '공간',
        sectionDescription: '사업장에서 쓰는 공간 이름을 등록해 주세요.',
        defaultPrefix: '공간',
        defaultKind: 'classroom',
        placeholder: '예: 1실',
        allowedKinds: ['classroom', 'practice'],
      }
    );
  }

  getFacilityConfig(): FacilityCapabilityConfig {
    const hasPractice = this.hasFeature('practice_room_tab');
    return {
      enabled: Boolean(this.manifest.roomConfig || hasPractice),
      roomConfig: this.roomConfig,
      features: {
        practiceRoomBooking: hasPractice,
        lockers: false,
      },
    };
  }

  getBillingConfig(): BillingCapabilityConfig {
    return {
      enabled: true,
      feeLabel: this.getLabel('fee'),
      bankAccountPlaceholder: this.manifest.bankAccountPlaceholder,
      supportsDeposit: this.hasFeature('deposit'),
      payrollExpenseCategory: this.manifest.getPayrollExpenseCategory?.() ?? 'salary',
      showsTextbooksLink: this.hasFeature('textbooks_link'),
      displayLinkedIncomeOverview: this.hasFeature('linked_billing_income'),
      getExpenseCategories: this.manifest.getExpenseCategories,
      financeHubNav: this.manifest.financeHubNav,
    };
  }

  getAttendanceConfig(): AttendanceCapabilityConfig {
    const isAppt = Boolean(this.manifest.isAppointment);
    const defaultNoun = this.manifest.id === 'daycare' ? '등하원' : isAppt ? '출입' : '출결';
    return {
      enabled: this.manifest.attendanceDefault !== false,
      recordNoun: this.manifest.attendanceCopy?.recordNoun ?? defaultNoun,
      usesClassBasedSchedule: this.hasFeature('class_based_schedule'),
      passDeductionMode: this.hasFeature('attendance_with_pass') ? 'atomic_rpc' : 'none',
      summaryMetricColor: (this.manifest.attendanceSummaryMetric as any) ?? 'indigo',
      runKioskSideEffects: this.hasFeature('pin_side_effects'),
      attendanceCopy: this.attendanceCopy,
    };
  }

  getPortalConfig(): PortalCapabilityConfig {
    const id = this.manifest.id;
    const portalRoleLabel =
      id === 'daycare'
        ? '보호자 포털'
        : id === 'skin_clinic'
          ? '고객 포털'
          : '학부모 포털';

    return {
      enabled: true,
      portalRoleLabel,
      features: {
        showsMakeupList: this.hasFeature('makeup_list'),
        showsCustomerPoints: this.hasFeature('customer_points'),
        showsPracticeRoomTab: this.hasFeature('practice_room_tab'),
        showsPerformanceVideos: this.hasFeature('performance_videos'),
        showsSongStamps: this.hasFeature('song_stamps'),
        publicLandingAdultFirst: this.hasFeature('public_landing_adult_first'),
      },
    };
  }

  getPresetManifest(): PresetManifest {
    return {
      id: this.id,
      name: this.manifest.option?.label ?? this.id,
      labels: {
        place: this.getLabel('place'),
        customer: this.getLabel('customer'),
        owner: this.getLabel('owner'),
        fee: this.getLabel('fee'),
        level: this.getLabel('level'),
      },
      theme: {
        primaryColor: typeof this.manifest.theme === 'string' ? this.manifest.theme : undefined,
      },
      capabilities: {
        facility: this.getFacilityConfig(),
        billing: this.getBillingConfig(),
        attendance: this.getAttendanceConfig(),
        portal: this.getPortalConfig(),
        booking: {
          enabled: Boolean(this.manifest.isAppointment || this.manifest.bookingAdapter),
          isAppointment: Boolean(this.manifest.isAppointment),
          supportsDeposit: this.hasFeature('deposit'),
          bookingAdapter: this.bookingAdapter,
        },
      },
    };
  }
}

/**
 * 표준 업종 플러그인 어댑터 구현체
 */
export class StandardIndustryPluginAdapter extends DefaultFallbackPluginAdapter {
  constructor(manifest: IndustryPluginManifest) {
    super(manifest.id, manifest);
  }
}

const adapterCache = new Map<string, IndustryPluginAdapter>();

/**
 * 업종 플러그인 어댑터 팩토리 함수 (항상 non-null 어댑터 보장)
 */
export function getIndustryPluginAdapter(
  industry: IndustryType | string | null | undefined
): IndustryPluginAdapter {
  if (isBlankIndustryInput(industry)) {
    const pianoPlugin = getIndustryPlugin('piano');
    return new StandardIndustryPluginAdapter(pianoPlugin);
  }

  const plugin = getIndustryPlugin(industry);
  if (!plugin) {
    return new DefaultFallbackPluginAdapter(String(industry));
  }

  const cached = adapterCache.get(plugin.id);
  if (cached && cached.manifest === plugin) {
    return cached;
  }

  const adapter = new StandardIndustryPluginAdapter(plugin);
  adapterCache.set(plugin.id, adapter);
  return adapter;
}

/**
 * 통합 IndustryAdapter 파사드 클래스 (기존 정적 메서드 호환 및 정형화 어댑터 메서드 제공)
 */
export class IndustryAdapter {
  static getContext(): IndustryContext {
    return getActiveIndustryContext();
  }

  static getManifest<K extends keyof IndustryPluginManifest>(key: K): IndustryPluginManifest[K] {
    const ctx = IndustryAdapter.getContext();
    return ctx.plugin[key];
  }

  static getLabel(labelKey: keyof IndustryContext['labels'], fallback = ''): string {
    const ctx = IndustryAdapter.getContext();
    return ctx.labels[labelKey] ?? fallback;
  }

  /**
   * 정형화된 어댑터 조회 (Fallback 보장)
   */
  static getAdapter(industry?: IndustryType | string | null): IndustryPluginAdapter {
    return getIndustryPluginAdapter(industry ?? IndustryAdapter.getContext().id);
  }

  /**
   * 특정 기능 활성화 여부 조회
   */
  static hasFeature(feature: IndustryFeatureKey, industry?: IndustryType | string | null): boolean {
    return IndustryAdapter.getAdapter(industry).hasFeature(feature);
  }

  /**
   * 특정 라벨 조회
   */
  static resolveLabel(key: IndustryLabelKey, industry?: IndustryType | string | null, fallback = ''): string {
    return IndustryAdapter.getAdapter(industry).getLabel(key, fallback);
  }

  /**
   * 특정 비즈니스 규칙/설정값 조회
   */
  static getRule<T = unknown>(ruleKey: string, defaultValue?: T, industry?: IndustryType | string | null): T {
    return IndustryAdapter.getAdapter(industry).getRule(ruleKey, defaultValue);
  }

  /**
   * 시설/공간 기능 팩 조회
   */
  static getFacilityConfig(industry?: IndustryType | string | null): FacilityCapabilityConfig {
    return IndustryAdapter.getAdapter(industry).getFacilityConfig();
  }

  /**
   * 수납/재무 기능 팩 조회
   */
  static getBillingConfig(industry?: IndustryType | string | null): BillingCapabilityConfig {
    return IndustryAdapter.getAdapter(industry).getBillingConfig();
  }

  /**
   * 출결 기능 팩 조회
   */
  static getAttendanceConfig(industry?: IndustryType | string | null): AttendanceCapabilityConfig {
    return IndustryAdapter.getAdapter(industry).getAttendanceConfig();
  }

  /**
   * 포털 기능 팩 조회
   */
  static getPortalConfig(industry?: IndustryType | string | null): PortalCapabilityConfig {
    return IndustryAdapter.getAdapter(industry).getPortalConfig();
  }

  /**
   * 프리셋 통합 매니페스트 조회
   */
  static getPresetManifest(industry?: IndustryType | string | null): PresetManifest {
    return IndustryAdapter.getAdapter(industry).getPresetManifest();
  }
}

