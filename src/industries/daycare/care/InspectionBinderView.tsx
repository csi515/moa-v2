import { useMemo, type FC } from 'react';
import { useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { Printer } from 'lucide-react';
import { CHILD_RECORD_GAP_LABEL, CCTV_VIEW_STATUS_LABEL, SAFETY_CHECK_KIND_LABEL } from './types';
import { getChildRecordGaps } from './childRecordGaps';
import { findHealthCert, healthCertWarningLabel, isHealthCertWarning } from './complianceUtils';

function formatWhen(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

/** 지도점검용 모아보기 — 인쇄만 */
export const InspectionBinderView: FC = () => {
  const refreshKey = useStorageRefresh();
  const students = useMemo(
    () => StorageService.getStudents().filter((student) => student.status === 'active'),
    [refreshKey]
  );
  const childRecords = useMemo(() => StorageService.getChildLegalRecords(), [refreshKey]);
  const incidents = useMemo(() => StorageService.getCareIncidents(), [refreshKey]);
  const teachers = useMemo(
    () => StorageService.getTeachers().filter((teacher) => teacher.status === 'active'),
    [refreshKey]
  );
  const certs = useMemo(() => StorageService.getStaffHealthCerts(), [refreshKey]);
  const safetyLogs = useMemo(() => StorageService.getSafetyInspectionLogs(), [refreshKey]);
  const meals = useMemo(() => StorageService.getMealSampleLogs(), [refreshKey]);
  const cctv = useMemo(() => StorageService.getCctvViewRequests(), [refreshKey]);
  const recordByStudent = useMemo(
    () => new Map<string, any>(childRecords.map((record) => [record.studentId, record])),
    [childRecords]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end no-print">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
        >
          <Printer className="w-4 h-4" />
          인쇄
        </button>
      </div>
      <article id="inspection-binder" className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-4">
        <h2 className="text-base font-bold text-slate-900">지도점검 기록</h2>
        <section>
          <h3 className="text-sm font-bold text-slate-800">아동 기록</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {students.map((student) => {
              const gaps = getChildRecordGaps(recordByStudent.get(student.id));
              return (
                <li key={student.id}>
                  {student.name} · {gaps.length ? gaps.map((gap) => CHILD_RECORD_GAP_LABEL[gap]).join(', ') : '확인 완료'}
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-bold text-slate-800">사고</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {incidents.length === 0 && <li>없음</li>}
            {incidents.map((item) => (
              <li key={item.id}>
                {item.studentName} · {formatWhen(item.occurredAt)} · {item.content}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-bold text-slate-800">보건증</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {teachers.map((teacher) => {
              const cert = findHealthCert(certs, teacher.id);
              return (
                <li key={teacher.id}>
                  {teacher.name} · {cert?.expiresAt?.slice(0, 10) || '미등록'}
                  {isHealthCertWarning(cert?.expiresAt) ? ` · ${healthCertWarningLabel(cert?.expiresAt)}` : ''}
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-bold text-slate-800">안전점검</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {safetyLogs.length === 0 && <li>없음</li>}
            {safetyLogs.map((log) => (
              <li key={log.id}>
                {log.logDate.slice(0, 10)} · {SAFETY_CHECK_KIND_LABEL[log.kind]} ·{' '}
                {log.items.filter((item) => item.checked).map((item) => item.label).join(', ')}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-bold text-slate-800">보존식</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {meals.length === 0 && <li>없음</li>}
            {meals.map((log) => (
              <li key={log.id}>
                {log.menuName} · 저장 {formatWhen(log.storedAt)} · 폐기 {formatWhen(log.disposeAt)}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-bold text-slate-800">CCTV 열람</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {cctv.length === 0 && <li>없음</li>}
            {cctv.map((item) => (
              <li key={item.id}>
                {formatWhen(item.requestedAt)} · {item.applicantName} · {item.purpose} · {CCTV_VIEW_STATUS_LABEL[item.status]}
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
};
