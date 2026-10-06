import type { I18nProvider } from "@refinedev/core";
import {
  DEFAULT_TERMINOLOGY_DICTIONARY,
  getTerminologyDictionary,
} from "@/core/terminology/dictionaries";
import { translateTerm } from "@/core/terminology/translate";
import type { TerminologyDictionary, TermKey } from "@/core/terminology/types";

export interface I18nProviderOptions {
  /** 기본 로케일 (기본값: "ko") */
  defaultLocale?: string;
  /** 기본 업종 식별자 (예: "piano", "pilates", "skin", "daycare" 등) */
  defaultIndustry?: string | null;
  /** 런타임 활성 업종을 동적으로 조회하는 함수 (선택) */
  getIndustry?: () => string | null | undefined;
}

export interface MoaI18nProvider extends I18nProvider {
  /** 활성 업종을 동적으로 갱신합니다. */
  setIndustry: (industry: string | null | undefined) => void;
  /** 현재 활성 업종 사전을 반환합니다. */
  getCurrentDictionary: () => TerminologyDictionary;
}

/** Refine 표준 UI 한국어 텍스트 매핑 */
const STANDARD_UI_MESSAGES_KO: Record<string, string> = {
  // Buttons
  "buttons.create": "등록",
  "buttons.save": "저장",
  "buttons.delete": "삭제",
  "buttons.edit": "수정",
  "buttons.cancel": "취소",
  "buttons.confirm": "확인",
  "buttons.refresh": "새로고침",
  "buttons.show": "상세보기",
  "buttons.filter": "필터",
  "buttons.clear": "초기화",
  "buttons.actions": "작업",
  "buttons.export": "내보내기",
  "buttons.import": "가져오기",

  // Notifications
  "notifications.success": "성공",
  "notifications.error": "오류",
  "notifications.createSuccess": "성공적으로 등록되었습니다.",
  "notifications.createError": "등록 중 오류가 발생했습니다.",
  "notifications.editSuccess": "성공적으로 수정되었습니다.",
  "notifications.editError": "수정 중 오류가 발생했습니다.",
  "notifications.deleteSuccess": "성공적으로 삭제되었습니다.",
  "notifications.deleteError": "삭제 중 오류가 발생했습니다.",

  // Pages & Status
  "pages.error.404": "페이지를 찾을 수 없습니다.",
  "pages.error.info": "오류가 발생했습니다.",
  "pages.error.backHome": "홈으로 돌아가기",
  "table.actions": "작업",
  "table.noData": "데이터가 없습니다.",
  "tags.clone": "복제",
};

/** Refine 표준 UI 영어 텍스트 폴백 */
const STANDARD_UI_MESSAGES_EN: Record<string, string> = {
  "buttons.create": "Create",
  "buttons.save": "Save",
  "buttons.delete": "Delete",
  "buttons.edit": "Edit",
  "buttons.cancel": "Cancel",
  "buttons.confirm": "Confirm",
  "buttons.refresh": "Refresh",
  "buttons.show": "Show",
  "buttons.filter": "Filter",
  "buttons.clear": "Clear",
  "buttons.actions": "Actions",
  "buttons.export": "Export",
  "buttons.import": "Import",
  "notifications.success": "Success",
  "notifications.error": "Error",
  "notifications.createSuccess": "Successfully created.",
  "notifications.createError": "An error occurred while creating.",
  "notifications.editSuccess": "Successfully updated.",
  "notifications.editError": "An error occurred while updating.",
  "notifications.deleteSuccess": "Successfully deleted.",
  "notifications.deleteError": "An error occurred while deleting.",
  "pages.error.404": "Page not found.",
  "pages.error.info": "An error occurred.",
  "pages.error.backHome": "Back to Home",
  "table.actions": "Actions",
  "table.noData": "No data available.",
};

/** 옵션 보간 치환 함수 ({{key}} 또는 {key}를 options[key]로 치환) */
function interpolate(template: string, options?: Record<string, any>): string {
  if (!options || typeof options !== "object") return template;
  return template.replace(/\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}/g, (match, param) => {
    if (param in options) {
      return String(options[param]);
    }
    return match;
  });
}

