import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  catalogRowToDomain,
  createCatalogItem,
  listCatalogItems,
  updateCatalogItem,
  type CatalogItemRow,
} from '../officeSupplyRequestService';
import { OfficeSupplyManageGate } from './OfficeSupplyAccessGate';

const CatalogInner: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const [rows, setRows] = useState<CatalogItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('개');
  const [price, setPrice] = useState('0');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await listCatalogItems(orgId, { includeInactive: true });
      setRows(data);
    } catch (cause) {
      showToast.error(cause, '목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !name.trim()) {
      showToast('품명을 입력하세요.', 'error');
      return;
    }
    setSaving(true);
    try {
      await createCatalogItem({
        organizationId: orgId,
        name: name.trim(),
        unit: unit.trim() || '개',
        estimatedUnitPrice: Number(price) || 0,
        sortOrder: rows.length,
      });
      setName('');
      setUnit('개');
      setPrice('0');
      showToast('품목을 추가했습니다.', 'success');
      await reload();
    } catch (cause) {
      showToast.error(cause, '추가 실패');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: CatalogItemRow) {
    try {
      await updateCatalogItem(row.id, { is_active: !row.is_active });
      await reload();
    } catch (cause) {
      showToast.error(cause, '변경 실패');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">구매 가능 품목</h1>
          <p className="mt-1 text-sm text-slate-500">임직원이 신청할 수 있는 사무용품 목록입니다.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            to="/workspace/office-supply"
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
          >
            내 신청
          </Link>
          <Link
            to="/workspace/office-supply/manage"
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
          >
            취합·마감
          </Link>
        </div>
      </header>

      <form
        onSubmit={(e) => void handleAdd(e)}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <p className="text-sm font-semibold text-slate-800">품목 추가</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm sm:col-span-1">
            <span className="text-slate-600">품명</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">단위</span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">추정 단가(원)</span>
            <input
              type="number"
              min={0}
              className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          {saving ? '추가 중…' : '추가'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((row) => {
            const item = catalogRowToDomain(row);
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${item.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.unit} · {item.estimatedUnitPrice.toLocaleString('ko-KR')}원
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-700"
                  onClick={() => void toggleActive(row)}
                >
                  {item.isActive ? '비활성' : '활성'}
                </button>
              </li>
            );
          })}
          {rows.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">등록된 품목이 없습니다.</li>
          ) : null}
        </ul>
      )}
    </div>
  );
};

export const OfficeSupplyCatalogPage: React.FC = () => (
  <OfficeSupplyManageGate>
    <CatalogInner />
  </OfficeSupplyManageGate>
);
