import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import { StandardDataTable, type StandardColumn } from '@/shared/components/ui/StandardDataTable';
import {
  type LotItemRecord,
  determineLotStatus,
  getDaysUntilExpiry,
  getFefoRecommendedLot,
} from '../domain/fefoLotEngine';

export const FefoLotListPage: React.FC = () => {
  const { query } = useList<LotItemRecord>({
    resource: 'fefo_lots',
  });
  const items = (query?.data?.data as LotItemRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createLot } = useCreate();

  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('2026-12-31');
  const [currentStockQty, setCurrentStockQty] = useState(10);
  const [locationRack, setLocationRack] = useState('A동 1번 랙');

  const [lookupItemCode, setLookupItemCode] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemCode.trim()) {
      showToast('품목 코드와 명칭을 입력해주세요.', 'error');
      return;
    }

    const status = determineLotStatus(expiryDate, Number(currentStockQty), todayStr, 30);

    createLot(
      {
        resource: 'fefo_lots',
        values: {
          itemCode,
          itemName,
          lotNumber: lotNumber || `LOT-${Date.now().toString().slice(-6)}`,
          expiryDate,
          currentStockQty: Number(currentStockQty),
          locationRack,
          status,
        },
      },
      {
        onSuccess: () => {
          showToast('신규 로트 및 유통기한이 등록되었습니다.', 'success');
          setItemName('');
          setLotNumber('');
          refetch();
        },
      }
    );
  };

  const recommendedLot = lookupItemCode ? getFefoRecommendedLot(items, lookupItemCode, todayStr) : undefined;

  const columns: StandardColumn<LotItemRecord>[] = [
    {
      key: 'itemName',
      header: '품목명 / 코드',
      render: (lot) => (
        <span className="font-semibold text-slate-900">
          {lot.itemName} <span className="text-slate-500 text-xs font-normal font-mono">({lot.itemCode})</span>
        </span>
      ),
    },
    {
      key: 'lotNumber',
      header: '로트 번호',
      render: (lot) => <span className="font-mono text-xs text-slate-600">{lot.lotNumber}</span>,
    },
    {
      key: 'expiryDate',
      header: '유통기한',
      render: (lot) => <span className="font-mono text-xs">{lot.expiryDate}</span>,
    },
    {
      key: 'daysLeft',
      header: '잔여 일수 (D-Day)',
      render: (lot) => {
        const daysLeft = getDaysUntilExpiry(lot.expiryDate, todayStr);
        return (
          <span className="font-bold tabular-nums font-mono text-xs">
            {daysLeft < 0 ? (
              <span className="text-rose-600">만료됨 ({Math.abs(daysLeft)}일 지남)</span>
            ) : daysLeft <= 30 ? (
              <span className="text-amber-600">D-{daysLeft}일 (임박)</span>
            ) : (
              <span className="text-emerald-600">D-{daysLeft}일</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'locationRack',
      header: '보관 위치',
      render: (lot) => <span className="text-slate-700 text-xs">{lot.locationRack}</span>,
    },
    {
      key: 'currentStockQty',
      header: '재고 수량',
      align: 'right',
      render: (lot) => <span className="font-mono tabular-nums font-semibold text-slate-800">{lot.currentStockQty}개</span>,
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (lot) => {
        const status = determineLotStatus(lot.expiryDate, lot.currentStockQty, todayStr, 30);
        return (
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              status === 'available'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : status === 'expiring_soon'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : status === 'expired'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {status === 'available'
              ? '정상'
              : status === 'expiring_soon'
              ? '⚠️ 임박'
              : status === 'expired'
              ? '🚨 폐기대상'
              : '소진됨'}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>원자재 FEFO 유통기한 선출 & 로트 추적 대장</h2>
      <p style={{ color: '#666' }}>
        피부관리용 앰플, 화장품, 식품 등의 입고 로트별 유통기한을 기록하고 가장 빠른 제품을 우선 출고(FEFO)하도록 통제합니다.
      </p>

      {/* FEFO 우선 출고 추천 조회창 */}
      <div style={{ padding: 16, backgroundColor: '#eff6ff', borderRadius: 8, marginBottom: 24, border: '1px solid #bfdbfe' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>⚡ FEFO 최우선 출고 권고 로트 조회</h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={lookupItemCode}
            onChange={(e) => setLookupItemCode(e.target.value)}
            placeholder="품목 코드 입력 (예: AMP-01, LOT-001)"
            style={{ width: 250, padding: 8 }}
          />
          {lookupItemCode && recommendedLot ? (
            <div style={{ fontSize: 13, color: '#1d4ed8' }}>
              👉 <strong>[{recommendedLot.lotNumber}]</strong> 로트(유통기한: {recommendedLot.expiryDate}, 잔여:{' '}
              {recommendedLot.currentStockQty}개, 위치: {recommendedLot.locationRack})를 먼저 사용하세요.
            </div>
          ) : lookupItemCode ? (
            <div style={{ fontSize: 13, color: '#999' }}>출고 가능한 잔여 로트가 없습니다.</div>
          ) : null}
        </div>
      </div>

      <form
        onSubmit={handleRegister}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          padding: 16,
          backgroundColor: '#f9f9f9',
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>품목 코드</label>
          <input
            type="text"
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            placeholder="예: AMP-01"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>품목명</label>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="예: 히알루론 재생 앰플"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>로트 번호 (Lot No.)</label>
          <input
            type="text"
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            placeholder="자동 채번 (미입력 시)"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>유통기한 (EXP)</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>입고 수량</label>
          <input
            type="number"
            value={currentStockQty}
            onChange={(e) => setCurrentStockQty(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>보관 랙/선반 위치</label>
          <input
            type="text"
            value={locationRack}
            onChange={(e) => setLocationRack(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            로트 등록
          </button>
        </div>
      </form>

      <StandardDataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="등록된 로트가 없습니다"
        emptyDescription="신규 로트 및 유통기한 정보를 등록하여 선입선출 관리를 시작하세요."
        keyExtractor={(lot) => lot.id}
      />
    </div>
  );
};
