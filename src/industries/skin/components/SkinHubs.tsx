import type { FC } from 'react';
import { useModuleLabels } from '@/core/labels';
import { BookingCustomerHubView } from '@/capabilities/booking/ui/BookingCustomerHubView';
import { BookingScheduleHubView } from '@/capabilities/booking/ui/BookingScheduleHubView';

export const SkinScheduleHubView: FC<{
  bookingsView: FC;
  servicesView: FC;
}> = ({ bookingsView, servicesView }) => {
  const labels = useModuleLabels();
  return (
    <BookingScheduleHubView
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
    <BookingCustomerHubView
      membersView={membersView}
      passesView={passesView}
      membersLabel={labels.customer.singular}
      passesLabel="관리권"
    />
  );
};
