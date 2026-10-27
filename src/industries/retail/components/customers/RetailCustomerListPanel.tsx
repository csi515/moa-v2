import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import type { FC } from 'react';
import { Users, Coins } from 'lucide-react';
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
}) => (
  <div className="p-4 sm:p-6 space-y-4">
    <PageHeader 
      title={COPY.listTitle} 
      description={COPY.listDescription}
      icon={<Users className="w-5 h-5 text-indigo-600" />}
      actions={
        onOpenManualPoint ? (
          <button
            onClick={onOpenManualPoint}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-100 min-h-[44px]"
          >
            <Coins className="w-4 h-4" />
            수동 적립/차감
          </button>
        ) : undefined
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
      <PageListSkeleton rows={4} message="회원 목록을 불러오는 중입니다..." />
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
                <span className="font-bold text-indigo-600 tabular-nums text-sm shrink-0">
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
