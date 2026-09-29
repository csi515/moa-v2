import type { FC } from 'react';
import { Users } from 'lucide-react';
import type { CustomerSearchResult } from '@/core/customer/services/customerLinkService';
import { EmptyState, PageHeader } from '@/shared/components';
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
}

export const RetailCustomerListPanel: FC<Props> = ({
  search,
  onSearchChange,
  loading,
  customers,
  filtered,
  balances,
  onSelect,
}) => (
  <div className="p-4 sm:p-6 space-y-4">
    <PageHeader title={COPY.listTitle} description={COPY.listDescription} />

    <FilterBar>
      <SearchField
        value={search}
        onChange={onSearchChange}
        placeholder={COPY.searchPlaceholder}
      />
    </FilterBar>

    {loading ? (
      <p className="text-sm text-slate-500 py-8 text-center">불러오는 중…</p>
    ) : filtered.length === 0 ? (
      <EmptyState
        icon={<Users className="w-10 h-10" />}
        title={customers.length === 0 ? COPY.emptyTitle : COPY.emptyFilterTitle}
        description={
          customers.length === 0 ? COPY.emptyDescription : COPY.emptyFilterDescription
        }
      />
    ) : (
      <ul className="space-y-2">
        {filtered.map((customer) => {
          const balance = balances.get(customer.id) ?? 0;
          return (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => onSelect(customer)}
                className="w-full min-h-[56px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-slate-50"
              >
                <span className="min-w-0">
                  <span className="block font-bold text-slate-900 truncate">
                    {customer.name}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5 truncate">
                    {customer.phone?.trim() || COPY.phoneNone}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-teal-700">
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
