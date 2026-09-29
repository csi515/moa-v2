import type { FC } from 'react';
import { Link2, Mail, Phone } from 'lucide-react';
import type { CustomerProfile } from '../services/customerLinkService';

const COPY = {
  name: '이름',
  phone: '전화번호',
  email: '이메일',
  status: '고객 상태',
  phoneNone: '전화 없음',
  emailNone: '이메일 없음',
  linked: '앱 연동',
  unlinked: '미연동',
  registeredAt: '등록일',
} as const;

function statusLabel(status: string): { label: string; className: string } {
  const key = status.trim().toLowerCase();
  const map: Record<string, { label: string; className: string }> = {
    active: { label: '이용중', className: 'bg-emerald-100 text-emerald-800' },
    leave: { label: '휴면', className: 'bg-amber-100 text-amber-800' },
    withdrawn: { label: '종료', className: 'bg-slate-100 text-slate-600' },
    inactive: { label: '비활성', className: 'bg-slate-100 text-slate-600' },
  };
  return map[key] ?? { label: status || '-', className: 'bg-slate-100 text-slate-600' };
}

function formatRegisteredAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR');
}

interface Props {
  customer: CustomerProfile;
}

/**
 * Core Customer 기본 정보 카드.
 * 사업장 업종과 무관 — name/phone/email/status 등 기존 customers 필드만 표시.
 */
export const CoreCustomerInfoCard: FC<Props> = ({ customer }) => {
  const status = statusLabel(customer.status);

  return (
    <dl className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-sm">
      <div>
        <dt className="text-xs font-bold text-slate-500">{COPY.name}</dt>
        <dd className="mt-0.5 font-bold text-slate-900">{customer.name}</dd>
      </div>
      <div>
        <dt className="text-xs font-bold text-slate-500">{COPY.phone}</dt>
        <dd className="mt-0.5 font-semibold text-slate-800 flex items-center gap-1.5">
          <Phone className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
          {customer.phone?.trim() || COPY.phoneNone}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-bold text-slate-500">{COPY.email}</dt>
        <dd className="mt-0.5 font-semibold text-slate-800 flex items-center gap-1.5">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
          {customer.email?.trim() || COPY.emailNone}
        </dd>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <dt className="text-xs font-bold text-slate-500">{COPY.status}</dt>
          <dd className="mt-1">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.className}`}
            >
              {status.label}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Link2 className="w-3 h-3" aria-hidden />
            앱
          </dt>
          <dd className="mt-1 text-xs font-semibold text-slate-700">
            {customer.isLinked ? COPY.linked : COPY.unlinked}
          </dd>
        </div>
        <div className="ml-auto text-right">
          <dt className="text-xs font-bold text-slate-500">{COPY.registeredAt}</dt>
          <dd className="mt-0.5 text-xs font-semibold text-slate-700">
            {formatRegisteredAt(customer.createdAt)}
          </dd>
        </div>
      </div>
    </dl>
  );
};
