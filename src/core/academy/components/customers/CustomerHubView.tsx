import { useEffect, useMemo, type FC } from 'react';
import { Users } from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import type { NavTab } from '@/shared/navigation/navigationTypes';
import { usePermissions } from '@/core/auth/usePermissions';
import { getCustomerListTab, getPlaceLabel } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { PageHeader, SegmentedControl } from '@/shared/components';
import { StudentListView } from '../students/StudentListView';
import { ParentManagementView } from '../parents/ParentManagementView';
import { GuardianEnrollmentRequestsView } from '../enrollments/GuardianEnrollmentRequestsView';
import { CustomerJoinRequestsPanel } from '@/core/customer/CustomerJoinRequestsPanel';
import {
  consumeOpenGuardianEnrollments,
  consumeOpenMembershipJoins,
} from '@/core/customer/studentJoinInbox';

type CustomerSegment = 'list' | 'parents' | 'enrollment';

/** 고객 업무 허브 — 업종 ModuleLabels 기준 용어(피아노=학생) */
export const CustomerHubView: FC<{
  listView?: FC;
  enrollmentLabel?: string;
}> = ({ listView, enrollmentLabel = '등록 요청' }) => {
  const { activeTab, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const listTab = getCustomerListTab(industry) as NavTab;
  const placeLabel = getPlaceLabel(industry);
  const ListView = listView ?? StudentListView;
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

  const description =
    segment === 'list'
      ? `${customerLabel} 명단을 검색·등록·관리합니다`
      : segment === 'parents'
        ? `${contactLabel} 연락처와 연결 ${customerLabel}을 관리합니다`
        : '자가가입·자녀 등록 요청을 승인합니다';

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<Users className="w-5 h-5" />}
        title={labels.customer.section}
        description={description}
        actions={
          <SegmentedControl
            value={segment}
            options={options}
            onChange={(next) => {
              if (next === 'list') setActiveTab(listTab);
              else if (next === 'parents') setActiveTab('parents');
              else setActiveTab('enrollment-requests');
            }}
            aria-label={`${customerLabel} 메뉴`}
            fullWidth
            className="w-full shadow-xs sm:w-auto sm:min-w-[220px]"
          />
        }
      />

      {segment === 'list' && <ListView />}
      {segment === 'parents' && <ParentManagementView />}
      {segment === 'enrollment' && (
        <EnrollmentInbox
          placeLabel={placeLabel}
          customerLabel={customerLabel}
          contactLabel={contactLabel}
        />
      )}
    </div>
  );
};

function EnrollmentInbox({
  placeLabel,
  customerLabel,
  contactLabel,
}: {
  placeLabel: string;
  customerLabel: string;
  contactLabel: string;
}) {
  useEffect(() => {
    const openGuardian = consumeOpenGuardianEnrollments();
    const openMembership = consumeOpenMembershipJoins();
    const targetId = openGuardian
      ? 'guardian-enrollment-inbox'
      : openMembership
        ? 'membership-join-inbox'
        : null;
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
  }, []);

  return (
    <div className="space-y-8">
      <div id="membership-join-inbox">
        <CustomerJoinRequestsPanel
          embedded
          requestType="membership"
          title={`${customerLabel} 자가가입`}
          description={`성인이 본인 계정으로 보낸 가입 신청입니다. 승인하면 그 계정으로 이 ${placeLabel}을(를) 이용할 수 있습니다. 자녀 연결(${contactLabel} 요청)과는 별도입니다.`}
        />
      </div>
      <GuardianEnrollmentRequestsView />
    </div>
  );
}
