import { useMemo, type FC } from 'react';
import { Users } from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import type { NavTab } from '@/shared/navigation/navigationTypes';
import { usePermissions } from '@/core/auth/usePermissions';
import { getCustomerListTab } from '@/core/industry/industryUi';
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
  showEnrollmentTab?: boolean; // 기본값 false
  showParentsTab?: boolean;    // 기본값 true (학부모 목록)
}> = ({
  listView,
  enrollmentLabel = '등록 요청',
  guardianEnrollmentView,
  showEnrollmentTab = false,
  showParentsTab = true,
}) => {
  const { activeTab, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const listTab = getCustomerListTab(industry) as NavTab;
  const ListView = listView;
  const GuardianView = guardianEnrollmentView ?? registeredGuardianEnrollmentView;
  const customerLabel = labels.customer.singular;
  const contactLabel = labels.contact.singular;

  const segment: CustomerSegment = useMemo(() => {
    if (showParentsTab && activeTab === 'parents') return 'parents';
    if (showEnrollmentTab && activeTab === 'enrollment-requests') return 'enrollment';
    return 'list';
  }, [activeTab, showEnrollmentTab, showParentsTab]);

  const options = useMemo(() => {
    const opts: { value: CustomerSegment; label: string }[] = [
      { value: 'list', label: customerLabel },
    ];
    if (showParentsTab) {
      opts.push({ value: 'parents', label: contactLabel });
    }
    if (showEnrollmentTab) {
      opts.push({
        value: 'enrollment',
        label: enrollmentLabel.length > 4 ? '등록 요청' : enrollmentLabel,
      });
    }
    return opts;
  }, [contactLabel, customerLabel, enrollmentLabel, showEnrollmentTab, showParentsTab]);

  const handleChange = (next: CustomerSegment) => {
    if (next === 'parents') setActiveTab('parents');
    else if (next === 'enrollment') setActiveTab('enrollment-requests');
    else setActiveTab(listTab);
  };

  let body = ListView ? <ListView /> : null;
  if (segment === 'parents') {
    body = <ParentManagementView />;
  } else if (segment === 'enrollment') {
    body = (
      <div className="space-y-4">
        <CustomerJoinRequestsPanel />
        {GuardianView ? <GuardianView /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<Users className="w-6 h-6 text-indigo-600" />}
        title={`${customerLabel} 관리`}
        actions={
          options.length > 1 ? (
            <SegmentedControl
              value={segment}
              options={options}
              onChange={handleChange}
              aria-label={`${customerLabel} 메뉴`}
              fullWidth
              className="w-full sm:w-auto min-w-[260px]"
            />
          ) : undefined
        }
      />
      {body}
    </div>
  );
};
