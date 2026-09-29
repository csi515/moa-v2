import { useEffect, useState, type FC } from 'react';
import { UserPlus } from 'lucide-react';
import {
  customerLinkService,
  type CustomerSearchResult,
} from '@/core/customer/services/customerLinkService';
import { FormField, FORM_CONTROL_CLASS, SearchField } from '@/shared/components/ui';
import { SALE_POS_COPY as COPY } from './salePosCopy';

interface Props {
  organizationId: string;
  customer: CustomerSearchResult | null;
  onChange: (customer: CustomerSearchResult | null) => void;
  onError: (message: string) => void;
}

/**
 * 판매 고객 연결 — Core Customer 검색·선택·게스트 등록.
 * User 자동 연결 없음. customer_id null 허용.
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
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await customerLinkService.searchCustomers(organizationId, query);
        if (!cancelled) setResults(rows);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [organizationId, query]);

  const handleRegister = async () => {
    if (registering) return;
    const name = regName.trim();
    if (!name) {
      onError(COPY.customerNeedName);
      return;
    }

    setRegistering(true);
    try {
      const id = await customerLinkService.ensureGuestCustomer({
        organizationId,
        name,
        phone: regPhone.trim() || null,
        source: 'retail_sale',
      });
      const created =
        (await customerLinkService.getCustomerById(organizationId, id)) ?? {
          id,
          name,
          phone: regPhone.trim() || null,
        };
      onChange(created);
      setRegisterOpen(false);
      setRegName('');
      setRegPhone('');
      setQuery('');
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.customerRegisterError);
    } finally {
      setRegistering(false);
    }
  };

  if (customer) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          {COPY.customerOptional}
        </h3>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 min-h-[44px]">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{customer.name}</p>
            {customer.phone ? (
              <p className="text-xs text-slate-500">{customer.phone}</p>
            ) : (
              <p className="text-xs text-slate-400">{COPY.customerNoPhone}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-xs font-bold text-slate-600 min-h-[44px] px-2"
          >
            {COPY.customerClear}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          {COPY.customerOptional}
        </h3>
        <button
          type="button"
          onClick={() => setRegisterOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 min-h-[44px] px-1"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {registerOpen ? COPY.customerRegisterCancel : COPY.customerRegister}
        </button>
      </div>

      <p className="text-[11px] text-slate-400">{COPY.customerNone}</p>

      {registerOpen ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
          <FormField label={COPY.customerName} required>
            <input
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
              placeholder={COPY.customerNamePlaceholder}
              autoComplete="name"
            />
          </FormField>
          <FormField label={COPY.customerPhone}>
            <input
              type="tel"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
              placeholder={COPY.customerPhonePlaceholder}
              autoComplete="tel"
            />
          </FormField>
          <button
            type="button"
            disabled={registering}
            onClick={() => void handleRegister()}
            className="w-full min-h-[44px] rounded-xl bg-slate-800 text-white text-sm font-bold disabled:opacity-60"
          >
            {registering ? COPY.customerRegistering : COPY.customerRegisterSubmit}
          </button>
        </div>
      ) : (
        <>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={COPY.customerSearchPlaceholder}
            className="w-full"
          />
          <ul className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
            {loading ? (
              <li className="px-3 py-2 text-xs text-slate-400">{COPY.customerSearching}</li>
            ) : results.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400">{COPY.customerNoResults}</li>
            ) : (
              results.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onChange(row)}
                    className="w-full text-left px-3 py-2.5 min-h-[44px] hover:bg-slate-50"
                  >
                    <span className="font-semibold text-sm text-slate-900">{row.name}</span>
                    {row.phone && (
                      <span className="block text-xs text-slate-500">{row.phone}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
};
