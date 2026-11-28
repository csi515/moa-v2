import { useEffect, useMemo, useState, type FC, type KeyboardEvent } from 'react';
import { useUpdate } from '@refinedev/core';
import { UserPlus, Check, Phone } from 'lucide-react';
import {
  customerLinkService,
  type CustomerSearchResult,
} from '@/core/customer/services/customerLinkService';
import {
  CustomerForm,
  toCustomerWriteValues,
  type CustomerFormValues,
} from '@/core/customer/components/CustomerForm';
import { Button, SearchField } from '@/shared/components/ui';
import { SALE_POS_COPY as COPY } from './salePosCopy';

interface Props {
  organizationId: string;
  customer: CustomerSearchResult | null;
  onChange: (customer: CustomerSearchResult | null) => void;
  onError: (message: string) => void;
}

/**
 * 판매 고객 연결 — Core Customer 검색·선택·게스트 등록.
 * - 전화번호 뒷자리 4자리 초고속 매칭 및 Enter 즉시 선택 지원
 * - User 자동 연결 없음. customer_id null 허용.
 */
export const SaleCustomerPicker: FC<Props> = ({
  organizationId,
  customer,
  onChange,
  onError,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const { mutateAsync: updateCustomer } = useUpdate();

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await customerLinkService.searchCustomers(organizationId, q);
        if (!cancelled) setResults(rows);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [organizationId, query]);

  // 전화번호 뒷 4자리 검색 시 일치율 높은 순으로 정렬
  const sortedResults = useMemo(() => {
    const q = query.trim();
    if (!q || !/^\d{4}$/.test(q)) return results;
    return [...results].sort((a, b) => {
      const aEnd = a.phone?.replace(/[^\d]/g, '').endsWith(q) ? 1 : 0;
      const bEnd = b.phone?.replace(/[^\d]/g, '').endsWith(q) ? 1 : 0;
      return bEnd - aEnd;
    });
  }, [results, query]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (sortedResults.length === 1) {
        onChange(sortedResults[0]);
        setQuery('');
      }
    }
  };

  const handleRegister = async (values: CustomerFormValues) => {
    if (registering) return;
    const name = values.name.trim();
    if (!name) {
      onError(COPY.customerNeedName);
      return;
    }

    setRegistering(true);
    try {
      const phoneDigits = values.phone.replace(/\D/g, '');
      let matchedExisting = false;
      if (phoneDigits) {
        const found = await customerLinkService.searchCustomers(organizationId, phoneDigits, 8);
        matchedExisting = found.some(
          (row) => (row.phone ?? '').replace(/\D/g, '') === phoneDigits
        );
      }
      const id = await customerLinkService.ensureGuestCustomer({
        organizationId,
        name,
        phone: phoneDigits || null,
        source: 'retail_sale',
      });
      if (!matchedExisting && (values.memo.trim() || values.tags.length > 0)) {
        const payload = toCustomerWriteValues(values, { source: 'retail_sale', guest: true });
        await updateCustomer({
          resource: 'customers',
          id,
          values: { memo: payload.memo, metadata: payload.metadata },
        });
      }
      const created =
        (await customerLinkService.getCustomerById(organizationId, id)) ?? {
          id,
          name,
          phone: phoneDigits || null,
        };
      onChange(created);
      setRegisterOpen(false);
      setQuery('');
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.customerRegisterError);
    } finally {
      setRegistering(false);
    }
  };

  const formatPhoneWithHighlight = (phone: string, highlightDigit: string) => {
    if (!highlightDigit || highlightDigit.length < 2) return phone;
    const idx = phone.lastIndexOf(highlightDigit);
    if (idx === -1) return phone;
    return (
      <>
        {phone.slice(0, idx)}
        <span className="bg-amber-100 text-amber-900 font-bold px-0.5 rounded">
          {phone.slice(idx, idx + highlightDigit.length)}
        </span>
        {phone.slice(idx + highlightDigit.length)}
      </>
    );
  };

  if (customer) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          {COPY.customerOptional}
        </h3>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 min-h-[44px]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-teal-600 shrink-0" />
              <p className="font-bold text-slate-900 text-sm truncate">{customer.name}</p>
            </div>
            {customer.phone ? (
              <p className="text-xs text-slate-500 ml-5 font-mono">{customer.phone}</p>
            ) : (
              <p className="text-xs text-slate-400 ml-5">{COPY.customerNoPhone}</p>
            )}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            {COPY.customerClear}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-teal-600" />
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            고객 조회 및 포인트 적립
          </h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRegisterOpen((v) => !v)}
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
        >
          {registerOpen ? COPY.customerRegisterCancel : COPY.customerRegister}
        </Button>
      </div>

      {registerOpen ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <CustomerForm
            mode="create"
            onSubmit={handleRegister}
            onCancel={() => setRegisterOpen(false)}
            isSubmitting={registering}
            submitLabel={registering ? COPY.customerRegistering : COPY.customerRegisterSubmit}
            idPrefix="sale-customer"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div onKeyDown={handleKeyDown}>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="전화번호 뒷 4자리 또는 고객명 검색 (Enter로 선택)"
              className="w-full"
            />
          </div>

          {query.trim().length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white shadow-xs">
              {loading ? (
                <li className="px-3 py-2.5 text-xs text-slate-400">{COPY.customerSearching}</li>
              ) : sortedResults.length === 0 ? (
                <li className="px-3 py-2.5 text-xs text-slate-400">
                  {COPY.customerNoResults} — 위 [신규 고객 등록]으로 바로 추가할 수 있습니다.
                </li>
              ) : (
                sortedResults.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(row);
                        setQuery('');
                      }}
                      className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-teal-50/60 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-slate-900">{row.name}</span>
                        {row.phone && (
                          <span className="block text-xs font-mono text-slate-500">
                            {formatPhoneWithHighlight(row.phone, query.trim())}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-md shrink-0">
                        선택
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
