import React, { useState, useEffect } from 'react';
import { AlertCircle, Bell, ChevronRight, X, Megaphone } from 'lucide-react';
import {
  filterActiveAnnouncements,
  type TenantAnnouncement,
  type AudienceType,
} from '../domain/announcementEngine';

interface AnnouncementBannerViewProps {
  announcements: TenantAnnouncement[];
  audience?: AudienceType;
  onOpenDetails?: (announcement: TenantAnnouncement) => void;
}

export const AnnouncementBannerView: React.FC<AnnouncementBannerViewProps> = ({
  announcements,
  audience = 'ALL',
  onOpenDetails,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedPopupIds, setDismissedPopupIds] = useState<string[]>([]);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const activeResult = filterActiveAnnouncements({
    announcements,
    audience,
  });

  const bannerList = activeResult.bannerAnnouncements;
  const popupList = activeResult.popupAnnouncements.filter(
    (p) => !dismissedPopupIds.includes(p.id)
  );

  // 롤링 타이머 (배너가 2개 이상일 때 5초마다 자동 회전)
  useEffect(() => {
    if (bannerList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [bannerList.length]);

  const currentBanner = bannerList[currentIndex];

  const handleDismissPopup = (id: string) => {
    setDismissedPopupIds((prev) => [...prev, id]);
  };

  return (
    <>
      {/* 1. 상단 롤링 배너 */}
      {currentBanner && !dismissedBanner && (
        <div
          className={`w-full px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between transition-colors ${
            currentBanner.priority === 'EMERGENCY'
              ? 'bg-rose-600 text-white'
              : currentBanner.priority === 'URGENT'
              ? 'bg-amber-500 text-white'
              : 'bg-slate-900 text-white'
          }`}
        >
          <div
            className="flex items-center gap-2 overflow-hidden cursor-pointer"
            onClick={() => onOpenDetails?.(currentBanner)}
          >
            <Megaphone className="w-4 h-4 flex-shrink-0 animate-pulse" />
            <span className="font-bold uppercase tracking-wider text-[11px] px-1.5 py-0.5 rounded bg-black/20">
              {currentBanner.priority}
            </span>
            <span className="truncate">{currentBanner.title}</span>
            {currentBanner.actionUrl && (
              <span className="hidden sm:inline-flex items-center text-xs opacity-80 underline ml-2">
                자세히 보기 <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 pl-2">
            {bannerList.length > 1 && (
              <span className="text-[11px] opacity-80">
                {currentIndex + 1}/{bannerList.length}
              </span>
            )}
            <button
              onClick={() => setDismissedBanner(true)}
              className="p-1 hover:bg-black/10 rounded transition-colors"
              title="배너 닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. 첫 진입 팝업 모달 (우선순위 높은 팝업부터 노출) */}
      {popupList.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-slate-800" />
                <h3 className="font-bold text-slate-900 text-base">사업장 주요 공지</h3>
              </div>
              <button
                onClick={() => handleDismissPopup(popupList[0].id)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <div className="font-bold text-slate-900 text-lg mb-1">{popupList[0].title}</div>
              <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto">
                {popupList[0].content}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs text-slate-500">
              <span>게시 기간: {popupList[0].startDate} ~ {popupList[0].endDate}</span>
              <button
                onClick={() => handleDismissPopup(popupList[0].id)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
              >
                확인 (닫기)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
