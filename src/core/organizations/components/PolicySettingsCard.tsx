import { useCallback, useEffect, useState, type FC } from 'react';
import { Shield } from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  Button,
  FORM_CONTROL_CLASS,
  FormField,
  SettingsCard,
} from '@/shared/components/ui';
import {
  defaultAllocationPolicy,
  resolveAllocationPolicy,
  upsertAllocationPolicy,
  type AllocationPolicy,
  type PolicyMode,
} from '@/core/policies/allocationPolicyService';
import {
  defaultTaxPolicy,
  resolveTaxPolicy,
  upsertTaxPolicy,
  type TaxMode,
  type TaxPolicy,
} from '@/core/policies/taxPolicyService';
import {
  isBookingSideEffectEnabled,
  loadBookingLifecycleCatalog,
  setBookingSideEffectEnabled,
  type BookingLifecycleCatalog,
} from '@/core/policies/bookingLifecycleService';
import { POLICY_SETTINGS_COPY as COPY } from './policySettingsCopy';

const MODE_OPTIONS: { value: PolicyMode; label: string }[] = [
  { value: 'forbid', label: COPY.modeForbid },
  { value: 'warn', label: COPY.modeWarn },
  { value: 'allow', label: COPY.modeAllow },
];

export const PolicySettingsCard: FC = () => {
  const { showToast } = useApp();
  const org = useOrganization();
  const organizationId = org.currentOrganization?.id;

  const [allocation, setAllocation] = useState<AllocationPolicy | null>(null);
  const [tax, setTax] = useState<TaxPolicy | null>(null);
  const [lifecycle, setLifecycle] = useState<BookingLifecycleCatalog | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!organizationId) {
      setAllocation(null);
      setTax(null);
      setLifecycle(null);
      return;
    }
    setLoading(true);
    try {
      const [a, t, life] = await Promise.all([
        resolveAllocationPolicy(organizationId),
        resolveTaxPolicy(organizationId),
        loadBookingLifecycleCatalog(organizationId),
      ]);
      setAllocation(a);
      setTax(t);
      setLifecycle(life);
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setAllocation(defaultAllocationPolicy(organizationId));
      setTax(defaultTaxPolicy(organizationId));
    } finally {
      setLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!organizationId || !allocation || !tax || busy) return;
    setBusy(true);
    try {
      await upsertAllocationPolicy(organizationId, allocation);
      await upsertTaxPolicy(organizationId, { mode: tax.mode, rate: tax.rate });
      if (lifecycle) {
        await setBookingSideEffectEnabled(
          organizationId,
          'confirm',
          'notify',
          isBookingSideEffectEnabled(lifecycle, 'confirm', 'notify')
        );
        await setBookingSideEffectEnabled(
          organizationId,
          'cancel',
          'notify',
          isBookingSideEffectEnabled(lifecycle, 'cancel', 'notify')
        );
      }
      showToast(COPY.saved, 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.saveError, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleEffect = (command: 'confirm' | 'cancel', enabled: boolean) => {
    setLifecycle((prev) => {
      if (!prev) return prev;
      const list = [...(prev.sideEffects[command] ?? [])];
      const idx = list.findIndex((e) => e.effectKey === 'notify');
      if (idx >= 0) list[idx] = { ...list[idx], isEnabled: enabled };
      else list.push({ effectKey: 'notify', isEnabled: enabled });
      return {
        ...prev,
        sideEffects: { ...prev.sideEffects, [command]: list },
      };
    });
  };

  return (
    <SettingsCard title={COPY.title} icon={<Shield className="w-4 h-4 text-slate-700" />}>
      <div className="space-y-5">
        <p className="text-xs text-slate-500 leading-relaxed">{COPY.description}</p>

        {!organizationId ? (
          <p className="text-sm text-slate-500">{COPY.noOrg}</p>
        ) : loading || !allocation || !tax ? (
          <p className="text-sm text-slate-500 py-4 text-center">불러오는 중…</p>
        ) : (
          <>
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800">{COPY.allocationSection}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label={COPY.overbookLabel}>
                  <select
                    className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
                    value={allocation.overbookMode}
                    onChange={(e) =>
                      setAllocation({
                        ...allocation,
                        overbookMode: e.target.value as PolicyMode,
                      })
                    }
                  >
                    {MODE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={COPY.negativeStockLabel}>
                  <select
                    className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
                    value={allocation.negativeStockMode}
                    onChange={(e) =>
                      setAllocation({
                        ...allocation,
                        negativeStockMode: e.target.value as PolicyMode,
                      })
                    }
                  >
                    {MODE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <label className="flex items-center gap-2 min-h-[44px] text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allocation.allowWaitlist}
                  onChange={(e) =>
                    setAllocation({ ...allocation, allowWaitlist: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300"
                />
                {COPY.allowWaitlistLabel}
              </label>
              <label className="flex items-center gap-2 min-h-[44px] text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allocation.enableSafetyStockAlert}
                  onChange={(e) =>
                    setAllocation({
                      ...allocation,
                      enableSafetyStockAlert: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300"
                />
                {COPY.safetyAlertLabel}
              </label>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800">{COPY.taxSection}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label={COPY.taxModeLabel}>
                  <select
                    className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
                    value={tax.mode}
                    onChange={(e) =>
                      setTax({ ...tax, mode: e.target.value as TaxMode })
                    }
                  >
                    <option value="inclusive">{COPY.taxInclusive}</option>
                    <option value="exclusive">{COPY.taxExclusive}</option>
                  </select>
                </FormField>
                <FormField label={COPY.taxRateLabel}>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={tax.rate}
                    onChange={(e) =>
                      setTax({ ...tax, rate: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className={`${FORM_CONTROL_CLASS} min-h-[44px] tabular-nums`}
                  />
                </FormField>
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">{COPY.lifecycleSection}</h4>
              <label className="flex items-center gap-2 min-h-[44px] text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={
                    lifecycle
                      ? isBookingSideEffectEnabled(lifecycle, 'confirm', 'notify')
                      : true
                  }
                  onChange={(e) => toggleEffect('confirm', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                {COPY.notifyOnConfirm}
              </label>
              <label className="flex items-center gap-2 min-h-[44px] text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={
                    lifecycle
                      ? isBookingSideEffectEnabled(lifecycle, 'cancel', 'notify')
                      : false
                  }
                  onChange={(e) => toggleEffect('cancel', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                {COPY.notifyOnCancel}
              </label>
            </section>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleSave()}
                isLoading={busy}
                disabled={busy}
              >
                {COPY.save}
              </Button>
            </div>
          </>
        )}
      </div>
    </SettingsCard>
  );
};

export default PolicySettingsCard;
