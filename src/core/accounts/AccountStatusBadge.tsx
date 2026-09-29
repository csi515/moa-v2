import type { AccountLinkStatus } from './accountStatusUi';
import { getAccountStatusClass, getAccountStatusLabel } from './accountStatusUi';

interface AccountStatusBadgeProps {
  status: AccountLinkStatus;
  loading?: boolean;
  size?: 'sm' | 'md';
}

export function AccountStatusBadge({
  status,
  loading = false,
  size = 'sm',
}: AccountStatusBadgeProps) {
  if (loading) {
    return (
      <span
        className={`inline-flex items-center rounded-md bg-slate-100 text-slate-400 font-bold ${
          size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
        }`}
      >
        조회 중…
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-md font-bold ${getAccountStatusClass(status)} ${
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      {getAccountStatusLabel(status)}
    </span>
  );
}
