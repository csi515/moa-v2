import { useEffect, useMemo, useState, type FC } from 'react';
import { useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { FilterTabs } from '@/shared/components/ui';
import { ChildLegalRecordsView } from './ChildLegalRecordsView';
import { CareIncidentView } from './CareIncidentView';
import { CareComplianceView } from './CareComplianceView';
import { findHealthCert, healthCertWarningLabel, isHealthCertWarning } from './complianceUtils';
import { peekCareFocus, subscribeCareFocus, takeCareFocus } from './careFocus';

type RecordSegment = 'children' | 'incidents' | 'ops';

/** 보육 화면 — 원아 법정 기록·사고 */
export const CareRecordsView: FC = () => {
  const refreshKey = useStorageRefresh();
  const [segment, setSegment] = useState<RecordSegment>('children');
  const [opsSegment, setOpsSegment] = useState<'health' | 'meals'>('health');
  const [opsKey, setOpsKey] = useState(0);
  useEffect(() => {
    const apply = () => {
      const pending = peekCareFocus();
      if (pending?.kind !== 'records') return;
      takeCareFocus('records');
      setSegment('ops');
      setOpsSegment(pending.ops);
      setOpsKey((key) => key + 1);
    };
    apply();
    return subscribeCareFocus(apply);
  }, []);

  const warnings = useMemo(() => {
    const teachers = StorageService.getTeachers().filter((teacher) => teacher.status === 'active');
    const certs = StorageService.getStaffHealthCerts();
    return teachers
      .map((teacher) => ({ teacher, cert: findHealthCert(certs, teacher.id) }))
      .filter((item) => isHealthCertWarning(item.cert?.expiresAt));
  }, [refreshKey]);

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setSegment('ops');
            setOpsKey((key) => key + 1);
          }}
          className="w-full text-left px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200"
        >
          <p className="text-xs font-bold text-amber-800">보건증 확인 {warnings.length}명</p>
          <p className="text-[11px] text-amber-800 mt-1">
            {warnings.map((item) => `${item.teacher.name} ${healthCertWarningLabel(item.cert?.expiresAt)}`).join(' · ')}
          </p>
        </button>
      )}
      <FilterTabs
        active={segment}
        tabs={[
          { id: 'children', label: '아동 기록' },
          { id: 'incidents', label: '사고' },
          { id: 'ops', label: '운영' },
        ]}
        onChange={setSegment}
      />
      {segment === 'children' && <ChildLegalRecordsView />}
      {segment === 'incidents' && <CareIncidentView />}
      {segment === 'ops' && <CareComplianceView key={opsKey} initialSegment={opsSegment} />}
    </div>
  );
};
