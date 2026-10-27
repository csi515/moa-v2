import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
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

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: 8 }}>품목코드 / 품목명</th>
              <th style={{ padding: 8 }}>로트 번호</th>
              <th style={{ padding: 8 }}>유통기한</th>
              <th style={{ padding: 8 }}>잔여 일수 (D-Day)</th>
              <th style={{ padding: 8 }}>보관 위치</th>
              <th style={{ padding: 8 }}>재고 수량</th>
              <th style={{ padding: 8 }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {items.map((lot) => {
              const daysLeft = getDaysUntilExpiry(lot.expiryDate, todayStr);
              const status = determineLotStatus(lot.expiryDate, lot.currentStockQty, todayStr, 30);

              return (
                <tr key={lot.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8, fontWeight: 500 }}>
                    {lot.itemName} <span style={{ color: '#666', fontSize: 12 }}>({lot.itemCode})</span>
                  </td>
                  <td style={{ padding: 8, fontFamily: 'monospace' }}>{lot.lotNumber}</td>
                  <td style={{ padding: 8 }}>{lot.expiryDate}</td>
                  <td style={{ padding: 8, fontWeight: 'bold' }}>
                    {daysLeft < 0 ? (
                      <span style={{ color: '#dc2626' }}>만료됨 ({Math.abs(daysLeft)}일 지남)</span>
                    ) : daysLeft <= 30 ? (
                      <span style={{ color: '#d97706' }}>D-{daysLeft}일 (임박)</span>
                    ) : (
                      <span style={{ color: '#059669' }}>D-{daysLeft}일</span>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>{lot.locationRack}</td>
                  <td style={{ padding: 8 }}>{lot.currentStockQty}개</td>
                  <td style={{ padding: 8 }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor:
                          status === 'available'
                            ? '#d1fae5'
                            : status === 'expiring_soon'
                            ? '#fef3c7'
                            : status === 'expired'
                            ? '#fee2e2'
                            : '#f3f4f6',
                        color:
                          status === 'available'
                            ? '#065f46'
                            : status === 'expiring_soon'
                            ? '#92400e'
                            : status === 'expired'
                            ? '#991b1b'
                            : '#6b7280',
                      }}
                    >
                      {status === 'available'
                        ? '정상'
                        : status === 'expiring_soon'
                        ? '⚠️ 임박'
                        : status === 'expired'
                        ? '🚨 폐기대상'
                        : '소진됨'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  등록된 로트가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
