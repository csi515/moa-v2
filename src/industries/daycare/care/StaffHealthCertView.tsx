import { useMemo, type FC } from 'react';
import { usePermissions } from '@/core/auth/usePermissions';
import { useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { findHealthCert, healthCertWarningLabel, isHealthCertWarning } from './complianceUtils';

/** 원장만 보건증 만료일을 고친다 */
export const StaffHealthCertView: FC = () => {
  const { isOwner } = usePermissions();
  const refreshKey = useStorageRefresh();
  const teachers = useMemo(
    () => StorageService.getTeachers().filter((teacher) => teacher.status === 'active'),
    [refreshKey]
  );
  const certs = useMemo(() => StorageService.getStaffHealthCerts(), [refreshKey]);

  const saveDate = (teacherId: string, teacherName: string, expiresAt: string) => {
    if (!isOwner) return;
    const existing = findHealthCert(certs, teacherId);
    StorageService.saveStaffHealthCert({
      id: existing?.id,
      teacherId,
      teacherName,
      expiresAt,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {teachers.map((teacher) => {
          const cert = findHealthCert(certs, teacher.id);
          const warning = isHealthCertWarning(cert?.expiresAt);
          return (
            <li key={teacher.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{teacher.name}</p>
                {warning && (
                  <p className="text-[11px] font-bold text-amber-800 mt-0.5">
                    {healthCertWarningLabel(cert?.expiresAt)}
                  </p>
                )}
              </div>
              <input
                type="date"
                value={cert?.expiresAt?.slice(0, 10) || ''}
                disabled={!isOwner}
                onChange={(e) => saveDate(teacher.id, teacher.name, e.target.value)}
                className={`${FORM_CONTROL_CLASS} sm:w-44`}
                aria-label={`${teacher.name} 보건증 만료일`}
              />
            </li>
          );
        })}
      </ul>
      {!isOwner && (
        <p className="px-4 py-3 text-[11px] text-slate-500 border-t border-slate-100">
          만료일은 원장만 수정합니다.
        </p>
      )}
    </div>
  );
};
