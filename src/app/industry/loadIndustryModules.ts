import { installIndustryPlugins } from '@/core/industry/pluginHost';
import { registerPublicMyBookingsView } from '@/core/public/publicMyBookingsSlot';
import { MyReservationsView } from '@/modules/parent/views/ParentBookingsView';
import {
  registerParentStudentStampViewSlot,
  registerStudentStampBoardSlot,
} from '@/modules/parent/slots/parentPortalSlots';
import {
  ParentStudentStampView,
  StudentStampBoard,
} from '@/industries/piano/components/songProgress';
import './industryCapabilityMap';
import './capabilityNavigation';
import { INDUSTRY_MODULES } from './industryModules';

installIndustryPlugins(INDUSTRY_MODULES.map((m) => m.plugin));
registerPublicMyBookingsView(MyReservationsView);
registerParentStudentStampViewSlot(ParentStudentStampView);
registerStudentStampBoardSlot(StudentStampBoard);
