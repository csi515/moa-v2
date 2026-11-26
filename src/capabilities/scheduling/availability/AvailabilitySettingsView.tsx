import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { CalendarOff, Clock, Copy, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
const WEEKDAYS_WEEKEND: AvailabilityDayOfWeek[] = [6, 0];
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
  onClose?: () => void;
}

function toHm(value: string): string {
  return value.slice(0, 5);
}

export const AvailabilitySettingsView: FC<AvailabilitySettingsViewProps> = ({
  title = '가능 시간 설정',
  description = '고객이 온라인/QR로 예약을 신청할 수 있는 요일별 시간대와 간격을 설정합니다.',
  defaultSlotTitle = '상담',
  defaultSlotMinutes = 30,
  embedded = false,
  onClose,
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
      showToast.error(err, '동기화에 실패했습니다.');
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
    showToast('평일(월~금)에 동일 시간을 적용했습니다.', 'info');
  };

  const applyWeekendSame = () => {
    const sat = dayDraft[6];
    const sun = dayDraft[0];
    const source = sat.enabled ? sat : sun.enabled ? sun : sat;
    setDayDraft((prev) => {
      const next = { ...prev };
      for (const d of WEEKDAYS_WEEKEND) {
        next[d] = {
          enabled: true,
          windows: source.windows.map((w) => ({ ...w })),
        };
      }
      return next;
    });
    showToast('주말(토~일)에 동일 시간을 적용했습니다.', 'info');
  };

  const copyDayToWeekdays = (sourceDay: AvailabilityDayOfWeek) => {
    const source = dayDraft[sourceDay];
    if (!source.enabled) {
      showToast(`${DAY_OF_WEEK_LABELS[sourceDay]}요일이 비활성화 상태입니다.`, 'warning');
      return;
    }
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
    showToast(`${DAY_OF_WEEK_LABELS[sourceDay]}요일 시간대를 평일(월~금)에 복사했습니다.`, 'info');
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
      showToast('예약 가능시간을 저장했습니다.', 'success');
      await load();
      await syncSlots();
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error(err);
      showToast.error(err, '저장에 실패했습니다.');
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
      showToast.error(err, '예외 저장에 실패했습니다.');
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
        <Loader2 className="w-6 h-6 text-slate-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-800">
      {!embedded && (
        <PageHeader
          icon={<Clock className="w-5 h-5 text-slate-700" />}
          title={title}
          description={description}
          actions={
            <button
              type="button"
              onClick={() => void syncSlots()}
              disabled={syncing}
              className="px-3.5 py-2 min-h-[40px] bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              예약 슬롯 동기화
            </button>
          }
        />
      )}

      {/* 요일별 반복 가능시간 설정 */}
      <section className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">매주 반복되는 예약 가능시간</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              운영 요일 <span className="font-medium text-slate-700">{enabledCount}일</span> 설정됨
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={applyWeekdaySame}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs"
            >
              평일 동일 적용
            </button>
            <button
              type="button"
              onClick={applyWeekendSame}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs"
            >
              주말 동일 적용
            </button>
          </div>
        </div>

        {/* 1줄 인라인 가로 배치 리스트 */}
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white overflow-hidden shadow-xs">
          {WEEKDAYS.map((day) => {
            const draft = dayDraft[day];
            return (
              <div
                key={day}
                className={`p-2.5 sm:px-3 sm:py-2.5 transition-colors ${
                  draft.enabled ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                {/* 첫 번째 줄 (요일 체크박스 + 첫 번째 시간 구간 or 비활성화 표시) */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-[90px] shrink-0">
                    <input
                      type="checkbox"
                      id={`avail-day-${day}`}
                      checked={draft.enabled}
                      onChange={(e) => updateDay(day, { enabled: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 focus:ring-offset-0 cursor-pointer"
                    />
                    <label
                      htmlFor={`avail-day-${day}`}
                      className={`text-xs sm:text-sm font-medium cursor-pointer select-none ${
                        draft.enabled ? 'text-slate-900 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {DAY_OF_WEEK_LABELS[day]}요일
                    </label>
                  </div>

                  {!draft.enabled ? (
                    <div className="flex-1 text-left sm:text-right">
                      <span className="text-xs text-slate-400 font-normal">운영 안 함 (예약 불가)</span>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap">
                      {/* 1번 시간 구간 */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={draft.windows[0]?.start_time || '14:00'}
                          onChange={(e) => updateWindow(day, 0, { start_time: e.target.value })}
                          className="px-2 py-1 text-xs sm:text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-800 tabular-nums focus:border-slate-400 focus:outline-none w-24 sm:w-28"
                        />
                        <span className="text-slate-400 text-xs">~</span>
                        <input
                          type="time"
                          value={draft.windows[0]?.end_time || '19:00'}
                          onChange={(e) => updateWindow(day, 0, { end_time: e.target.value })}
                          className="px-2 py-1 text-xs sm:text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-800 tabular-nums focus:border-slate-400 focus:outline-none w-24 sm:w-28"
                        />
                      </div>

                      {/* 액션 버튼들 */}
                      <div className="flex items-center gap-1 shrink-0">
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
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="시간 구간 추가"
                          aria-label="시간 구간 추가"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {draft.windows.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateDay(day, {
                                windows: draft.windows.slice(1),
                              })
                            }
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="첫 구간 삭제"
                            aria-label="첫 구간 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => copyDayToWeekdays(day)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="평일(월~금)에 이 시간 복사"
                          aria-label="평일(월~금)에 이 시간 복사"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 추가 시간 구간들 (2개 이상인 경우 아래로 깔끔하게 들여쓰기 배치) */}
                {draft.enabled && draft.windows.length > 1 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 sm:pl-[100px] flex flex-col gap-1.5">
                    {draft.windows.slice(1).map((win, idx) => {
                      const realIndex = idx + 1;
                      return (
                        <div key={realIndex} className="flex items-center justify-between sm:justify-end gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400 w-12 sm:hidden">추가구간:</span>
                            <input
                              type="time"
                              value={win.start_time}
                              onChange={(e) => updateWindow(day, realIndex, { start_time: e.target.value })}
                              className="px-2 py-1 text-xs sm:text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-800 tabular-nums focus:border-slate-400 focus:outline-none w-24 sm:w-28"
                            />
                            <span className="text-slate-400 text-xs">~</span>
                            <input
                              type="time"
                              value={win.end_time}
                              onChange={(e) => updateWindow(day, realIndex, { end_time: e.target.value })}
                              className="px-2 py-1 text-xs sm:text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-800 tabular-nums focus:border-slate-400 focus:outline-none w-24 sm:w-28"
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                updateDay(day, {
                                  windows: draft.windows.filter((_, i) => i !== realIndex),
                                })
                              }
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="구간 삭제"
                              aria-label="구간 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 예약 규칙 (소요 시간 & 간격) */}
      <section className="bg-slate-50/70 border border-slate-200 rounded-lg p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700">예약 1회당 시간</span>
            <select
              value={slotMinutes}
              onChange={(e) => {
                const v = Number(e.target.value) as AvailabilitySlotMinutes;
                setSlotMinutes(v);
                if (intervalMinutes === slotMinutes) setIntervalMinutes(v);
              }}
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-800 focus:border-slate-400 focus:outline-none"
            >
              {SLOT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700">예약 신청 시작 간격</span>
            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value) as AvailabilitySlotMinutes)}
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-800 focus:border-slate-400 focus:outline-none"
            >
              {SLOT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* 특정 날짜 예외 (Overrides) */}
      <section className="border border-slate-200 rounded-lg p-3 sm:p-4 space-y-3 bg-white">
        <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <CalendarOff className="w-3.5 h-3.5 text-slate-500" />
          특정 날짜 예외 (휴무일 · 특별 예약일)
        </h4>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="date"
            value={overrideDate}
            onChange={(e) => setOverrideDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs sm:text-sm rounded-md border border-slate-200 bg-white text-slate-800 focus:border-slate-400 focus:outline-none"
          />
          <select
            value={overrideClosed ? 'closed' : 'open'}
            onChange={(e) => setOverrideClosed(e.target.value === 'closed')}
            className="px-2.5 py-1.5 text-xs sm:text-sm rounded-md border border-slate-200 bg-white text-slate-800 focus:border-slate-400 focus:outline-none"
          >
            <option value="closed">예약 불가 (휴무)</option>
            <option value="open">임시 운영 (예약 가능)</option>
          </select>

          <button
            type="button"
            onClick={() => void handleAddOverride()}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shrink-0"
          >
            + 예외 등록
          </button>
        </div>

        {!overrideClosed && (
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">운영 시간:</span>
            <input
              type="time"
              value={overrideWindows[0]?.start_time || '14:00'}
              onChange={(e) =>
                setOverrideWindows((prev) => [{ ...prev[0], start_time: e.target.value }])
              }
              className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white text-slate-800 tabular-nums"
            />
            <span className="text-slate-400 text-xs">~</span>
            <input
              type="time"
              value={overrideWindows[0]?.end_time || '17:00'}
              onChange={(e) =>
                setOverrideWindows((prev) => [{ ...prev[0], end_time: e.target.value }])
              }
              className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white text-slate-800 tabular-nums"
            />
          </div>
        )}

        {overrides.length > 0 && (
          <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2 space-y-1">
            {overrides.map((o) => {
              const wins = getOverrideWindows(o);
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-2 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{o.override_date}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                      o.is_closed ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {o.is_closed
                        ? '예약 불가'
                        : wins.map((w) => `${toHm(w.start_time)}~${toHm(w.end_time)}`).join(', ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemoveOverride(o.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    aria-label="예외 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-3.5 bg-white/95 backdrop-blur-xs border-t border-slate-200 flex items-center justify-between gap-3 z-10">
        <div className="text-xs text-slate-500">
          운영 요일 <span className="font-semibold text-slate-800">{enabledCount}일</span> 선택됨
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              닫기
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSaveRules()}
            disabled={saving}
            className="px-5 py-2 text-xs sm:text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
};
