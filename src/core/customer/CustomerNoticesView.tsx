import { useParentPortalNotifications } from '@/core/parent/hooks/useParentPortalNotifications';
import {
  NOTICE_COPY,
  PARENT_PORTAL_NOTIFICATION_LABEL,
  type ParentPortalNotificationKind,
} from '@/core/notices';
import { StorageService } from '@/services/storage';
import type { Student } from '@/types';

function resolveStudent(customerId: string, displayName: string): Student {
  const found = StorageService.getStudents().find((s) => s.id === customerId);
  if (found) return found;
  return {
    id: customerId,
    studentNumber: '',
    name: displayName,
    gender: 'M',
    birthDate: '',
    school: '',
    grade: '성인',
    joinDate: '',
    status: 'active',
    teacherId: '',
    teacherName: '',
    classIds: [],
    level: '초급',
    tuitionFee: 0,
    paymentDay: 1,
    createdAt: '',
    updatedAt: '',
  };
}

/** 성인 수강생 알림함 — 학부모 알림 피드 재사용 */
export function CustomerNoticesView({
  customerId,
  organizationId,
  displayName,
  compact = false,
}: {
  customerId: string;
  organizationId: string;
  displayName: string;
  compact?: boolean;
}) {
  const student = resolveStudent(customerId, displayName);
  const { notifications, loading, error } = useParentPortalNotifications(
    organizationId,
    student,
    compact ? 5 : 30
  );

  const list = compact ? notifications.slice(0, 3) : notifications;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
      <h2 className="text-sm font-black text-slate-900">
        {compact ? '최근 알림' : NOTICE_COPY.parentSectionTitle || '알림'}
      </h2>
      {error && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      {loading && list.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">알림을 불러오는 중...</p>
      ) : list.length === 0 ? (
        <div className="text-center py-6 space-y-1">
          <p className="text-sm font-bold text-slate-700">아직 알림이 없습니다</p>
          <p className="text-xs text-slate-500">보낸 안내·청구·출결 알림이 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((n) => (
            <article
              key={n.id}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50/80"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
                  {PARENT_PORTAL_NOTIFICATION_LABEL[n.type as ParentPortalNotificationKind] ||
                    '안내'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {(n.sentAt || n.createdAt || '').slice(0, 10)}
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900">{n.title}</h3>
              {!compact && (
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-wrap">
                  {n.message}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
