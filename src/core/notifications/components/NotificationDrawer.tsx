import React from 'react';
import { Bell, X, Check, Clock, Sparkles, Inbox } from 'lucide-react';
import { useCustomerNotifications, type CustomerNotificationItem } from '../useCustomerNotifications';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerId?: string | null;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  customerId,
}) => {
  const { notifications, unreadCount, isLoading, markAsRead } = useCustomerNotifications(customerId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-100">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900">알림함</h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">비용 0원 실시간 인앱 소식</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="알림함 닫기"
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
                <p>알림을 불러오는 중...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-20 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 mb-1">새로운 알림이 없습니다</h3>
                <p className="text-xs text-slate-400">
                  출결, 예약 확정, 수납 안내 등 새로운 소식이 이곳에 도착합니다.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.isRead) void markAsRead(item.id);
                  }}
                  className={`p-4 rounded-2xl transition-all cursor-pointer ${
                    item.isRead
                      ? 'bg-white hover:bg-slate-50/80 opacity-75'
                      : 'bg-indigo-50/40 hover:bg-indigo-50/70 border border-indigo-100/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-2 pl-3.5">
                    {item.body}
                  </p>

                  <div className="flex items-center justify-between pl-3.5 text-[11px]">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-semibold text-[10px]">
                      {item.category || '공지'}
                    </span>
                    {!item.isRead && (
                      <span className="text-indigo-600 font-bold text-[11px] hover:underline">
                        읽음 표시
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
            <p className="text-[11px] text-slate-400">
              MOA Push Notification Engine · 비용 0원 통신망
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
