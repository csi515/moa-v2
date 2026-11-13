import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  DEFAULT_MEAL_SURVEY_SETTINGS,
  activeMealSlots,
  cycleMealCellStatus,
  dayRange,
  isMealSlotWritable,
  listDatesInRange,
  mealSlotLabel,
  mealStatusLabel,
  monthRange,
  parseDateKey,
  responseMapKey,
  toDateKey,
  weekRange,
  type MealCellStatus,
  type MealSlot,
  type MealSurveySettings,
} from '../domain/mealSurveyEngine';
import {
  bulkSkipMealSurveyRange,
  clearMealSurveyResponse,
  ensureMealSurveySettings,
  listMyMealSurveyResponses,
  settingsRowToDomain,
  upsertMealSurveyResponse,
} from '../mealSurveyService';
import { useMealSurveyManageAccess } from './MealSurveyAccessGate';

type ViewMode = 'month' | 'week' | 'day';

const VIEW_LABELS: Record<ViewMode, string> = {
  month: '월',
  week: '주',
  day: '일',
};

function statusClass(status: MealCellStatus): string {
  if (status === 'eating') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'skipping') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-white text-slate-400 border-slate-200';
}

export const MealSurveyMyView: React.FC = () => {
  const { currentOrganization, selectedMembership } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const memberId = selectedMembership?.id ?? null;
  const canManage = useMealSurveyManageAccess();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [settings, setSettings] = useState<MealSurveySettings | null>({
    ...DEFAULT_MEAL_SURVEY_SETTINGS,
  });
  const [statusByKey, setStatusByKey] = useState<Record<string, MealCellStatus>>({});
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const range = useMemo(() => {
    if (viewMode === 'month') return monthRange(anchor);
    if (viewMode === 'week') return weekRange(anchor);
    return dayRange(anchor);
  }, [anchor, viewMode]);

  const dates = useMemo(() => listDatesInRange(range.from, range.to), [range.from, range.to]);
  const slots = useMemo(() => (settings ? activeMealSlots(settings) : []), [settings]);

  const reload = useCallback(async () => {
    if (!orgId || !memberId) return;
    setLoading(true);
    try {
      const settingsRow = await ensureMealSurveySettings(orgId);
      const domain = settingsRowToDomain(settingsRow);
      setSettings(domain);
      const rows = await listMyMealSurveyResponses(orgId, memberId, range.from, range.to);
      const next: Record<string, MealCellStatus> = {};
      for (const row of rows) {
        next[responseMapKey(row.meal_date, row.meal_slot)] = row.status;
      }
      setStatusByKey(next);
    } catch (cause) {
      showToast.error(cause, '조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orgId, memberId, range.from, range.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function shiftAnchor(delta: number) {
    setAnchor((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') next.setMonth(next.getMonth() + delta);
      else if (viewMode === 'week') next.setDate(next.getDate() + delta * 7);
      else next.setDate(next.getDate() + delta);
      return next;
    });
  }

  async function handleCycle(mealDate: string, mealSlot: MealSlot) {
    if (!orgId || !settings) return;
    if (!isMealSlotWritable(settings, mealDate, mealSlot)) {
      showToast('해당 끼니 신청이 마감되었습니다.', 'error');
      return;
    }
    const key = responseMapKey(mealDate, mealSlot);
    const current = statusByKey[key] ?? null;
    const next = cycleMealCellStatus(current);
    setBusyKey(key);
    try {
      if (next === null) {
        await clearMealSurveyResponse({ organizationId: orgId, mealDate, mealSlot });
      } else {
        await upsertMealSurveyResponse({
          organizationId: orgId,
          mealDate,
          mealSlot,
          status: next,
        });
      }
      setStatusByKey((prev) => ({ ...prev, [key]: next }));
    } catch (cause) {
      showToast.error(cause, '저장에 실패했습니다.');
      await reload();
    } finally {
      setBusyKey(null);
    }
  }

  async function handleBulkSkip(scope: 'day' | 'week') {
    if (!orgId) return;
    const r = scope === 'day' ? dayRange(anchor) : weekRange(anchor);
    try {
      const result = await bulkSkipMealSurveyRange({
        organizationId: orgId,
        from: r.from,
        to: r.to,
      });
      showToast(`불참 처리 ${result.skipped_cells}칸 반영`, 'success');
      await reload();
    } catch (cause) {
      showToast.error(cause, '불참 처리 실패');
    }
  }

  const title =
    viewMode === 'month'
      ? `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`
      : viewMode === 'week'
        ? `${range.from} ~ ${range.to}`
        : range.from;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">내 식수</h1>
          <p className="mt-1 text-sm text-slate-500">
            탭하면 식사 → 미식사 → 미응답. 마감 후에는 변경할 수 없습니다.
            {settings?.defaultEating ? ' (평일 기본 식사 ON)' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
            onClick={() => void handleBulkSkip('day')}
          >
            오늘 불참
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
            onClick={() => void handleBulkSkip('week')}
          >
            이번 주 불참
          </button>
          {canManage && (
            <>
              <Link
                to="/workspace/meal-survey/manage"
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
              >
                조리팀 현황
              </Link>
              <Link
                to="/workspace/meal-survey/settings"
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
              >
                슬롯·마감 설정
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
          {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`min-h-11 min-w-11 rounded-md px-3 text-sm ${
                viewMode === mode ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              {VIEW_LABELS[mode]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-lg border border-slate-200"
            onClick={() => shiftAnchor(-1)}
            aria-label="이전"
          >
            ‹
          </button>
          <span className="min-w-[9rem] text-center text-sm font-medium text-slate-800">{title}</span>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-lg border border-slate-200"
            onClick={() => shiftAnchor(1)}
            aria-label="다음"
          >
            ›
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"
            onClick={() => setAnchor(new Date())}
          >
            오늘
          </button>
        </div>
      </div>

      {loading && !settings ? (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      ) : !settings || slots.length === 0 ? (
        <p className="text-sm text-slate-500">제공 중인 식사가 없습니다. 관리자에게 설정을 요청하세요.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">날짜</th>
                {slots.map((slot) => (
                  <th key={slot} className="px-3 py-2 font-medium">
                    {mealSlotLabel(slot)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((mealDate) => {
                const d = parseDateKey(mealDate);
                const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
                const isToday = mealDate === toDateKey(new Date());
                return (
                  <tr key={mealDate} className={isToday ? 'bg-amber-50/40' : undefined}>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {mealDate.slice(5)} ({weekday})
                    </td>
                    {slots.map((slot) => {
                      const key = responseMapKey(mealDate, slot);
                      const status = statusByKey[key] ?? null;
                      return (
                        <td key={slot} className="px-2 py-2">
                          <button
                            type="button"
                            disabled={busyKey === key}
                            onClick={() => void handleCycle(mealDate, slot)}
                            className={`min-h-11 w-full rounded-lg border px-2 text-xs font-medium ${statusClass(status)}`}
                          >
                            {mealStatusLabel(status)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
