import { StaffHoursFields } from './components/settings/StaffHoursFields';
import { registerAcademyStaffHoursFields } from '@/core/academy/academyStaffUi';

registerAcademyStaffHoursFields((props) => <StaffHoursFields {...props} />);
