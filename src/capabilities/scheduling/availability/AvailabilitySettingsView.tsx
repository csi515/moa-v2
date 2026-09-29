import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { CalendarOff, Clock, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { PageHeader, EmptyState } from '@/shared/components';
import { availabilityCapability } from './availabilityCapability';
import {
  DAY_OF_WEEK_LABELS,
  type AvailabilityDayOfWeek,
  type AvailabilityOverride,
  type AvailabilityRule,
  type AvailabilitySlotMinutes,
  type AvailabilityTimeWindow,
} from './types';
import { getIntervalMinutes, getOverrideWindows } from './windows';

const WEEKDAYS: AvailabilityDayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAYS_MON_FRI: AvailabilityDayOfWeek[] = [1, 2, 3, 4, 5];
const SLOT_OPTIONS: AvailabilitySlotMinutes[] = [15, 20, 30, 45, 60];

type DayDraft = {
  enabled: boolean;
  windows: AvailabilityTimeWindow[];
};

function emptyDay(enabled = false): DayDraft {
  return {
    enabled,
    windows: [{ start_time: '14:00', end_time: '19:00' }],
  };
}

function rulesToDraft(rules: AvailabilityRule[]): Record<AvailabilityDayOfWeek, DayDraft> {
  const draft = Object.fromEntries(WEEKDAYS.map((d) => [d, emptyDay(false)])) as Record<
    AvailabilityDayOfWeek,
    DayDraft
  >;
  for (const d of WEEKDAYS) {
    const dayRules = rules.filter((r) => r.day_of_week === d);
    if (dayRules.length === 0) continue;
    draft[d] = {
      enabled: true,
      windows: dayRules.map((r) => ({
        start_time: r.start_time.slice(0, 5),
        end_time: r.end_time.slice(0, 5),
      })),
    };
  }
  return draft;
}

interface AvailabilitySettingsViewProps {
  title?: string;
  description?: string;
  defaultSlotTitle?: string;
  defaultSlotMinutes?: AvailabilitySlotMinutes;
  embedded?: boolean;
}

function toHm(value: string): string {
  return value.slice(0, 5);
}

export const AvailabilitySettingsView: FC<AvailabilitySettingsViewProps> = ({
  title = '가능 시간 설정',
  description = '매주 반복되는 가능 시간과 특정 날짜 예외를 설정합니다.',
  defaultSlotTitle = '상담',
  defaultSlotMinutes = 30,
  embedded = false,
}) => {
  const { currentOrganization } = useOrganization();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [dayDraft, setDayDraft] = useState<Record<AvailabilityDayOfWeek, DayDraft>>(() =>
    rulesToDraft([])
  );
  const [slotMinutes, setSlotMinutes] = useState<AvailabilitySlotMinutes>(defaultSlotMinutes);
  const [intervalMinutes, setIntervalMinutes] =
    useState<AvailabilitySlotMinutes>(defaultSlotMinutes);

  const [overrideDate, setOverrideDate] = useState('');
  const [overrideClosed, setOverrideClosed] = useState(true);
  const [overrideWindows, setOverrideWindows] = useState<AvailabilityTimeWindow[]>([
    { start_time: '14:00', end_time: '17:00' },
  ]);

  const load = useCallback(async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      const [nextRules, nextOverrides] = await Promise.all([
        availabilityCapability.listOrgRules(currentOrganization.id),
        availabilityCapability.listOrgOverrides(currentOrganization.id),
      ]);
      setRules(nextRules);
      setOverrides(nextOverrides);
      setDayDraft(rulesToDraft(nextRules));
      const sample = nextRules[0];
      if (sample) {
        setSlotMinutes(sample.slot_minutes);
        setIntervalMinutes(getIntervalMinutes(sample.slot_minutes, sample.metadata));
      }
    } catch (err) {
      console.error(err);
      showToast('가능 시간을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncSlots = useCallback(async () => {
    if (!currentOrganization) return;
    setSyncing(true);
    try {
      const result = await availabilityCapability.materializeSlots(currentOrganization.id);
      showToast(
        `슬롯 동기화 완료 · 생성 ${result.created} · 유지 ${result.kept} · 숨김 ${result.hidden}`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : '동기화에 실패했습니다.', 'error');
    } finally {
      setSyncing(false);
    }
  }, [currentOrganization]);

  const applyWeekdaySame = () => {
    const mon = dayDraft[1];
    const source = mon.enabled
      ? mon
      : WEEKDAYS_MON_FRI.map((d) => dayDraft[d]).find((d) => d.enabled) || mon;
    setDayDraft((prev) => {
      const next = { ...prev };
      for (const d of WEEKDAYS_MON_FRI) {
        next[d] = {
          enabled: true,
          windows: source.windows.map((w) => ({ ...w })),
        };
      }
      return next;
    });
    showToast('평일(월~금)에 동일 시간을 적용했습니다. 저장을 눌러 반영하세요.', 'info');
  };

  const updateDay = (day: AvailabilityDayOfWeek, patch: Partial<DayDraft>) => {
    setDayDraft((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  };

  const updateWindow = (
    day: AvailabilityDayOfWeek,
    index: number,
    patch: Partial<AvailabilityTimeWindow>
  ) => {
    setDayDraft((prev) => {
      const windows = prev[day].windows.map((w, i) => (i === index ? { ...w, ...patch } : w));
      return { ...prev, [day]: { ...prev[day], windows } };
    });
  };

  const handleSaveRules = async () => {
    if (!currentOrganization) return;

    for (const d of WEEKDAYS) {
      const draft = dayDraft[d];
      if (!draft.enabled) continue;
      for (const w of draft.windows) {
        if (!w.start_time || !w.end_time || w.start_time >= w.end_time) {
          showToast(`${DAY_OF_WEEK_LABELS[d]}요일 시간 구간을 확인하세요.`, 'warning');
          return;
        }
      }
    }

    setSaving(true);
    try {
      for (const d of WEEKDAYS) {
        await availabilityCapability.deactivateRulesForDay(currentOrganization.id, d);
        const draft = dayDraft[d];
        if (!draft.enabled) continue;
        for (const w of draft.windows) {
          await availabilityCapability.createRule(currentOrganization.id, {
            day_of_week: d,
            start_time: w.start_time,
            end_time: w.end_time,
            slot_minutes: slotMinutes,
            interval_minutes: intervalMinutes,
            title: defaultSlotTitle,
          });
        }
      }
      showToast('상담 가능시간을 저장했습니다.', 'success');
      await load();
      await syncSlots();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : '저장에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOverride = async () => {
    if (!currentOrganization || !overrideDate) {
      showToast('예외 날짜를 선택하세요.', 'warning');
      return;
    }
    if (!overrideClosed) {
      for (const w of overrideWindows) {
        if (!w.start_time || !w.end_time || w.start_time >= w.end_time) {
          showToast('예외 시간 구간을 확인하세요.', 'warning');
          return;
        }
      }
    }
    try {
      await availabilityCapability.upsertOverride(currentOrganization.id, {
        override_date: overrideDate,
        is_closed: overrideClosed,
        start_time: overrideClosed ? null : overrideWindows[0]?.start_time,
        end_time: overrideClosed ? null : overrideWindows[0]?.end_time,
        slot_minutes: overrideClosed ? null : slotMinutes,
        title: defaultSlotTitle,
        windows: overrideClosed ? undefined : overrideWindows,
      });
      showToast('날짜 예외를 저장했습니다.', 'success');
      setOverrideDate('');
      await load();
      await syncSlots();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : '예외 저장에 실패했습니다.', 'error');
    }
  };

  const handleRemoveOverride = async (id: string) => {
    try {
      await availabilityCapability.deactivateOverride(id);
      showToast('예외를 삭제했습니다.', 'info');
      await load();
      await syncSlots();
    } catch (err) {
      console.error(err);
      showToast('예외 삭제에 실패했습니다.', 'error');
    }
  };

  const enabledCount = useMemo(
    () => WEEKDAYS.filter((d) => dayDraft[d].enabled).length,
    [dayDraft]
  );

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-5' : 'space-y-4 pb-4'}>
      {!embedded && (
        <PageHeader
          icon={<Clock className="w-6 h-6" />}
          title={title}
          description={description}
          actions={
            <button
              type="button"
              onClick={() => void syncSlots()}
              disabled={syncing}
              className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl flex items-center gap-2"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              예약 슬롯 동기화
            </button>
          }
        />
      )}

      {embedded && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void syncSlots()}
            disabled={syncing}
            className="px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            슬롯 동기화
          </button>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">매주 반복되는 상담 가능시간</h3>
            <p className="text-xs text-slate-500 mt-0.5">활성화된 요일 {enabledCount}개</p>
          </div>
          <button
            type="button"
            onClick={applyWeekdaySame}
            className="min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
          >
            평일 동일 시간 적용
          </button>
        </div>

        <div className="space-y-3">
          {WEEKDAYS.map((day) => {
            const draft = dayDraft[day];
            return (
              <div
                key={day}
                className={`rounded-xl border p-3 space-y-2 ${
                  draft.enabled ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 min-h-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      onChange={(e) => updateDay(day, { enabled: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-sm font-bold text-slate-800 w-6">
                      {DAY_OF_WEEK_LABELS[day]}
                    </span>
                  </label>
                  {!draft.enabled && (
                    <span className="text-xs text-slate-400">상담 없음</span>
                  )}
                </div>

                {draft.enabled && (
                  <div className="space-y-2 pl-1 sm:pl-8">
                    {draft.windows.map((win, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={win.start_time}
                          onChange={(e) => updateWindow(day, idx, { start_time: e.target.value })}
                          className="px-2.5 py-2 min-h-[40px] text-sm rounded-lg border border-slate-200 bg-white"
                        />
                        <span className="text-slate-400 text-xs">─</span>
                        <input
                          type="time"
                          value={win.end_time}
                          onChange={(e) => updateWindow(day, idx, { end_time: e.target.value })}
                          className="px-2.5 py-2 min-h-[40px] text-sm rounded-lg border border-slate-200 bg-white"
                        />
                        {draft.windows.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateDay(day, {
                                windows: draft.windows.filter((_, i) => i !== idx),
                              })
                            }
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-rose-600"
                            aria-label="구간 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateDay(day, {
                          windows: [
                            ...draft.windows,
                            { start_time: '09:00', end_time: '12:00' },
                          ],
                        })
                      }
                      className="text-xs font-bold text-indigo-600 inline-flex items-center gap-1 min-h-[36px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      시간 추가
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">상담 시간</span>
            <select
              value={slotMinutes}
              onChange={(e) => {
                const v = Number(e.target.value) as AvailabilitySlotMinutes;
                setSlotMinutes(v);
                if (intervalMinutes === slotMinutes) setIntervalMinutes(v);
              }}
              className="w-full px-3 py-2.5 min-h-[44px] text-sm rounded-xl border border-slate-200 bg-slate-50"
            >
              {SLOT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">예약 시작 간격</span>
            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value) as AvailabilitySlotMinutes)}
              className="w-full px-3 py-2.5 min-h-[44px] text-sm rounded-xl border border-slate-200 bg-slate-50"
            >
              {SLOT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void handleSaveRules()}
          disabled={saving}
          className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          저장
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-slate-500" />
          특정 날짜 예외
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">날짜</span>
            <input
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] text-sm rounded-xl border border-slate-200 bg-slate-50"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">유형</span>
            <select
              value={overrideClosed ? 'closed' : 'open'}
              onChange={(e) => setOverrideClosed(e.target.value === 'closed')}
              className="w-full px-3 py-2.5 min-h-[44px] text-sm rounded-xl border border-slate-200 bg-slate-50"
            >
              <option value="closed">상담 불가</option>
              <option value="open">임시 상담 가능</option>
            </select>
          </label>
        </div>

        {!overrideClosed && (
          <div className="space-y-2">
            {overrideWindows.map((win, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={win.start_time}
                  onChange={(e) =>
                    setOverrideWindows((prev) =>
                      prev.map((w, i) => (i === idx ? { ...w, start_time: e.target.value } : w))
                    )
                  }
                  className="px-2.5 py-2 min-h-[40px] text-sm rounded-lg border border-slate-200"
                />
                <span className="text-slate-400 text-xs">─</span>
                <input
                  type="time"
                  value={win.end_time}
                  onChange={(e) =>
                    setOverrideWindows((prev) =>
                      prev.map((w, i) => (i === idx ? { ...w, end_time: e.target.value } : w))
                    )
                  }
                  className="px-2.5 py-2 min-h-[40px] text-sm rounded-lg border border-slate-200"
                />
                {overrideWindows.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setOverrideWindows((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="min-h-[40px] min-w-[40px] text-slate-400 hover:text-rose-600"
                    aria-label="구간 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setOverrideWindows((prev) => [
                  ...prev,
                  { start_time: '09:00', end_time: '12:00' },
                ])
              }
              className="text-xs font-bold text-indigo-600 inline-flex items-center gap-1 min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              시간 추가
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleAddOverride()}
          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          + 예외 날짜 추가
        </button>

        {overrides.length === 0 ? (
          <EmptyState
            icon={<CalendarOff className="w-10 h-10" />}
            title="등록된 예외가 없습니다"
            description="휴가·임시 휴무·특별 상담일 등을 추가하세요."
          />
        ) : (
          <ul className="space-y-2">
            {overrides.map((o) => {
              const wins = getOverrideWindows(o);
              return (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50/80"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{o.override_date}</p>
                    <p className="text-xs text-slate-500">
                      {o.is_closed
                        ? '상담 불가'
                        : wins.map((w) => `${toHm(w.start_time)} ~ ${toHm(w.end_time)}`).join(', ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemoveOverride(o.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600"
                    aria-label="예외 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {rules.length === 0 && enabledCount === 0 && (
        <p className="text-xs text-slate-500 text-center">
          아직 저장된 반복 규칙이 없습니다. 요일을 켠 뒤 저장하세요.
        </p>
      )}
    </div>
  );
};
