import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  DEFAULT_MBO_CYCLE,
  type MboCycleSettings,
} from '../domain/mboCycle';
import { getMboCycleSettings, upsertMboCycleSettings } from '../services/mboCycleService';

type Props = {
  onChange?: (settings: MboCycleSettings) => void;
};

export function MboCycleSettingsCard({ onChange }: Props) {
  const { isOwner, isAdmin } = usePermissions();
  const { currentOrganization } = useOrganization();
  const canEdit = isOwner || isAdmin;
  const [settings, setSettings] = useState<MboCycleSettings>(DEFAULT_MBO_CYCLE);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const orgId = currentOrganization?.id;
    if (!orgId) return;
    void getMboCycleSettings(orgId)
      .then((next) => {
        setSettings(next);
        onChange?.(next);
      })
      .catch(() => {
        setSettings(DEFAULT_MBO_CYCLE);
        onChange?.(DEFAULT_MBO_CYCLE);
      });
  }, [currentOrganization?.id, onChange]);

  async function save() {
    const orgId = currentOrganization?.id;
    if (!orgId || !canEdit) return;
    setBusy(true);
    try {
      const next = await upsertMboCycleSettings(orgId, settings);
      setSettings(next);
      onChange?.(next);
      showToast('목표 잠금과 평가 기간이 저장되었습니다.', 'success');
    } catch (error) {
      showToast.error(error, '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-indigo-600" />
        <h2 className="text-sm font-extrabold text-slate-900">목표 잠금 · 연말 평가 기간</h2>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        분기 진행 기록은 연중 작성할 수 있습니다. 잠금 이후에는 목표 문장과 핵심 지표만 막히고, 연말 평가는 아래 기간에만 열립니다.
        평가 점수는 급여·승진으로 연결되지 않습니다.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-12 items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={settings.goalLockEnabled}
            disabled={!canEdit}
            onChange={(event) => setSettings((current) => ({ ...current, goalLockEnabled: event.target.checked }))}
          />
          목표 잠금 사용
        </label>
        <div className="flex gap-2">
          <label className="flex-1 text-xs font-bold text-slate-600">
            잠금 월
            <input
              type="number"
              min={1}
              max={12}
              disabled={!canEdit || !settings.goalLockEnabled}
              value={settings.goalLockMonth}
              className="mt-1 min-h-12 w-full rounded-xl border px-3"
              onChange={(event) => setSettings((current) => ({ ...current, goalLockMonth: Number(event.target.value) }))}
            />
          </label>
          <label className="flex-1 text-xs font-bold text-slate-600">
            잠금 일
            <input
              type="number"
              min={1}
              max={31}
              disabled={!canEdit || !settings.goalLockEnabled}
              value={settings.goalLockDay}
              className="mt-1 min-h-12 w-full rounded-xl border px-3"
              onChange={(event) => setSettings((current) => ({ ...current, goalLockDay: Number(event.target.value) }))}
            />
          </label>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <label className="flex-1 text-xs font-bold text-slate-600">
            평가 시작 월
            <input
              type="number"
              min={1}
              max={12}
              disabled={!canEdit}
              value={settings.reviewStartMonth}
              className="mt-1 min-h-12 w-full rounded-xl border px-3"
              onChange={(event) => setSettings((current) => ({ ...current, reviewStartMonth: Number(event.target.value) }))}
            />
          </label>
          <label className="flex-1 text-xs font-bold text-slate-600">
            시작 일
            <input
              type="number"
              min={1}
              max={31}
              disabled={!canEdit}
              value={settings.reviewStartDay}
              className="mt-1 min-h-12 w-full rounded-xl border px-3"
              onChange={(event) => setSettings((current) => ({ ...current, reviewStartDay: Number(event.target.value) }))}
            />
          </label>
          <label className="flex-1 text-xs font-bold text-slate-600">
            평가 종료 월
            <input
              type="number"
              min={1}
              max={12}
              disabled={!canEdit}
              value={settings.reviewEndMonth}
              className="mt-1 min-h-12 w-full rounded-xl border px-3"
              onChange={(event) => setSettings((current) => ({ ...current, reviewEndMonth: Number(event.target.value) }))}
            />
          </label>
          <label className="flex-1 text-xs font-bold text-slate-600">
            종료 일
            <input
              type="number"
              min={1}
              max={31}
              disabled={!canEdit}
              value={settings.reviewEndDay}
              className="mt-1 min-h-12 w-full rounded-xl border px-3"
              onChange={(event) => setSettings((current) => ({ ...current, reviewEndDay: Number(event.target.value) }))}
            />
          </label>
        </div>
      </div>
      {canEdit ? (
        <button
          type="button"
          disabled={busy}
          className="mt-4 min-h-12 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-50"
          onClick={() => void save()}
        >
          기간 설정 저장
        </button>
      ) : (
        <p className="mt-3 text-xs text-slate-500">사업주·관리자만 기간을 변경할 수 있습니다.</p>
      )}
    </section>
  );
}
