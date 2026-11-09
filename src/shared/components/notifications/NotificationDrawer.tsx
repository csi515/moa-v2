import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  CreditCard,
  Calendar,
  AlertCircle,
  Info,
  Check,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import type { MoaNotification, NotificationType } from './notificationTypes';
import { MoaNotificationService } from './notificationService';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

type FilterCategory = 'all' | 'unread' | 'payment' | 'attendance_booking';

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return new Date(isoString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '최근';
  }
}

function getIconForType(type: NotificationType) {
  switch (type) {
    case 'attendance':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    case 'payment':
      return <CreditCard className="w-4 h-4 text-indigo-600" />;
    case 'booking':
      return <Calendar className="w-4 h-4 text-blue-600" />;
    case 'system':
      return <Info className="w-4 h-4 text-slate-600" />;
    case 'message':
      return <Bell className="w-4 h-4 text-amber-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-slate-500" />;
  }
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [notifications, setNotifications] = useState<MoaNotification[]>([]);
  const [filter, setFilter] = useState<FilterCategory>('all');

  const refreshList = () => {
    setNotifications(MoaNotificationService.getNotifications());
  };

  useEffect(() => {
    refreshList();
    const unsubscribe = MoaNotificationService.subscribe(refreshList);
    return () => unsubscribe();
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter((n) => !n.read);
      case 'payment':
        return notifications.filter((n) => n.type === 'payment');
      case 'attendance_booking':
        return notifications.filter(
          (n) => n.type === 'attendance' || n.type === 'booking'
        );
      default:
        return notifications;
    }
  }, [notifications, filter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="알림 센터"
    >
      {/* 배경 백드롭 */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* 우측 슬라이드인 패널 */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
          {/* 헤더 */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">알림 센터</h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">실시간 활동 피드 및 중요 공지</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => MoaNotificationService.markAllAsRead()}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                  title="모든 알림 읽음 처리"
                >
                  <Check className="w-3.5 h-3.5" />
                  모두 읽음
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="알림 센터 닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 탭 카테고리 필터 */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto bg-white text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              전체 ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'unread'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              미확인 ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('payment')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'payment'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              수강료·결제
            </button>
            <button
              type="button"
              onClick={() => setFilter('attendance_booking')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'attendance_booking'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              출결·예약
            </button>
          </div>

          {/* 알림 리스트 바디 */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Bell className="w-12 h-12 stroke-[1.2] mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  {filter === 'unread'
                    ? '미확인 알림이 없습니다'
                    : '표시할 알림이 없습니다'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  새로운 출결 및 수강료 알림이 도착하면 여기에 표시됩니다.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.read) MoaNotificationService.markAsRead(item.id);
                    if (item.linkTab && onNavigateTab) {
                      onNavigateTab(item.linkTab);
                      onClose();
                    }
                  }}
                  className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                    item.read
                      ? 'bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/50'
                      : 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/70 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 상태 아이콘 */}
                    <div className="p-2 rounded-lg bg-white shadow-2xs border border-slate-100 shrink-0 mt-0.5">
                      {getIconForType(item.type)}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 mb-1">
                        {!item.read && (
                          <span
                            className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"
                            aria-label="미확인"
                          />
                        )}
                        <h4
                          className={`text-sm tracking-tight truncate ${
                            item.read
                              ? 'font-medium text-slate-700'
                              : 'font-bold text-slate-900'
                          }`}
                        >
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {item.message}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{formatTimeAgo(item.createdAt)}</span>
                        {item.linkTab && (
                          <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                            바로가기
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 개별 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      MoaNotificationService.deleteNotification(item.id);
                    }}
                    className="absolute top-3 right-3 p-1 text-slate-300 hover:text-rose-500 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="알림 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* 푸터 */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 text-center flex items-center justify-between text-xs text-slate-500 px-4">
            <span>실시간 알림 피드 동기화 켜짐</span>
            <button
              type="button"
              onClick={() => MoaNotificationService.clearAll()}
              className="text-slate-400 hover:text-slate-600 underline font-medium"
            >
              전체 비우기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
