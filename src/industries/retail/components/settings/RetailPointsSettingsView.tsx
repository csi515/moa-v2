import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import { ArrowLeft, Coins, Save } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import * as orgService from '@/core/organizations/services/organizationService';
import { StorageService } from '@/services/storage';
import { PageHeader } from '@/shared/components';
import {
  FormField,
  FORM_CONTROL_CLASS,
  SettingsCard,
  ToggleSwitch,
} from '@/shared/components/ui';
import {
  exampleEarnPoints,
  getRetailPointsSettings,
  POINT_WON_VALUE,
  POINTS_EARN_RATE_MAX,
  POINTS_EARN_RATE_MIN,
  POINTS_EARN_RATE_STEP,
  validateRetailPointsSettings,
  withRetailPointsSettings,
} from '../../points/pointsSettings';
import { RETAIL_POINTS_COPY as COPY } from './retailPointsCopy';

interface Props {
  onBack: () => void;
}

export const RetailPointsSettingsView: FC<Props> = ({ onBack }) => {
  const { showToast, triggerRefresh } = useApp();
  const { isOwner, isAdmin } = usePermissions();
  const org = useOrganization();
  const canEdit = isOwner || isAdmin;

  const initial = getRetailPointsSettings(StorageService.getSettings());
  const [enabled, setEnabled] = useState(initial.enabled);
  const [earnEnabled, setEarnEnabled] = useState(initial.earnEnabled);
  const [rateText, setRateText] = useState(String(initial.earnRatePercent));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = getRetailPointsSettings(StorageService.getSettings());
    setEnabled(next.enabled);
    setEarnEnabled(next.earnEnabled);
    setRateText(String(next.earnRatePercent));
  }, [org.currentOrganization?.id]);

  const rateNumber = Number(rateText);
  const examplePoints = useMemo(
    () => exampleEarnPoints(10000, Number.isFinite(rateNumber) ? rateNumber : 0),
    [rateNumber]
  );

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit || saving) return;
    if (!org.currentOrganization?.id) {
      showToast(COPY.noOrg, 'error');
      return;
    }

    const draft = {
      enabled,
      earnEnabled: enabled ? earnEnabled : false,
      earnRatePercent: rateText.trim() === '' ? Number.NaN : Number(rateText),
    };
    const error = validateRetailPointsSettings(draft);
    if (error) {
      showToast(error, 'error');
      return;
    }

    setSaving(true);
    const previous = StorageService.getSettings();
    const next = withRetailPointsSettings(previous, {
      enabled: draft.enabled,
      earnEnabled: draft.earnEnabled,
      earnRatePercent: draft.earnRatePercent,
    });
    try {
      StorageService.saveSettings(next);
      await orgService.updateOrganization(org.currentOrganization.id, {
        settings: { features: next.features },
      });
      const saved = getRetailPointsSettings(next);
      setEnabled(saved.enabled);
      setEarnEnabled(saved.earnEnabled);
      setRateText(String(saved.earnRatePercent));
      triggerRefresh();
      showToast(COPY.saved, 'success');
    } catch (err) {
      StorageService.saveSettings(previous);
      const rolled = getRetailPointsSettings(previous);
      setEnabled(rolled.enabled);
      setEarnEnabled(rolled.earnEnabled);
      setRateText(String(rolled.earnRatePercent));
      showToast(err instanceof Error ? err.message : COPY.saveError, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-8">
      <PageHeader
        density="compact"
        icon={<Coins className="w-5 h-5" />}
        iconClassName="text-teal-600"
        title={COPY.pointsTitle}
        description={COPY.pointsDescription}
        actions={
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 min-h-[44px] px-2 text-sm font-bold text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
            {COPY.back}
          </button>
        }
      />

      <form onSubmit={handleSave} className="space-y-4">
        <SettingsCard title="기본">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">{COPY.useLabel}</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {COPY.useHint}
                </p>
              </div>
              <ToggleSwitch
                enabled={enabled}
                onChange={(next) => {
                  setEnabled(next);
                  if (!next) setEarnEnabled(false);
                }}
                ariaLabel={COPY.useLabel}
                activeClassName="bg-teal-600"
                disabled={!canEdit}
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">{COPY.earnLabel}</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {COPY.earnHint}
                </p>
              </div>
              <ToggleSwitch
                enabled={earnEnabled}
                onChange={setEarnEnabled}
                ariaLabel={COPY.earnLabel}
                activeClassName="bg-teal-600"
                disabled={!canEdit || !enabled}
              />
            </div>
          </div>
        </SettingsCard>

        <SettingsCard title="적립률">
          <FormField label={COPY.rateLabel} required>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={POINTS_EARN_RATE_MIN}
                max={POINTS_EARN_RATE_MAX}
                step={POINTS_EARN_RATE_STEP}
                value={rateText}
                disabled={!canEdit || !enabled || !earnEnabled}
                onChange={(e) => setRateText(e.target.value)}
                className={`${FORM_CONTROL_CLASS} min-h-[44px] max-w-[140px]`}
              />
              <span className="text-sm font-bold text-slate-700">{COPY.rateUnit}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {COPY.rateHint(POINTS_EARN_RATE_MIN, POINTS_EARN_RATE_MAX)}
            </p>
          </FormField>

          <p className="text-xs font-semibold text-slate-600 mt-3">
            {COPY.pointValue}
            {POINT_WON_VALUE === 1 ? '' : ` (${POINT_WON_VALUE}원)`}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {COPY.example(Number.isFinite(rateNumber) ? rateNumber : 0, examplePoints)}
          </p>
        </SettingsCard>

        {!canEdit && <p className="text-[11px] text-amber-700">{COPY.needAdmin}</p>}

        {canEdit && (
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[48px] px-5 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? COPY.saving : COPY.save}
          </button>
        )}
      </form>
    </div>
  );
};
