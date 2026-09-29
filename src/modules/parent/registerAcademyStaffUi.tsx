import { GuardianLinkInviteModal } from './GuardianLinkInviteModal';
import { ParentInviteResultModal } from './ParentInviteResultModal';
import {
  registerAcademyGuardianInvite,
  registerAcademyParentInviteResult,
} from '@/core/academy/academyStaffUi';

registerAcademyGuardianInvite((props) => <GuardianLinkInviteModal {...props} />);
registerAcademyParentInviteResult((props) => <ParentInviteResultModal {...props} />);
