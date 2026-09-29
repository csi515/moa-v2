import { useMemo, type FC } from 'react';
import { Calendar, Dumbbell } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { PageHeader, SegmentedControl } from '@/shared/components';

type ScheduleSegment = 'bookings' | 'services';

/** 예약형 일정 허브 — 예약·서비스(수업/시술) */
export const PilatesScheduleHubView: FC<{
  bookingsView: FC;
  servicesView: FC;
  bookingsLabel?: string;
  servicesLabel?: string;
}> = ({
  bookingsView: BookingsView,
  servicesView: ServicesView,
  bookingsLabel,
  servicesLabel,
}) => {
  const labels = useModuleLabels();
  const bookingText = bookingsLabel ?? labels.schedule.singular;
  const serviceText = servicesLabel ?? labels.service.management;
  const { activeTab, setActiveTab } = useApp();
  const segment: ScheduleSegment = useMemo(
    () => (activeTab === 'services' ? 'services' : 'bookings'),
    [activeTab]
  );

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={
          segment === 'bookings' ? (
            <Calendar className="w-5 h-5" />
          ) : (
            <Dumbbell className="w-5 h-5" />
          )
        }
        title="일정"
        description={segment === 'bookings' ? labels.schedule.management : serviceText}
        actions={
          <SegmentedControl
            value={segment}
            options={[
              { value: 'bookings', label: bookingText },
              { value: 'services', label: serviceText },
            ]}
            onChange={(next) => setActiveTab(next)}
            aria-label="일정 메뉴"
            fullWidth
            className="w-full sm:w-auto min-w-[180px]"
          />
        }
      />
      {segment === 'bookings' ? <BookingsView /> : <ServicesView />}
    </div>
  );
};
