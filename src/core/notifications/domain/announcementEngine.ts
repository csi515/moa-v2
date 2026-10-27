/**
 * 사업장 인앱 공지사항 및 롤링 배너 도메인 엔진 (Pure Functions)
 *
 * 목적:
 *  - 유료 LMS 단체 문자 발송 비용 0원화
 *  - 휴원, 방학, 시간표 개편, 대회 참가 등의 공지사항을 모아 앱 상단 롤링 배너 및 팝업 모달로 실시간 전달
 */

export type AnnouncementPriority = 'NORMAL' | 'URGENT' | 'EMERGENCY';

export type AudienceType = 'ALL' | 'MEMBERS' | 'GUARDIANS';

export interface TenantAnnouncement {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  showAsBanner: boolean; // 상단 롤링 배너 표시 여부
  showAsPopup: boolean; // 첫 진입 시 팝업 모달 노출 여부
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  targetAudience: AudienceType;
  actionUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ActiveAnnouncementResult {
  bannerAnnouncements: TenantAnnouncement[];
  popupAnnouncements: TenantAnnouncement[];
  totalActiveCount: number;
}

const PRIORITY_WEIGHT: Record<AnnouncementPriority, number> = {
  EMERGENCY: 3,
  URGENT: 2,
  NORMAL: 1,
};

/**
 * 1. 기준일시 및 대상자 유형 기준 활성 공지사항 필터링 & 우선순위 정렬 (순수 함수)
 */
export function filterActiveAnnouncements(params: {
  announcements: readonly TenantAnnouncement[];
  targetDate?: string; // YYYY-MM-DD
  audience?: AudienceType;
}): ActiveAnnouncementResult {
  const {
    announcements,
    targetDate = new Date().toISOString().slice(0, 10),
    audience = 'ALL',
  } = params;

  const activeList = announcements.filter((a) => {
    if (!a.isActive) return false;
    if (targetDate < a.startDate || targetDate > a.endDate) return false;
    if (audience !== 'ALL' && a.targetAudience !== 'ALL' && a.targetAudience !== audience) {
      return false;
    }
    return true;
  });

  // 긴급도 높은 순 -> 최신 생성순 정렬
  const sorted = [...activeList].sort((a, b) => {
    const diffPriority = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (diffPriority !== 0) return diffPriority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const bannerAnnouncements = sorted.filter((a) => a.showAsBanner);
  const popupAnnouncements = sorted.filter((a) => a.showAsPopup);

  return {
    bannerAnnouncements,
    popupAnnouncements,
    totalActiveCount: sorted.length,
  };
}

/**
 * 2. 공지사항 생성 및 유효성 검증 (순수 함수)
 */
export function createTenantAnnouncement(params: {
  id?: string;
  organizationId: string;
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  showAsBanner?: boolean;
  showAsPopup?: boolean;
  startDate: string;
  endDate: string;
  targetAudience?: AudienceType;
  actionUrl?: string;
  createdAt?: string;
}): { announcement?: TenantAnnouncement; success: boolean; error?: string } {
  if (!params.title.trim()) {
    return { success: false, error: '공지 제목을 입력해주세요.' };
  }
  if (!params.content.trim()) {
    return { success: false, error: '공지 내용을 입력해주세요.' };
  }
  if (params.startDate > params.endDate) {
    return { success: false, error: '게시 종료일은 시작일보다 이후여야 합니다.' };
  }

  const announcement: TenantAnnouncement = {
    id: params.id ?? `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    organizationId: params.organizationId,
    title: params.title.trim(),
    content: params.content.trim(),
    priority: params.priority ?? 'NORMAL',
    showAsBanner: params.showAsBanner ?? true,
    showAsPopup: params.showAsPopup ?? false,
    startDate: params.startDate.slice(0, 10),
    endDate: params.endDate.slice(0, 10),
    targetAudience: params.targetAudience ?? 'ALL',
    actionUrl: params.actionUrl?.trim(),
    isActive: true,
    createdAt: params.createdAt ?? new Date().toISOString(),
  };

  return {
    announcement,
    success: true,
  };
}
