import React, { useState } from 'react';
import { Loader2, UserX } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { SettingsCard } from '@/shared/components/ui';
import { deleteMyAccount } from './accountService';

interface AccountDeletionCardProps {
  description?: string;
}

export const AccountDeletionCard: React.FC<AccountDeletionCardProps> = ({
  description = '계정 삭제 시 로그인 정보가 제거되며, 조직 멤버십이 해제됩니다. 학원 운영 데이터는 조직 소유로 유지될 수 있습니다.',
}) => {
  const { user, signOut } = useAuth();
  const { showToast, openConfirmDialog } = useApp();
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const handleDelete = () => {
    openConfirmDialog({
      title: '계정 탈퇴',
      message:
        '정말 계정을 탈퇴하시겠습니까?\n삭제 후에는 동일 이메일로 다시 가입할 수 있으나, 이전 연결 정보는 복구되지 않을 수 있습니다.\n\n원장(owner) 계정은 학원 소유권 이전 후 탈퇴 가능합니다.',
      isDestructive: true,
      confirmText: '탈퇴하기',
      onConfirm: async () => {
        setDeleting(true);
        try {
          await deleteMyAccount();
          await signOut();
          showToast('계정이 삭제되었습니다.', 'info');
        } catch (err) {
          const message =
            err instanceof Error ? err.message : '계정 탈퇴에 실패했습니다.';
          showToast(message, 'error');
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  return (
    <SettingsCard title="계정" icon={<UserX className="w-4 h-4 text-rose-600" />}>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      <p className="text-xs text-slate-600 font-mono mt-2 break-all">{user.email}</p>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="mt-4 w-full py-3 min-h-[44px] rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
        {deleting ? '처리 중…' : '계정 탈퇴'}
      </button>
    </SettingsCard>
  );
};
