import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import type { FC } from 'react';
import { Users, Coins, Wallet } from 'lucide-react';
import type { CustomerSearchResult } from '@/core/customer/services/customerLinkService';
import { EmptyState } from '@/shared/components';
import { PageHeader } from '@/shared/components/ui';
import { FilterBar, SearchField } from '@/shared/components/ui';
import { RETAIL_CUSTOMER_COPY as COPY } from './customerCopy';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  customers: CustomerSearchResult[];
  filtered: CustomerSearchResult[];
  balances: Map<string, number>;
  onSelect: (customer: CustomerSearchResult) => void;
  onOpenManualPoint?: () => void;
  onOpenCreditCharge?: () => void;
}

export const RetailCustomerListPanel: FC<Props> = ({
  search,
  onSearchChange,
  loading,
  customers,
  filtered,
  balances,
  onSelect,
  onOpenManualPoint,
  onOpenCreditCharge,
}) => (
  <div className="space-y-4">
    <PageHeader 
      title={COPY.listTitle} 
      description={COPY.listDescription}
      icon={<Users className="w-5 h-5 text-slate-800" />}
      actions={
        <div className="flex items-center gap-2">
          {onOpenCreditCharge && (
            <button
              onClick={onOpenCreditCharge}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-800 text-xs sm:text-sm font-bold rounded-xl hover:bg-teal-100 min-h-[44px] cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              예치금 충전
            </button>
          )}
          {onOpenManualPoint && (
            <button
              onClick={onOpenManualPoint}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl hover:bg-slate-100 min-h-[44px] cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              포인트 조정
            </button>
          )}
        </div>
      }
    />

    <FilterBar>
      <SearchField
        value={search}
        onChange={onSearchChange}
        placeholder={COPY.searchPlaceholder}
      />
    </FilterBar>

    {loading ? (
      <PageListSkeleton rows={4} message="고객 목록을 불러오는 중입니다..." />
    ) : filtered.length === 0 ? (
      <EmptyState
        icon={<Users className="w-10 h-10" />}
        title={COPY.emptyTitle}
        description={search ? COPY.emptyFilterDescription : COPY.emptyDescription}
      />
    ) : (
      <ul className="space-y-3">
        {filtered.map((customer) => {
          const balance = balances.get(customer.id) ?? 0;
          return (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => onSelect(customer)}
                className="w-full min-h-[56px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{customer.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    {customer.phone || '-'}
                  </p>
                </div>
                <span className="font-bold text-slate-800 tabular-nums text-sm shrink-0">
                  {balance.toLocaleString('ko-KR')}
                  {COPY.pointsUnit}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);
