export interface FeatureGuideItem {
  id: string;
  title: string;
  summary: string;
  howTo?: string;
}

export interface FeatureGuideSection {
  id: string;
  title: string;
  description: string;
  items: FeatureGuideItem[];
}

/** 업종 공통 — 고객(원생/회원/원아)·보호자 섹션 */
export function buildCustomerSection(options: {
  title: string;
  description: string;
  customerItem: FeatureGuideItem;
  parentItem: FeatureGuideItem;
}): FeatureGuideSection {
  return {
    id: 'customers',
    title: options.title,
    description: options.description,
    items: [options.customerItem, options.parentItem],
  };
}

/** 업종 공통 — 반·시간표·출결 섹션 */
export function buildClassesSection(options: {
  title: string;
  description: string;
  items: FeatureGuideItem[];
}): FeatureGuideSection {
  return {
    id: 'classes',
    title: options.title,
    description: options.description,
    items: options.items,
  };
}

/** 업종 공통 — 임의 섹션 */
export function buildGuideSection(options: {
  id: string;
  title: string;
  description: string;
  items: FeatureGuideItem[];
}): FeatureGuideSection {
  return {
    id: options.id,
    title: options.title,
    description: options.description,
    items: options.items,
  };
}

/** 업종 공통 — 수납·미납 섹션 */
export function buildBillingSection(options: {
  description: string;
  tuitionTitle: string;
  tuitionSummary: string;
  unpaidSummary: string;
  extraItems?: FeatureGuideItem[];
}): FeatureGuideSection {
  return {
    id: 'billing',
    title: '수납',
    description: options.description,
    items: [
      {
        id: 'tuition',
        title: options.tuitionTitle,
        summary: options.tuitionSummary,
      },
      {
        id: 'unpaid',
        title: '미납 통합 관리',
        summary: options.unpaidSummary,
      },
      ...(options.extraItems ?? []),
    ],
  };
}

/** 업종 공통 — 강사·캘린더 섹션 */
export function buildStaffSection(options: {
  title: string;
  description: string;
  teacherTitle: string;
  teacherSummary: string;
  calendarTitle: string;
  calendarSummary: string;
}): FeatureGuideSection {
  return {
    id: 'staff',
    title: options.title,
    description: options.description,
    items: [
      {
        id: 'teachers',
        title: options.teacherTitle,
        summary: options.teacherSummary,
      },
      {
        id: 'calendar',
        title: options.calendarTitle,
        summary: options.calendarSummary,
      },
    ],
  };
}
