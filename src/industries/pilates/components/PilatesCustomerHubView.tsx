import { useMemo, type FC } from 'react';
import { Ticket, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { PageHeader, SegmentedControl } from '@/shared/components';

type CustomerSegment = 'members' | 'passes';

/** 예약형 고객 허브 — 회원/고객·이용권/관리권 */
export const PilatesCustomerHubView: FC<{
  membersView: FC;
  passesView: FC;
  membersLabel?: string;
  passesLabel?: string;
}> = ({
  membersView: MembersView,
  passesView: PassesView,
  membersLabel,
  passesLabel,
}) => {
  const labels = useModuleLabels();
  const memberText = membersLabel ?? labels.customer.singular;
  const passText = passesLabel ?? '이용권';
  const { activeTab, setActiveTab } = useApp();
  const segment: CustomerSegment = useMemo(
    () => (activeTab === 'passes' ? 'passes' : 'members'),
    [activeTab]
  );

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={segment === 'members' ? <Users className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
        title={labels.customer.section}
        description={segment === 'members' ? labels.customer.management : `${passText} 관리`}
        actions={
          <SegmentedControl
            value={segment}
            options={[
              { value: 'members', label: memberText },
              { value: 'passes', label: passText },
            ]}
            onChange={(next) => setActiveTab(next)}
            aria-label={`${labels.customer.singular} 메뉴`}
            fullWidth
            className="w-full sm:w-auto min-w-[180px]"
          />
        }
      />
      {segment === 'members' ? <MembersView /> : <PassesView />}
    </div>
  );
};
