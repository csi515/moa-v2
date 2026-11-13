import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  DEFAULT_MEAL_SURVEY_SETTINGS,
  validateMealSurveySettings,
  type MealSurveySettings,
} from '../domain/mealSurveyEngine';
import {
  ensureMealSurveySettings,
  settingsRowToDomain,
  upsertMealSurveySettings,
} from '../mealSurveyService';
import { MealSurveyManageGate } from './MealSurveyAccessGate';

const MealSurveySettingsInner: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const [draft, setDraft] = useState<MealSurveySettings>({ ...DEFAULT_MEAL_SURVEY_SETTINGS });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const row = await ensureMealSurveySettings(orgId);
      setDraft(settingsRowToDomain(row));
    } catch (cause) {
      showToast.error(cause, '설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSave() {
    const check = validateMealSurveySettings(draft);
    if (!check.isValid) {
      showToast(check.error ?? '설정이 올바르지 않습니다.', 'error');
      return;
    }
    if (!orgId) return;
    setSaving(true);
    try {
      const row = await upsertMealSurveySettings(orgId, draft);
      setDraft(settingsRowToDomain(row));
      showToast('식수 설정을 저장했습니다.', 'success');
    } catch (cause) {
      showToast.error(cause, '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">식수 슬롯·마감 설정</h1>
          <p className="mt-1 text-sm text-slate-500">제공 식사와 끼니별 신청 마감(컷오프)을 설정합니다.</p>
        </div>
        <Link to="/workspace/meal-survey" className="text-sm text-slate-600 underline">
          내 식수로
        </Link>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      ) : (
        <>
          <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-medium text-slate-700">제공 식사</legend>
            {(
              [
                ['offerBreakfast', '조식'],
                ['offerLunch', '중식'],
                ['offerDinner', '석식'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex min-h-11 items-center gap-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={draft[key]}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-3 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={draft.defaultEating}
                onChange={(e) => setDraft((prev) => ({ ...prev, defaultEating: e.target.checked }))}
              />
              평일 기본 식사(기본 이용)
            </label>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-sm font-medium text-slate-700">끼니별 마감</legend>
            {(
              [
                ['breakfast', '조식', 'breakfastCutoffTime', 'breakfastCutoffPrevDay'],
                ['lunch', '중식', 'lunchCutoffTime', 'lunchCutoffPrevDay'],
                ['dinner', '석식', 'dinnerCutoffTime', 'dinnerCutoffPrevDay'],
              ] as const
            ).map(([, label, timeKey, prevKey]) => (
              <div key={timeKey} className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <label className="block text-sm text-slate-700">
                  {label} 마감 시각
                  <input
                    type="time"
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3"
                    value={draft[timeKey]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [timeKey]: e.target.value }))}
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2 text-xs text-slate-600 pb-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={draft[prevKey]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [prevKey]: e.target.checked }))}
                  />
                  전일 기준
                </label>
              </div>
            ))}
          </fieldset>
        </>
      )}

      <button
        type="button"
        disabled={saving || loading}
        onClick={() => void handleSave()}
        className="min-h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? '저장 중…' : '저장'}
      </button>
    </div>
  );
};

export const MealSurveySettingsPage: React.FC = () => (
  <MealSurveyManageGate>
    <MealSurveySettingsInner />
  </MealSurveyManageGate>
);
