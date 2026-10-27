import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  type ProcurementMatchRecord,
  validateThreeWayMatch,
} from '../domain/procurement3WayEngine';

export const Procurement3WayListPage: React.FC = () => {
  const { query } = useList<ProcurementMatchRecord>({
    resource: 'procurement_matches',
  });
  const items = (query?.data?.data as ProcurementMatchRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();
  const { mutate: updateRecord } = useUpdate();

  const [requisitionNumber, setRequisitionNumber] = useState('');
  const [itemName, setItemName] = useState('');
  const [requestedQty, setRequestedQty] = useState(10);
  const [approvedPrice, setApprovedPrice] = useState(30000);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      showToast('품목명을 입력해주세요.', 'error');
      return;
    }

    createRecord(
      {
        resource: 'procurement_matches',
        values: {
          requisitionNumber: requisitionNumber || `PR-${Date.now().toString().slice(-4)}`,
          itemName,
          requestedQty: Number(requestedQty),
          approvedQty: Number(requestedQty),
          approvedUnitPrice: Number(approvedPrice),
          receivedQty: 0,
          invoicedUnitPrice: Number(approvedPrice),
          status: 'PO_APPROVED',
        },
      },
      {
        onSuccess: () => {
          showToast('구매 발주서가 등록되었습니다.', 'success');
          setItemName('');
          setRequisitionNumber('');
          refetch();
        },
      }
    );
  };

  const handleVerifyReceipt = (record: ProcurementMatchRecord, receivedQty: number, invoicedPrice: number) => {
    const matchResult = validateThreeWayMatch(
      record.approvedQty,
      receivedQty,
      record.approvedUnitPrice,
      invoicedPrice
    );

    updateRecord(
      {
        resource: 'procurement_matches',
        id: record.id,
        values: {
          ...record,
          receivedQty,
          invoicedUnitPrice: invoicedPrice,
          status: matchResult.isMatched ? 'MATCHED' : 'DISCREPANCY',
        },
      },
      {
        onSuccess: () => {
          if (matchResult.isMatched) {
            showToast('3-Way 일치 검증 완료! 매입 장부에 반영되었습니다.', 'success');
          } else {
            showToast(`불일치 감지: ${matchResult.reason}`, 'warning');
          }
          refetch();
        },
      }
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>3-Way 구매요청·발주·입고검수 매칭 트래커</h2>
      <p style={{ color: '#666' }}>
        구매 요청(PR)부터 발주 승인(PO), 그리고 거래처 입고 검수(GR) 간 수량과 단가를 3자 대조하여 매장 누수를 방지합니다.
      </p>

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
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>구매요청(PR) 번호</label>
          <input
            type="text"
            value={requisitionNumber}
            onChange={(e) => setRequisitionNumber(e.target.value)}
            placeholder="자동 채번 (미입력 시)"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>발주 품목명</label>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="예: 피부 재생 앰플 100ml"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>발주 수량</label>
          <input
            type="number"
            value={requestedQty}
            onChange={(e) => setRequestedQty(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>승인 단가 (원)</label>
          <input
            type="number"
            value={approvedPrice}
            onChange={(e) => setApprovedPrice(Number(e.target.value))}
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
            발주 등록
          </button>
        </div>
      </form>

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: 8 }}>PR 번호</th>
              <th style={{ padding: 8 }}>품목명</th>
              <th style={{ padding: 8 }}>발주 수량 / 단가</th>
              <th style={{ padding: 8 }}>실제 입고 수량 / 청구 단가</th>
              <th style={{ padding: 8 }}>매칭 상태</th>
              <th style={{ padding: 8 }}>입고 검수 처리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((record) => {
              const match = validateThreeWayMatch(
                record.approvedQty,
                record.receivedQty,
                record.approvedUnitPrice,
                record.invoicedUnitPrice
              );

              return (
                <tr key={record.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8, fontFamily: 'monospace' }}>{record.requisitionNumber}</td>
                  <td style={{ padding: 8, fontWeight: 500 }}>{record.itemName}</td>
                  <td style={{ padding: 8 }}>
                    {record.approvedQty}개 @ {record.approvedUnitPrice.toLocaleString()}원
                  </td>
                  <td style={{ padding: 8 }}>
                    {record.receivedQty}개 @ {record.invoicedUnitPrice.toLocaleString()}원
                  </td>
                  <td style={{ padding: 8 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 'bold',
                        backgroundColor:
                          record.status === 'MATCHED'
                            ? '#d1fae5'
                            : record.status === 'DISCREPANCY'
                            ? '#fee2e2'
                            : '#fef3c7',
                        color:
                          record.status === 'MATCHED'
                            ? '#065f46'
                            : record.status === 'DISCREPANCY'
                            ? '#991b1b'
                            : '#92400e',
                      }}
                    >
                      {record.status === 'MATCHED'
                        ? '✓ 3자 일치'
                        : record.status === 'DISCREPANCY'
                        ? '🚨 불일치 경고'
                        : '입고 대기'}
                    </span>
                    {record.status === 'DISCREPANCY' && match.reason && (
                      <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>{match.reason}</div>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    {record.status === 'PO_APPROVED' && (
                      <button
                        onClick={() => handleVerifyReceipt(record, record.approvedQty, record.approvedUnitPrice)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#059669',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        정상 입고 확정
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  발주 및 구매 매칭 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
