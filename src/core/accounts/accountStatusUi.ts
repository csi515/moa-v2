export type AccountLinkStatus = 'none' | 'invited' | 'connected';

const ACCOUNT_STATUS_LABELS: Record<AccountLinkStatus, string> = {
  none: '미연결',
  invited: '초대됨',
  connected: '연결됨',
};

const ACCOUNT_STATUS_CLASSES: Record<AccountLinkStatus, string> = {
  none: 'bg-slate-100 text-slate-600',
  invited: 'bg-amber-50 text-amber-700',
  connected: 'bg-emerald-50 text-emerald-700',
};

export function getAccountStatusLabel(status: AccountLinkStatus): string {
  return ACCOUNT_STATUS_LABELS[status];
}

export function getAccountStatusClass(status: AccountLinkStatus): string {
  return ACCOUNT_STATUS_CLASSES[status];
}
