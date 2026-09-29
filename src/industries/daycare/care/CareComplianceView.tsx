import { useState, type FC } from 'react';
import { FilterTabs } from '@/shared/components/ui';
import { StaffHealthCertView } from './StaffHealthCertView';
import { SafetyInspectionView } from './SafetyInspectionView';
import { MealSampleView } from './MealSampleView';
import { CctvViewRequestView } from './CctvViewRequestView';
import { InspectionBinderView } from './InspectionBinderView';

type ComplianceSegment = 'health' | 'safety' | 'meals' | 'cctv' | 'binder';

export const CareComplianceView: FC<{ initialSegment?: ComplianceSegment }> = ({
  initialSegment = 'health',
}) => {
  const [segment, setSegment] = useState<ComplianceSegment>(initialSegment);

  return (
    <div className="space-y-4">
      <FilterTabs
        active={segment}
        tabs={[
          { id: 'health', label: '보건증' },
          { id: 'safety', label: '안전' },
          { id: 'meals', label: '보존식' },
          { id: 'cctv', label: '열람' },
          { id: 'binder', label: '점검' },
        ]}
        onChange={setSegment}
      />
      {segment === 'health' && <StaffHealthCertView />}
      {segment === 'safety' && <SafetyInspectionView />}
      {segment === 'meals' && <MealSampleView />}
      {segment === 'cctv' && <CctvViewRequestView />}
      {segment === 'binder' && <InspectionBinderView />}
    </div>
  );
};
