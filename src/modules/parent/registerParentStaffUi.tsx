import { GuardianLinkInviteModal } from './GuardianLinkInviteModal';
import { ParentInviteResultModal } from './ParentInviteResultModal';
import {
  registerGuardianInvite,
  registerParentInviteResult,
} from '@/core/staff/staffUi';

registerGuardianInvite((props) => <GuardianLinkInviteModal {...props} />);
registerParentInviteResult((props) => <ParentInviteResultModal {...props} />);
