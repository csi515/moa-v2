import { useParentPortalNotifications } from '@/core/parent/hooks/useParentPortalNotifications';
import {
  NOTICE_COPY,
  type ParentPortalNotificationKind,
  PARENT_PORTAL_NOTIFICATION_LABEL,
} from '@/core/notices';
import type { ParentPortalTab } from '@/types/education';
import type { Student } from '@/types';
import { ChevronRight } from 'lucide-react';
import { Section } from './shared';

const NOTICE_BADGE_CLASS: Partial<Record<ParentPortalNotificationKind, string>> = {
  attendance: 'bg-emerald-50 text-emerald-700',
  absence: 'bg-rose-50 text-rose-700',
  makeup: 'bg-amber-50 text-amber-800',
  tuition_unpaid: 'bg-rose-50 text-rose-700',
  notice: 'bg-indigo-50 text-indigo-700',
  announcement: 'bg-sky-50 text-sky-700',
};

export function ParentNoticePreview({
  student,
  organizationId,
  onNavigate,
}: {
  student: Student;
  organizationId: string;
  onNavigate: (t: ParentPortalTab) => void;
}) {
  const { notifications } = useParentPortalNotifications(organizationId, student, 5);
  const notices = notifications.slice(0, 3);

  return (
    <Section
      title={NOTICE_COPY.parentSectionTitle}
      action={
        notices.length > 0 ? (
          <button
            type="button"
            onClick={() => onNavigate('notices')}
            className="text-[11px] font-bold text-indigo-600 min-h-[44px] px-1"
          >
            전체
          </button>
        ) : undefined
      }
    >
      {notices.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">{NOTICE_COPY.parentEmpty}</p>
      ) : (
        <ul className="space-y-1 -mx-1">
          {notices.map((n) => {
            const kind = n.type as ParentPortalNotificationKind;
            const badgeClass = NOTICE_BADGE_CLASS[kind] || 'bg-slate-100 text-slate-600';
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onNavigate('notices')}
                  className="w-full text-left flex items-center gap-2.5 rounded-xl px-2 py-2.5 min-h-[52px] hover:bg-slate-50"
                >
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${badgeClass}`}
                  >
                    {PARENT_PORTAL_NOTIFICATION_LABEL[kind] || '안내'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{n.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {(n.sentAt || n.createdAt || '').slice(0, 10)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

export function ParentHeroCard({
  student,
  subtitle,
  gradientClass,
}: {
  student: Student;
  subtitle: string;
  gradientClass: string;
}) {
  return (
    <div className={`${gradientClass} rounded-2xl px-4 py-3.5 text-white shadow-md shadow-indigo-900/10`}>
      <p className="text-white/75 text-xs font-semibold tracking-wide">{subtitle}</p>
      <h2 className="text-2xl sm:text-[1.75rem] font-extrabold mt-1.5 tracking-tight">
        {student.name}
      </h2>
      <p className="text-sm text-white/85 mt-2">담당 · {student.teacherName || '미지정'}</p>
    </div>
  );
}
