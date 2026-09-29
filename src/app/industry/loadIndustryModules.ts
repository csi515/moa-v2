import { installIndustryPlugins } from '@/core/industry/pluginHost';
import { registerPublicMyBookingsView } from '@/core/public/publicMyBookingsSlot';
import { MyReservationsView } from '@/modules/parent/views/ParentBookingsView';
import './industryCapabilityMap';
import './capabilityNavigation';
import { INDUSTRY_MODULES } from './industryModules';

installIndustryPlugins(INDUSTRY_MODULES.map((m) => m.plugin));
registerPublicMyBookingsView(MyReservationsView);
