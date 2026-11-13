import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  DEFAULT_MEAL_SURVEY_SETTINGS,
  activeMealSlots,
  mealSlotLabel,
  mealStatusLabel,
  responseMapKey,
  toDateKey,
  weekRange,
  type MealSlot,
  type MealSurveySettings,
} from '../domain/mealSurveyEngine';
import {
  listMealSurveyOverview,
  settingsRowToDomain,
  type MealSurveyOverview,
} from '../mealSurveyService';
import { MealSurveyManageGate } from './MealSurveyAccessGate';

function overviewSettings(overview: MealSurveyOverview | null): MealSurveySettings {
  if (!overview) return { ...DEFAULT_MEAL_SURVEY_SETTINGS };
  return settingsRowToDomain({
    organization_id: '',
    offer_breakfast: overview.settings.offer_breakfast,
    offer_lunch: overview.settings.offer_lunch,
    offer_dinner: overview.settings.offer_dinner,
  });
}

const MealSurveyManageInner: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const [anchor, setAnchor] = useState(() => new Date());
  const range = useMemo(() => weekRange(anchor), [anchor]);
  const [overview, setOverview] = useState<MealSurveyOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const slots = useMemo(() => activeMealSlots(overviewSettings(overview)), [overview]);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await listMealSurveyOverview(orgId, range.from, range.to);
      setOverview(data);
    } catch (cause) {
      showToast.error(cause, '현황 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orgId, range.from, range.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dayMap = useMemo(() => {
    const map = new Map<string, { eating: number; skipping: number; unset: number }>();
    for (const d of overview?.days ?? []) {
      map.set(responseMapKey(d.meal_date, d.meal_slot), {
        eating: d.eating_count,
        skipping: d.skipping_count,
        unset: d.unset_count,
      });
    }
    return map;
  }, [overview]);

  const dates = useMemo(() => {
    const set = new Set<string>();
    for (const d of overview?.days ?? []) set.add(d.meal_date);
    return [...set].sort();
  }, [overview]);

  function memberStatus(memberId: string, mealDate: string, slot: MealSlot) {
    const member = overview?.members.find((m) => m.member_id === memberId);
    const hit = member?.responses.find((r) => r.meal_date === mealDate && r.meal_slot === slot);
    return hit?.status ?? null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">조리팀 식수 모니터</h1>
          <p className="mt-1 text-sm text-slate-500">
            확정 식수(식사) · 대상 {overview?.member_count ?? '—'}명 · {range.from} ~ {range.to}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            to="/workspace/meal-survey/settings"
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
          >
            슬롯 설정
          </Link>
          <Link
            to="/workspace/meal-survey"
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
          >
            내 식수
          </Link>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="min-h-11 min-w-11 rounded-lg border border-slate-200"
          onClick={() =>
            setAnchor((prev) => {
              const next = new Date(prev);
              next.setDate(next.getDate() - 7);
              return next;
            })
          }
          aria-label="이전 주"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-slate-800">
          {range.from} ~ {range.to}
        </span>
        <button
          type="button"
          className="min-h-11 min-w-11 rounded-lg border border-slate-200"
          onClick={() =>
            setAnchor((prev) => {
              const next = new Date(prev);
              next.setDate(next.getDate() + 7);
              return next;
            })
          }
          aria-label="다음 주"
        >
          ›
        </button>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"
          onClick={() => setAnchor(new Date())}
        >
          이번 주
        </button>
      </div>

      {loading && !overview ? (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800">일자 × 슬롯 합계</h2>
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
                  {dates.map((mealDate) => (
                    <tr key={mealDate} className={mealDate === toDateKey(new Date()) ? 'bg-amber-50/40' : undefined}>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">{mealDate}</td>
                      {slots.map((slot) => {
                        const agg = dayMap.get(responseMapKey(mealDate, slot));
                        return (
                          <td key={slot} className="px-3 py-2 text-slate-700">
                            {agg
                              ? `식사 ${agg.eating} · 미식 ${agg.skipping} · 미응 ${agg.unset}`
                              : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800">멤버별</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="sticky left-0 bg-slate-50 px-3 py-2 font-medium">이름</th>
                    {dates.flatMap((mealDate) =>
                      slots.map((slot) => (
                        <th key={`${mealDate}-${slot}`} className="whitespace-nowrap px-2 py-2 font-medium">
                          {mealDate.slice(5)} {mealSlotLabel(slot)}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(overview?.members ?? []).map((member) => (
                    <tr key={member.member_id}>
                      <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 font-medium text-slate-800">
                        {member.display_name}
                      </td>
                      {dates.flatMap((mealDate) =>
                        slots.map((slot) => {
                          const status = memberStatus(member.member_id, mealDate, slot);
                          return (
                            <td key={`${mealDate}-${slot}`} className="px-2 py-2 text-center text-xs text-slate-600">
                              {mealStatusLabel(status)}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export const MealSurveyManagePage: React.FC = () => (
  <MealSurveyManageGate>
    <MealSurveyManageInner />
  </MealSurveyManageGate>
);
