import { StaffHoursFields } from './components/settings/StaffHoursFields';
import { registerAcademyStaffHoursFields } from '@/core/staff/staffUi';

registerAcademyStaffHoursFields((props) => <StaffHoursFields {...props} />);

