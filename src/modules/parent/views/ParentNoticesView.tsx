import { useParentPortalNotifications } from '@/core/parent/hooks/useParentPortalNotifications';
import {
  NOTICE_COPY,
  PARENT_PORTAL_NOTIFICATION_LABEL,
  type ParentPortalNotificationKind,
} from '@/core/notices';
import type { Student } from '@/types';
import type { IndustryType } from '@/core/industry/types';
import { Section } from './shared';

export function ParentNoticesView({
  student,
  organizationId,
}: {
  student: Student;
  organizationId: string;
  industryType?: IndustryType | string;
}) {
  const { notifications, loading, error } = useParentPortalNotifications(organizationId, student);

  return (
    <Section title={NOTICE_COPY.parentSectionTitle}>
      {error && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3">
          {error}
        </p>
      )}
      {loading && notifications.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">알림을 불러오는 중...</p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-10 space-y-3">
          <div className="text-4xl">📢</div>
          <div>
            <p className="text-sm font-bold text-slate-700">{NOTICE_COPY.parentEmpty}</p>
            <p className="text-xs text-slate-500 mt-1.5">
              {NOTICE_COPY.parentEmptyHint}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <article
              key={n.id}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/80"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                    n.type === 'attendance'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {PARENT_PORTAL_NOTIFICATION_LABEL[n.type as ParentPortalNotificationKind] ||
                    '안내'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {(n.sentAt || n.createdAt || '').slice(0, 10)}
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900">{n.title}</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
                {n.message}
              </p>
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}