/** Refine 리소스 키를 도메인 용어 사전 기반으로 동적 해석 */
function resolveResourceKey(dict: TerminologyDictionary, key: string): string | null {
  switch (key) {
    // 1. customers (학생 / 회원 / 고객 / 원아 / 환자)
    case "resources.customers.name":
      return dict.customer.plural;
    case "resources.customers.titles.list":
      return `${dict.customer.plural} 목록`;
    case "resources.customers.titles.create":
      return `${dict.customer.singular} 등록`;
    case "resources.customers.titles.edit":
      return `${dict.customer.singular} 정보 수정`;
    case "resources.customers.titles.show":
      return `${dict.customer.singular} 상세 정보`;
    case "resources.customers.fields.name":
      return `${dict.customer.singular} 이름`;

    // 2. schedules (수업 / 수련 / 일정 / 예약)
    case "resources.schedules.name":
      return `${dict.schedule.singular} 관리`;
    case "resources.schedules.titles.list":
      return `${dict.schedule.singular} 목록`;
    case "resources.schedules.titles.create":
      return `${dict.schedule.singular} 등록`;

    // 3. tuition_invoices (수강료 / 회비 / 관리비 / 이용료)
    case "resources.tuition_invoices.name":
      return `${dict.billing.fee} 관리`;
    case "resources.tuition_invoices.titles.list":
      return `${dict.billing.fee} 내역`;
    case "resources.tuition_invoices.titles.create":
      return `${dict.billing.fee} 청구`;

    // 4. dashboard
    case "resources.dashboard.name":
      return "대시보드";
    case "resources.dashboard.titles.list":
      return "운영 대시보드";

    default:
      return null;
  }
}

/** TerminologyEngine의 dot-notation 키 해석 */
function resolveTerminologyKey(dict: TerminologyDictionary, key: string): string | null {
  const parts = key.split(".");
  const category = parts[0];
  const validCategories = [
    "customer",
    "contact",
    "staff",
    "service",
    "schedule",
    "billing",
    "facility",
  ];

  if (validCategories.includes(category)) {
    const resolved = translateTerm(dict, key as TermKey);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

/**
 * Refine i18nProvider 인스턴스 팩토리.
 * MOA의 업종별 TerminologyEngine과 Refine의 국제화 인터페이스를 브릿지합니다.
 */
export function createI18nProvider(options: I18nProviderOptions = {}): MoaI18nProvider {
  let currentLocale = options.defaultLocale || "ko";
  let explicitIndustry: string | null | undefined = options.defaultIndustry;

  const resolveCurrentDictionary = (): TerminologyDictionary => {
    const dynamicIndustry = options.getIndustry?.();
    const effectiveIndustry = dynamicIndustry ?? explicitIndustry;
    return getTerminologyDictionary(effectiveIndustry);
  };

  const translate = (key: string, optionsOrParams?: any, defaultMessage?: string): string => {
    // 1. Refine useTranslate는 (key, defaultMessage) 형태의 2인자 호출도 지원
    let opts = optionsOrParams;
    let defMsg = defaultMessage;
    if (typeof optionsOrParams === "string" && defaultMessage === undefined) {
      defMsg = optionsOrParams;
      opts = undefined;
    }

    const dict = resolveCurrentDictionary();

    // 2. Refine 리소스 키 해석 (resources.customers.*, resources.schedules.* 등)
    const resourceResolved = resolveResourceKey(dict, key);
    if (resourceResolved != null) {
      return interpolate(resourceResolved, opts);
    }

    // 3. TerminologyEngine 도메인 키 해석 (customer.singular, billing.fee 등)
    const termResolved = resolveTerminologyKey(dict, key);
    if (termResolved != null) {
      return interpolate(termResolved, opts);
    }

    // 4. 표준 UI 메시지 테이블 (로케일별)
    const uiMessages =
      currentLocale.startsWith("en") ? STANDARD_UI_MESSAGES_EN : STANDARD_UI_MESSAGES_KO;
    if (key in uiMessages) {
      return interpolate(uiMessages[key], opts);
    }

    // 5. 기본 메시지(defaultMessage)가 있는 경우
    if (defMsg != null && defMsg !== "") {
      return interpolate(defMsg, opts);
    }

    // 6. 폴백: 원본 키 반환
    return key;
  };

  const changeLocale = async (locale: string): Promise<void> => {
    currentLocale = locale;
    return Promise.resolve();
  };

  const getLocale = (): string => {
    return currentLocale;
  };

  const setIndustry = (industry: string | null | undefined): void => {
    explicitIndustry = industry;
  };

  return {
    translate,
    changeLocale,
    getLocale,
    setIndustry,
    getCurrentDictionary: resolveCurrentDictionary,
  };
}

/**
 * 기본 싱글톤 i18nProvider 인스턴스.
 * `<Refine i18nProvider={i18nProvider}>`로 바로 주입할 수 있습니다.
 */
export const i18nProvider = createI18nProvider();
