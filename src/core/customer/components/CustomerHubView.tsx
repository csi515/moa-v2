import { useEffect, useMemo, type FC } from 'react';
import { Users } from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import type { NavTab } from '@/shared/navigation/navigationTypes';
import { usePermissions } from '@/core/auth/usePermissions';
import { getCustomerListTab, getPlaceLabel } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { PageHeader, SegmentedControl } from '@/shared/components';
import { ParentManagementView } from '@/core/parent/components/ParentManagementView';
import { CustomerJoinRequestsPanel } from '@/core/customer/CustomerJoinRequestsPanel';

type CustomerSegment = 'list' | 'parents' | 'enrollment';

let registeredGuardianEnrollmentView: FC | null = null;

export function registerCustomerHubGuardianEnrollment(view: FC): void {
  registeredGuardianEnrollmentView = view;
}
export const CustomerHubView: FC<{
  listView?: FC;
  enrollmentLabel?: string;
  guardianEnrollmentView?: FC;
}> = ({
  listView,
  enrollmentLabel = '등록 요청',
  guardianEnrollmentView,
}) => {
  const { activeTab, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const listTab = getCustomerListTab(industry) as NavTab;
  const placeLabel = getPlaceLabel(industry);
  const ListView = listView;
  const GuardianView = guardianEnrollmentView ?? registeredGuardianEnrollmentView;
  const customerLabel = labels.customer.singular;
  const contactLabel = labels.contact.singular;

  const segment: CustomerSegment = useMemo(() => {
    if (activeTab === 'parents') return 'parents';
    if (activeTab === 'enrollment-requests') return 'enrollment';
    return 'list';
  }, [activeTab]);

  const options = useMemo(
    () => [
      { value: 'list' as const, label: customerLabel },
      { value: 'parents' as const, label: contactLabel },
      {
        value: 'enrollment' as const,
        label: enrollmentLabel.length > 4 ? '등록' : enrollmentLabel,
      },
    ],
    [contactLabel, customerLabel, enrollmentLabel]
  );

  const handleChange = (next: CustomerSegment) => {
    if (next === 'parents') setActiveTab('parents');
    else if (next === 'enrollment') setActiveTab('enrollment-requests');
    else setActiveTab(listTab);
  };

  let body = <ListView />;
  if (segment === 'parents') {
    body = <ParentManagementView />;
  } else if (segment === 'enrollment') {
    body = GuardianView ? (
      <GuardianView />
    ) : (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-xs text-slate-500">
        등록 요청 기능이 연결되어 있지 않습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<Users className="w-6 h-6 text-indigo-600" />}
        title={`${customerLabel} 관리`}
        description={`${placeLabel} ${customerLabel} 및 ${contactLabel} 명단 · 등록 요청`}
        actions={
          <SegmentedControl
            value={segment}
            options={options}
            onChange={handleChange}
            aria-label={`${customerLabel} 메뉴`}
            fullWidth
            className="w-full sm:w-auto min-w-[260px]"
          />
        }
      />
      <CustomerJoinRequestsPanel />
      {body}
    </div>
  );
};
