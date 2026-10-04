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
import { useParentPortal } from '@/core/parent/context/ParentPortalContext';
import { ACTIVE_ENROLLMENT_STATUSES } from '@/core/parent/types/globalParent';
import { unlinkParentEnrollment } from '@/core/parent/services/enrollmentUnlinkService';
import { useApp } from '@/context/AppContext';
import {
  getParentMoreMenuItemCopy,
  getParentMoreSwitchCopy,
  getParentMoreUnlinkHint,
  getParentMoreUnlinkMessage,
} from './parentMoreMenu';

type MoreItem = {
  id: ParentPortalTab;
  label: string;
  description: string;
  icon: React.ReactNode;
};

function moreItemIcon(id: ParentPortalTab): React.ReactNode {
  switch (id) {
    case 'assignments':
      return <BookOpenCheck className="w-5 h-5" />;
    case 'progress':
      return <TrendingUp className="w-5 h-5" />;
    case 'stamps':
      return <Stamp className="w-5 h-5" />;
    case 'reports':
    case 'incidents':
      return <FileText className="w-5 h-5" />;
    case 'events':
      return <Calendar className="w-5 h-5" />;
    case 'pickups':
      return <Users className="w-5 h-5" />;
    case 'notices':
    default:
      return <Megaphone className="w-5 h-5" />;
  }
}

/** 하단 ‘더보기’ — 보조 메뉴·문의·연결 해제·계정 */
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
  const switchCopy = getParentMoreSwitchCopy(industry);
  const items: MoreItem[] = getParentMoreMenuItemCopy(industry).map((item) => ({
    ...item,
    icon: moreItemIcon(item.id),
  }));
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
      message: getParentMoreUnlinkMessage(industry, selectedEnrollment.organizationName),
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
              <span className="block text-sm font-bold text-slate-900">{switchCopy.title}</span>
              <span className="block text-[11px] text-slate-500">{switchCopy.description}</span>
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
              <span className="block text-[11px] text-rose-500/90">{getParentMoreUnlinkHint(industry)}</span>
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
