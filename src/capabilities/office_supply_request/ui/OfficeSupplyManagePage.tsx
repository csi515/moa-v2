import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  formatAggregateCsv,
  isCampaignWritable,
  isValidYearMonth,
  toYearMonth,
} from '../domain/officeSupplyRequestEngine';
import {
  campaignRowToDomain,
  closeCampaign,
  listCampaigns,
  listDeptAggregate,
  mapAggregatePayload,
  reopenCampaign,
  upsertCampaign,
  type CampaignRow,
} from '../officeSupplyRequestService';
import { OfficeSupplyManageGate } from './OfficeSupplyAccessGate';

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDeadlineForMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  // 해당 월 10일 18:00 기본
  const d = new Date(y, (m ?? 1) - 1, 10, 18, 0, 0);
  return d.toISOString();
}

const ManageInner: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? '';

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [yearMonth, setYearMonth] = useState(() => toYearMonth());
  const [deadlineLocal, setDeadlineLocal] = useState(() =>
    toLocalDatetimeValue(defaultDeadlineForMonth(toYearMonth()))
  );
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [aggLoading, setAggLoading] = useState(false);
  const [aggregate, setAggregate] = useState<ReturnType<typeof mapAggregatePayload> | null>(null);

  const selected = useMemo(
    () => campaigns.find((c) => c.id === selectedId) ?? null,
    [campaigns, selectedId]
  );

  const reloadCampaigns = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const list = await listCampaigns(orgId);
      setCampaigns(list);
      if (!selectedId && list[0]) setSelectedId(list[0].id);
      if (selectedId && !list.some((c) => c.id === selectedId) && list[0]) {
        setSelectedId(list[0].id);
      }
    } catch (cause) {
      showToast.error(cause, '캠페인 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedId]);

  useEffect(() => {
    void reloadCampaigns();
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps -- 초기 로드

  const reloadAggregate = useCallback(async () => {
    if (!orgId || !selectedId) {
      setAggregate(null);
      return;
    }
    setAggLoading(true);
    try {
      const payload = await listDeptAggregate(orgId, selectedId);
      setAggregate(mapAggregatePayload(payload));
    } catch (cause) {
      showToast.error(cause, '취합 조회 실패');
      setAggregate(null);
    } finally {
      setAggLoading(false);
    }
  }, [orgId, selectedId]);

  useEffect(() => {
    void reloadAggregate();
  }, [reloadAggregate]);

  async function handleUpsertCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    if (!isValidYearMonth(yearMonth)) {
      showToast('월 형식은 YYYY-MM 입니다.', 'error');
      return;
    }
    const deadlineAt = new Date(deadlineLocal).toISOString();
    if (Number.isNaN(new Date(deadlineLocal).getTime())) {
      showToast('마감일시를 확인하세요.', 'error');
      return;
    }
    try {
      const row = await upsertCampaign({
        organizationId: orgId,
        yearMonth,
        deadlineAt,
        note: note.trim() || null,
      });
      showToast(`${row.year_month} 캠페인을 저장했습니다.`, 'success');
      setSelectedId(row.id);
      await reloadCampaigns();
      await reloadAggregate();
    } catch (cause) {
      showToast.error(cause, '저장 실패');
    }
  }

  async function handleClose() {
    if (!orgId || !selectedId) return;
    try {
      await closeCampaign(orgId, selectedId);
      showToast('캠페인을 마감했습니다.', 'success');
      await reloadCampaigns();
      await reloadAggregate();
    } catch (cause) {
      showToast.error(cause, '마감 실패');
    }
  }

  async function handleReopen() {
    if (!orgId || !selectedId) return;
    const nextDeadline = new Date(deadlineLocal);
    if (Number.isNaN(nextDeadline.getTime()) || nextDeadline.getTime() <= Date.now()) {
      showToast('재오픈하려면 미래 마감일시를 설정하세요.', 'error');
      return;
    }
    try {
      await reopenCampaign(orgId, selectedId, nextDeadline.toISOString());
      showToast('캠페인을 다시 열었습니다.', 'success');
      await reloadCampaigns();
      await reloadAggregate();
    } catch (cause) {
      showToast.error(cause, '재오픈 실패');
    }
  }

  async function handleCopyCsv() {
    if (!aggregate) return;
    const csv = formatAggregateCsv(aggregate.byDepartment, aggregate.byItem);
    try {
      await navigator.clipboard.writeText(csv);
      showToast('취합 CSV를 클립보드에 복사했습니다.', 'success');
    } catch {
      showToast('클립보드 복사에 실패했습니다.', 'error');
    }
  }

  const domainSelected = selected ? campaignRowToDomain(selected) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">사무용품 취합·마감</h1>
          <p className="mt-1 text-sm text-slate-500">월별 캠페인 마감일과 부서별 취합 현황</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            to="/workspace/office-supply"
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
          >
            내 신청
          </Link>
          <Link
            to="/workspace/office-supply/catalog"
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
          >
            품목 목록
          </Link>
        </div>
      </header>

      <form
        onSubmit={(e) => void handleUpsertCampaign(e)}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <p className="text-sm font-semibold text-slate-800">캠페인 열기 / 마감일 변경</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="text-slate-600">대상 월 (YYYY-MM)</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3"
              value={yearMonth}
              onChange={(e) => {
                setYearMonth(e.target.value);
                if (isValidYearMonth(e.target.value)) {
                  setDeadlineLocal(toLocalDatetimeValue(defaultDeadlineForMonth(e.target.value)));
                }
              }}
              placeholder="2026-10"
              required
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-600">신청 마감일시</span>
            <input
              type="datetime-local"
              className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3"
              value={deadlineLocal}
              onChange={(e) => setDeadlineLocal(e.target.value)}
              required
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-slate-600">안내 메모 (선택)</span>
          <input
            className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          저장
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">캠페인 목록</h2>
        {loading ? (
          <p className="text-sm text-slate-500">불러오는 중…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-slate-500">아직 캠페인이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {campaigns.map((c) => {
              const domain = campaignRowToDomain(c);
              const open = isCampaignWritable(domain);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    className={`min-h-11 flex-1 rounded-lg px-2 text-left text-sm ${
                      selectedId === c.id ? 'bg-slate-100 font-semibold' : ''
                    }`}
                    onClick={() => {
                      setSelectedId(c.id);
                      setYearMonth(c.year_month);
                      setDeadlineLocal(toLocalDatetimeValue(c.deadline_at));
                      setNote(c.note ?? '');
                    }}
                  >
                    <span className="text-slate-900">{c.year_month}</span>
                    <span className="ml-2 text-slate-500">
                      {open ? '신청 중' : '마감됨'} ·{' '}
                      {new Date(c.deadline_at).toLocaleString('ko-KR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </button>
                  {domainSelected?.id === c.id ? (
                    <div className="flex gap-2">
                      {open ? (
                        <button
                          type="button"
                          className="min-h-11 rounded-lg border border-rose-200 px-3 text-sm text-rose-700"
                          onClick={() => void handleClose()}
                        >
                          지금 마감
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="min-h-11 rounded-lg border border-emerald-200 px-3 text-sm text-emerald-800"
                          onClick={() => void handleReopen()}
                        >
                          재오픈
                        </button>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">부서별 취합</h2>
          <button
            type="button"
            disabled={!aggregate}
            onClick={() => void handleCopyCsv()}
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 disabled:opacity-40"
          >
            CSV 복사
          </button>
        </div>
        {aggLoading ? (
          <p className="text-sm text-slate-500">취합 불러오는 중…</p>
        ) : !selectedId ? (
          <p className="text-sm text-slate-500">캠페인을 선택하세요.</p>
        ) : !aggregate || aggregate.byDepartment.length === 0 ? (
          <p className="text-sm text-slate-500">아직 신청 내역이 없습니다.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">부서</th>
                    <th className="px-3 py-2 font-medium">품목</th>
                    <th className="px-3 py-2 font-medium">수량</th>
                    <th className="px-3 py-2 font-medium">추정합계</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregate.byDepartment.map((row) => (
                    <tr
                      key={`${row.departmentId ?? 'none'}-${row.catalogItemId}`}
                      className="border-b border-slate-50"
                    >
                      <td className="px-3 py-2">{row.departmentName}</td>
                      <td className="px-3 py-2">
                        {row.itemName}{' '}
                        <span className="text-slate-400">({row.unit})</span>
                      </td>
                      <td className="px-3 py-2">{row.totalQuantity}</td>
                      <td className="px-3 py-2">
                        {row.estimatedTotal.toLocaleString('ko-KR')}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-800">품목 합계</p>
              <ul className="mt-2 space-y-1 text-slate-700">
                {aggregate.byItem.map((row) => (
                  <li key={row.catalogItemId}>
                    {row.itemName}: {row.totalQuantity}
                    {row.unit} · {row.estimatedTotal.toLocaleString('ko-KR')}원
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-semibold text-slate-900">
                추정 총액 {aggregate.grandTotalEstimate.toLocaleString('ko-KR')}원
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export const OfficeSupplyManagePage: React.FC = () => (
  <OfficeSupplyManageGate>
    <ManageInner />
  </OfficeSupplyManageGate>
);
