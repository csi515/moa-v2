import React, { useState } from 'react';
import {
  Megaphone,
  BookOpenCheck,
  Calendar,
  TrendingUp,
  FileText,
  Phone,
  Users,
  ChevronRight,
  Settings,
  Unlink,
  Loader2,
  Stamp,
} from 'lucide-react';
import { StorageService } from '@/services/storage';
import type { ParentPortalTab } from '@/types/education';
import type { IndustryType } from '@/core/industry/types';
import { getPlaceLabel } from '@/core/industry/industryUi';
import { normalizeIndustryType } from '@/core/industry/types';
import { ParentAccountSection } from '../ParentAccountSection';
import { getParentPortalSecondaryTabs } from '../parentPortalNav';
import { useParentPortal } from '@/core/parent/context/ParentPortalContext';
import { ACTIVE_ENROLLMENT_STATUSES } from '@/core/parent/types/globalParent';
import { unlinkParentEnrollment } from '@/core/parent/services/enrollmentUnlinkService';
import { useApp } from '@/context/AppContext';

type MoreItem = {
  id: ParentPortalTab;
  label: string;
  description: string;
  icon: React.ReactNode;
};

function getPianoMoreItems(): MoreItem[] {
  return [
    { id: 'notices', label: '안내', description: '학원 공지·알림', icon: <Megaphone className="w-5 h-5" /> },
    { id: 'assignments', label: '과제', description: '이번 주 과제·확인', icon: <BookOpenCheck className="w-5 h-5" /> },
    { id: 'progress', label: '진도·연습', description: '커리큘럼·연습 기록·완곡 신청', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'stamps', label: '완곡 스탬프', description: '자녀 스탬프판·완곡 리포트', icon: <Stamp className="w-5 h-5" /> },
    { id: 'reports', label: '학습 리포트', description: '월간 학습 리포트', icon: <FileText className="w-5 h-5" /> },
    { id: 'events', label: '행사', description: '연주회·학원 행사', icon: <Calendar className="w-5 h-5" /> },
  ];
}

function getDefaultMoreItems(industry: IndustryType | string | null | undefined): MoreItem[] {
  const secondary = getParentPortalSecondaryTabs(industry);
  const items: MoreItem[] = [
    {
      id: 'notices',
      label: '안내',
      description: `${getPlaceLabel(industry)} 공지·알림`,
      icon: <Megaphone className="w-5 h-5" />,
    },
  ];
  if (secondary.includes('events')) {
    items.push({
      id: 'events',
      label: '행사',
      description: `${getPlaceLabel(industry)} 행사`,
      icon: <Calendar className="w-5 h-5" />,
    });
  }
  if (secondary.includes('pickups')) {
    items.push({
      id: 'pickups',
      label: '귀가 명단',
      description: '데려갈 수 있는 사람과 알레르기',
      icon: <Users className="w-5 h-5" />,
    });
  }
  if (secondary.includes('incidents')) {
    items.push({
      id: 'incidents',
      label: '사고 안내',
      description: '원에서 전한 사고 기록',
      icon: <FileText className="w-5 h-5" />,
    });
  }
  return items;
}

/** 하단 ‘더보기’ — 보조 메뉴·문의·학원 연결 해제·계정 */
export function ParentMoreView({
  onNavigate,
  onSwitchChild,
  industryType = 'piano',
}: {
  onNavigate: (t: ParentPortalTab) => void;
  onSwitchChild?: () => void;
  industryType?: IndustryType | string;
}) {
  const industry = normalizeIndustryType(industryType);
  const place = getPlaceLabel(industry);
  const items = industry === 'piano' ? getPianoMoreItems() : getDefaultMoreItems(industry);
  const settings = StorageService.getSettings();
  const phone = settings.phone?.trim();
  const { selectedEnrollment, refreshPortalTree, goToChildren } = useParentPortal();
  const { showToast, openConfirmDialog } = useApp();
  const [unlinking, setUnlinking] = useState(false);

  const canUnlink =
    !!selectedEnrollment &&
    ACTIVE_ENROLLMENT_STATUSES.includes(selectedEnrollment.status);

  const handleUnlink = () => {
    if (!selectedEnrollment) return;
    openConfirmDialog({
      title: `${place} 연결 해제`,
      message: `${selectedEnrollment.organizationName} 앱 연결만 해제할까요? 학원 원생(재원) 등록은 유지되며, 퇴원은 학원에서만 처리합니다. 출결·수납 기록은 삭제되지 않고 조회만 가능합니다. 다시 연결하려면 ${place} 연결 코드가 필요합니다.`,
      isDestructive: true,
      confirmText: '연결 해제',
      onConfirm: () => {
        void (async () => {
          setUnlinking(true);
          try {
            const result = await unlinkParentEnrollment(selectedEnrollment.enrollmentId);
            if (!result.success) {
              showToast('연결 해제에 실패했습니다', 'error');
              return;
            }
            showToast(
              result.alreadyUnlinked
                ? `이미 해제된 ${place} 연결입니다`
                : `${place} 연결을 해제했습니다`,
              'success'
            );
            await refreshPortalTree();
            goToChildren();
          } catch (err) {
            showToast(err instanceof Error ? err.message : '연결 해제에 실패했습니다', 'error');
          } finally {
            setUnlinking(false);
          }
        })();
      },
    });
  };

  return (
    <div className="space-y-4 pb-2">
      <div>
        <h2 className="text-lg font-black text-slate-900">더보기</h2>
        <p className="text-xs text-slate-500 mt-1">안내·학습 자료와 계정 설정</p>
      </div>

      <ul className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[56px] text-left hover:bg-slate-50"
            >
              <span className="text-indigo-600 shrink-0">{item.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                <span className="block text-[11px] text-slate-500">{item.description}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          </li>
        ))}
      </ul>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {onSwitchChild && (
          <button
            type="button"
            onClick={onSwitchChild}
            className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[56px] text-left hover:bg-slate-50"
          >
            <Users className="w-5 h-5 text-indigo-600 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">
                {industry === 'skin_clinic' ? '고객·샵 전환' : `자녀·${place} 전환`}
              </span>
              <span className="block text-[11px] text-slate-500">
                {industry === 'skin_clinic' ? '다른 샵 선택' : `다른 자녀 또는 ${place} 선택`}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
        )}
        {phone ? (
          <a
            href={`tel:${phone.replace(/\s/g, '')}`}
            className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[56px] text-left hover:bg-slate-50"
          >
            <Phone className="w-5 h-5 text-indigo-600 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">{place}에 문의</span>
              <span className="block text-[11px] text-slate-500 font-mono">{phone}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </a>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3.5 min-h-[56px]">
            <Phone className="w-5 h-5 text-slate-400 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">{place}에 문의</span>
              <span className="block text-[11px] text-slate-500">
                등록된 연락처가 없습니다. {place}에 직접 문의해 주세요.
              </span>
            </span>
          </div>
        )}
        {canUnlink && (
          <button
            type="button"
            onClick={handleUnlink}
            disabled={unlinking}
            className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[56px] text-left hover:bg-rose-50 disabled:opacity-60"
          >
            {unlinking ? (
              <Loader2 className="w-5 h-5 text-rose-600 shrink-0 animate-spin" />
            ) : (
              <Unlink className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-rose-700">{place} 연결 해제</span>
              <span className="block text-[11px] text-rose-500/90">
                앱 연결만 해제 · 학원 재원/퇴원은 별도
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-rose-300 shrink-0" />
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
          <Settings className="w-3.5 h-3.5" />
          계정
        </p>
        <ParentAccountSection industryType={industry} />
      </div>
    </div>
  );
}
