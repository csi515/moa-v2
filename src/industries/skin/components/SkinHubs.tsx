import type { FC } from 'react';
import { useModuleLabels } from '@/core/labels';
import { PilatesCustomerHubView } from '@/industries/pilates/components/PilatesCustomerHubView';
import { PilatesScheduleHubView } from '@/industries/pilates/components/PilatesScheduleHubView';

export const SkinScheduleHubView: FC<{
  bookingsView: FC;
  servicesView: FC;
}> = ({ bookingsView, servicesView }) => {
  const labels = useModuleLabels();
  return (
    <PilatesScheduleHubView
      bookingsView={bookingsView}
      servicesView={servicesView}
      bookingsLabel={labels.schedule.singular}
      servicesLabel={labels.service.management}
    />
  );
};

export const SkinCustomerHubView: FC<{
  membersView: FC;
  passesView: FC;
}> = ({ membersView, passesView }) => {
  const labels = useModuleLabels();
  return (
    <PilatesCustomerHubView
      membersView={membersView}
      passesView={passesView}
      membersLabel={labels.customer.singular}
      passesLabel="관리권"
    />
  );
};
