import { StaffHoursFields } from './components/settings/StaffHoursFields';
import { registerStaffHoursFields } from '@/core/staff/staffUi';

registerStaffHoursFields((props) => <StaffHoursFields {...props} />);
