import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  normalizeVehicleNumber,
  renderParkingPassSvg,
  formatParkingNotificationText,
  type ParkingBatchItem,
  type ParkingRegistrationItem,
} from '../domain/parkingValidatorEngine';

export const ParkingValidatorView: React.FC = () => {
  const [selectedReg, setSelectedReg] = useState<ParkingRegistrationItem | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 차량 등록 폼
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorRole, setVisitorRole] = useState('학부모');
  const [purpose, setPurpose] = useState('원생 픽업/상담');
  const [freeMinutes, setFreeMinutes] = useState(60);

  // 주차권 배치(입고) 폼
  const [batchName, setBatchName] = useState('2026년 10월 1차 구매');
  const [ticketMinutes, setTicketMinutes] = useState(60);
  const [purchasedQty, setPurchasedQty] = useState(100);
  const [unitCost, setUnitCost] = useState(1000);

  // 1. 주차 등록 내역
  const { query: regQuery } = useList<ParkingRegistrationItem>({
    resource: 'parking_registrations',
    pagination: { pageSize: 50 },
  });

  // 2. 주차권 재고 배치 목록
  const { query: batchQuery } = useList<ParkingBatchItem>({
    resource: 'parking_batches',
    pagination: { pageSize: 20 },
  });

  const { mutate: createReg } = useCreate<ParkingRegistrationItem>();
  const { mutate: createBatch } = useCreate<ParkingBatchItem>();
  const { mutate: updateReg } = useUpdate<ParkingRegistrationItem>();

  const registrations = (regQuery?.data?.data as ParkingRegistrationItem[]) || [];
  const batches = (batchQuery?.data?.data as ParkingBatchItem[]) || [];

  // 전체 잔여 주차권 수량 계산
  const totalPurchased = batches.reduce((acc, b) => acc + (b.purchasedQuantity || 0), 0);
  const totalUsed = batches.reduce((acc, b) => acc + (b.usedQuantity || 0), 0);
  const remainingTickets = Math.max(0, totalPurchased - totalUsed);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim() || !visitorName.trim()) return;

    const normalized = normalizeVehicleNumber(vehicleNumber);
    const activeBatch = batches.find((b) => (b.purchasedQuantity - b.usedQuantity) > 0);

    setIsSubmitting(true);
    createReg(
      {
        resource: 'parking_registrations',
        values: {
          vehicle_number: normalized,
          visitor_name: visitorName,
          visitor_role: visitorRole,
          purpose,
          free_minutes: freeMinutes,
          tickets_used: 1,
          batch_id: activeBatch?.id || null,
          status: 'active',
          registered_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          setShowRegisterModal(false);
          setVehicleNumber('');
          setVisitorName('');
          regQuery?.refetch();
          batchQuery?.refetch();
        },
        onError: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim()) return;

    setIsSubmitting(true);
    createBatch(
      {
        resource: 'parking_batches',
        values: {
          batch_name: batchName,
          allocated_minutes: ticketMinutes,
          purchased_quantity: purchasedQty,
          used_quantity: 0,
          unit_cost: unitCost,
          purchased_date: new Date().toISOString().slice(0, 10),
        },
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          setShowBatchModal(false);
          batchQuery?.refetch();
        },
        onError: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleExitStatus = (regId: string) => {
    updateReg(
      {
        resource: 'parking_registrations',
        id: regId,
        values: {
          status: 'exited',
        },
      },
      {
        onSuccess: () => {
          regQuery?.refetch();
          if (selectedReg && selectedReg.id === regId) {
            setSelectedReg({ ...selectedReg, status: 'exited' });
          }
        },
      }
    );
  };

  const handleCopyNotice = (reg: ParkingRegistrationItem) => {
    const text = formatParkingNotificationText(reg, reg.freeMinutes);
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>🅿️ 고객 무료 주차 등록 & 상가 주차권 정산기</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            내방 고객의 차량 번호를 등록하고 무료 주차권을 즉시 차감 지급하며, 관리사무소 정산 내역을 투명하게 대조합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowBatchModal(true)}
            style={{
              backgroundColor: '#f1f5f9',
              color: '#334155',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            + 주차권 입고 등록
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            + 신규 차량 주차 등록
          </button>
        </div>
      </div>

      {/* 상단 주차권 재고 현황 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>잔여 주차권 재고</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: remainingTickets < 20 ? '#dc2626' : '#16a34a' }}>
            {remainingTickets}장
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>총 구매 {totalPurchased}장 / 사용 {totalUsed}장</div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>오늘 등록된 차량</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#0f172a' }}>
            {registrations.filter((r) => r.registeredAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length}대
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>전체 누적 {registrations.length}대</div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>현재 주차 중 (미출차)</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#0284c7' }}>
            {registrations.filter((r) => r.status === 'active').length}대
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>출차 시 출차 완료 처리 지원</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedReg ? '1fr 380px' : '1fr', gap: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>차량 번호</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>방문자</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>방문 목적</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>할인 시간</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>상태</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    등록된 차량 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                registrations.map((reg) => (
                  <tr
                    key={reg.id}
                    onClick={() => setSelectedReg(reg)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: selectedReg?.id === reg.id ? '#f0f9ff' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: 'bold' }}>
                      {reg.vehicleNumber}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      {reg.visitorName} ({reg.visitorRole})
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                      {reg.purpose}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 'bold', color: '#0284c7' }}>
                      {reg.freeMinutes}분 무료 ({reg.ticketsUsed}장)
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: reg.status === 'active' ? '#166534' : '#64748b',
                          background: reg.status === 'active' ? '#dcfce7' : '#f1f5f9',
                        }}
                      >
                        {reg.status === 'active' ? '주차 중' : '출차 완료'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyNotice(reg);
                        }}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginRight: '6px',
                        }}
                      >
                        {copySuccess ? '복사됨!' : '안내문 복사'}
                      </button>
                      {reg.status === 'active' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExitStatus(reg.id);
                          }}
                          style={{
                            background: '#fff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          출차 처리
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedReg && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>전자 주차 확인증</h2>
              <button
                onClick={() => setSelectedReg(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{ width: '100%', marginBottom: '16px' }}
              dangerouslySetInnerHTML={{ __html: renderParkingPassSvg(selectedReg, selectedReg.freeMinutes) }}
            />

            <button
              onClick={() => handleCopyNotice(selectedReg)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: '#0284c7',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {copySuccess ? '안내 문구 복사 완료!' : '📢 카카오톡/문자 주차 안내 복사'}
            </button>
          </div>
        )}
      </div>

      {/* 차량 등록 모달 */}
      {showRegisterModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '420px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>🅿️ 방문 고객 주차 등록</h2>
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>차량 번호 (뒤 4자리 또는 전체) *</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="예: 12가 3456 또는 3456"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>방문자 이름 *</label>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="예: 홍길동"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>구분</label>
                  <select
                    value={visitorRole}
                    onChange={(e) => setVisitorRole(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  >
                    <option value="학부모">학부모</option>
                    <option value="원생">원생</option>
                    <option value="회원">회원</option>
                    <option value="방문객">방문객/상담</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>무료 주차 시간</label>
                <select
                  value={freeMinutes}
                  onChange={(e) => setFreeMinutes(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                  <option value={30}>30분 무료</option>
                  <option value={60}>60분 (1시간) 무료</option>
                  <option value={120}>120분 (2시간) 무료</option>
                  <option value={180}>180분 (3시간) 무료</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isSubmitting ? '등록 중...' : '주차 할인 적용'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 주차권 입고 등록 모달 */}
      {showBatchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '420px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>📦 상가 관리소 주차권 입고 등록</h2>
            <form onSubmit={handleBatchSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>구매 명칭 *</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="예: 2026년 10월분 1시간권"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>구매 수량 (장) *</label>
                  <input
                    type="number"
                    value={purchasedQty}
                    onChange={(e) => setPurchasedQty(Number(e.target.value))}
                    min={1}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>장당 단가 (원)</label>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isSubmitting ? '입고 중...' : '입고 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
