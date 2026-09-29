import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  clearPendingStaffLink,
  peekPendingStaffLink,
  STAFF_LINK_PENDING_EVENT,
} from '@/core/platform/pendingStaffLink';
import { showToast } from '@/shared/feedback/uiFeedback';
import type { AcceptStaffInviteResult } from '@/core/staff/services/staffAccountService';
import { StaffInviteAcceptModal } from './StaffInviteAcceptModal';

/**
 * ?staff_link=CODE 로 들어온 사용자가 로그인하면 수락 모달을 띄운다.
 * 자동 수락하지 않는다 — 사용자가 사업장 이름을 확인하고 직접 수락해야 한다.
 */
export const PendingStaffInviteGate: React.FC = () => {
  const { session } = useAuth();
  const { refreshOrganizations, selectOrganization } = useOrganization();
  const [code, setCode] = useState<string | null>(null);

  const check = useCallback(() => {
    if (!session) return;
    const pending = peekPendingStaffLink();
    if (pending) setCode(pending);
  }, [session]);

  useEffect(() => {
    check();
    window.addEventListener(STAFF_LINK_PENDING_EVENT, check);
    return () => window.removeEventListener(STAFF_LINK_PENDING_EVENT, check);
  }, [check]);

  const handleClose = () => {
    clearPendingStaffLink();
    setCode(null);
  };

  const handleAccepted = async (result: AcceptStaffInviteResult) => {
    clearPendingStaffLink();
    setCode(null);
    showToast(`${result.organizationName}에 직원으로 연결되었습니다.`, 'success');
    await refreshOrganizations();
    if (result.organizationId) {
      try {
        await selectOrganization(result.organizationId);
      } catch {
        // 선택 실패 시 사업장 선택 화면에서 고를 수 있다
      }
    }
  };

  if (!session || !code) return null;
  return (
    <StaffInviteAcceptModal initialCode={code} onClose={handleClose} onAccepted={handleAccepted} />
  );
};
