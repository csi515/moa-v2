import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  campaignLockReason,
  isCampaignWritable,
  normalizeRequestLines,
  shiftYearMonth,
  toYearMonth,
  validateRequestLines,
} from '../domain/officeSupplyRequestEngine';
import {
  campaignRowToDomain,
  catalogRowToDomain,
  getCampaignByYearMonth,
  listCatalogItems,
  listMyRequestLines,
  upsertMyRequestLines,
} from '../officeSupplyRequestService';
import { useOfficeSupplyManageAccess } from './OfficeSupplyAccessGate';

export const OfficeSupplyMyView: React.FC = () => {
  const { currentOrganization, selectedMembership } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const memberId = selectedMembership?.id ?? null;
  const canManage = useOfficeSupplyManageAccess();

  const [yearMonth, setYearMonth] = useState(() => toYearMonth());
  const [catalog, setCatalog] = useState<ReturnType<typeof catalogRowToDomain>[]>([]);
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [campaign, setCampaign] = useState<ReturnType<typeof campaignRowToDomain> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const writable = campaign ? isCampaignWritable(campaign) : false;
  const lockReason = campaign ? campaignLockReason(campaign) : '해당 월 신청 캠페인이 없습니다.';

  const reload = useCallback(async () => {
    if (!orgId || !memberId) return;
    setLoading(true);
    try {
      const [catalogRows, campaignRow] = await Promise.all([
        listCatalogItems(orgId),
        getCampaignByYearMonth(orgId, yearMonth),
      ]);
      setCatalog(catalogRows.map(catalogRowToDomain));
      const domainCampaign = campaignRow ? campaignRowToDomain(campaignRow) : null;
      setCampaign(domainCampaign);

      if (domainCampaign) {
        const lines = await listMyRequestLines(orgId, domainCampaign.id, memberId);
        const next: Record<string, number> = {};
        for (const line of lines) {
          next[line.catalog_item_id] = Number(line.quantity) || 0;
        }
        setQtyByItem(next);
      } else {
        setQtyByItem({});
      }
    } catch (cause) {
      showToast.error(cause, '조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orgId, memberId, yearMonth]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const estimatedTotal = useMemo(() => {
    return catalog.reduce((sum, item) => {
      const qty = qtyByItem[item.id] ?? 0;
      return sum + qty * item.estimatedUnitPrice;
    }, 0);
  }, [catalog, qtyByItem]);

  async function handleSave() {
    if (!orgId || !campaign || !writable) return;
    const lines = normalizeRequestLines(qtyByItem);
    const check = validateRequestLines(lines, new Set(catalog.map((c) => c.id)));
    if (!check.isValid) {
      showToast(check.error ?? '입력을 확인하세요.', 'error');
      return;
    }
    setSaving(true);
    try {
      await upsertMyRequestLines({
        organizationId: orgId,
        campaignId: campaign.id,
        lines,
      });
      showToast('신청을 저장했습니다.', 'success');
      await reload();
    } catch (cause) {
      showToast.error(cause, '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">사무용품 신청</h1>
          <p className="mt-1 text-sm text-slate-500">월별 구매 희망 품목과 수량을 입력하세요.</p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              to="/workspace/office-supply/manage"
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              취합·마감
            </Link>
            <Link
              to="/workspace/office-supply/catalog"
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              품목 목록
            </Link>
          </div>
        ) : null}
      </header>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"
          onClick={() => setYearMonth((ym) => shiftYearMonth(ym, -1))}
        >
          이전 달
        </button>
        <span className="min-w-[7rem] text-center text-base font-semibold text-slate-900">
          {yearMonth}
        </span>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"
          onClick={() => setYearMonth((ym) => shiftYearMonth(ym, 1))}
        >
          다음 달
        </button>
      </div>

      {!campaign ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          해당 월 신청 캠페인이 아직 열리지 않았습니다.
          {canManage ? (
            <>
              {' '}
              <Link to="/workspace/office-supply/manage" className="font-semibold underline">
                취합 화면
              </Link>
              에서 마감일과 함께 열어 주세요.
            </>
          ) : null}
        </div>
      ) : !writable ? (
        <div
          role="status"
          className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-800"
        >
          <p className="font-semibold">마감됨</p>
          <p className="mt-1">{lockReason}</p>
          <p className="mt-1 text-slate-600">
            마감일시:{' '}
            {new Date(campaign.deadlineAt).toLocaleString('ko-KR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
      ) : (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
        >
          신청 가능 · 마감{' '}
          {new Date(campaign.deadlineAt).toLocaleString('ko-KR', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      ) : catalog.length === 0 ? (
        <p className="text-sm text-slate-500">구매 가능 품목이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {catalog.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">
                  단위 {item.unit}
                  {item.estimatedUnitPrice > 0
                    ? ` · 추정 ${item.estimatedUnitPrice.toLocaleString('ko-KR')}원`
                    : null}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <span className="sr-only">{item.name} 수량</span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  disabled={!writable}
                  className="h-11 w-24 rounded-lg border border-slate-200 px-2 text-right disabled:bg-slate-50"
                  value={qtyByItem[item.id] ?? 0}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setQtyByItem((prev) => ({
                      ...prev,
                      [item.id]: Number.isFinite(v) ? Math.max(0, v) : 0,
                    }));
                  }}
                />
                <span className="text-slate-500">{item.unit}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          추정 합계{' '}
          <span className="font-semibold text-slate-900">
            {estimatedTotal.toLocaleString('ko-KR')}원
          </span>
        </p>
        <button
          type="button"
          disabled={!writable || saving || !campaign}
          onClick={() => void handleSave()}
          className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? '저장 중…' : writable ? '신청 저장' : '마감됨'}
        </button>
      </div>
    </div>
  );
};
