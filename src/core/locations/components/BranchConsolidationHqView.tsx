import { showToast } from '@/shared/feedback/uiFeedback';
import React, { useState } from 'react';
import {
  LocationKpiInput,
  InterBranchTransferOrder,
  MemberPassScope,
  aggregateHqBranchKpis,
  createInterBranchTransferOrder,
  confirmInterBranchTransferReceipt,
  verifyAndProcessCrossBranchPassCheckIn,
} from '../domain/branchConsolidationEngine';

const INITIAL_BRANCHES: LocationKpiInput[] = [
  {
    locationId: 'loc-1',
    locationName: '강남 본점 (직영)',
    grossSales: 62000000,
    activeMembersCount: 310,
    transactionsCount: 620,
    capacitySlots: 1000,
    occupiedSlots: 880,
  },
  {
    locationId: 'loc-2',
    locationName: '판교 2호점 (직영)',
    grossSales: 48000000,
    activeMembersCount: 240,
    transactionsCount: 480,
    capacitySlots: 800,
    occupiedSlots: 680,
  },
  {
    locationId: 'loc-3',
    locationName: '홍대 3호점 (가맹)',
    grossSales: 35000000,
    activeMembersCount: 190,
    transactionsCount: 380,
    capacitySlots: 700,
    occupiedSlots: 520,
  },
  {
    locationId: 'loc-4',
    locationName: '송도 4호점 (가맹)',
    grossSales: 28000000,
    activeMembersCount: 150,
    transactionsCount: 290,
    capacitySlots: 600,
    occupiedSlots: 390,
  },
];

const INITIAL_TRANSFERS: InterBranchTransferOrder[] = [
  {
    transferId: 'TRF-102901',
    fromLocationId: 'loc-1',
    fromLocationName: '강남 본점 (직영)',
    toLocationId: 'loc-3',
    toLocationName: '홍대 3호점 (가맹)',
    requestDate: '2026-10-14',
    items: [
      { sku: 'BEAN-01', itemName: '스페셜티 에스프레소 원두 1kg', quantity: 15, unitCost: 20000 },
      { sku: 'SYRUP-01', itemName: '바닐라 시럽 1L', quantity: 10, unitCost: 14000 },
    ],
    totalQuantity: 25,
    totalTransferCost: 440000,
    status: 'in_transit',
  },
  {
    transferId: 'TRF-102802',
    fromLocationId: 'loc-2',
    fromLocationName: '판교 2호점 (직영)',
    toLocationId: 'loc-4',
    toLocationName: '송도 4호점 (가맹)',
    requestDate: '2026-10-12',
    items: [
      { sku: 'TOWEL-01', itemName: '센터 스포츠 타월 100매', quantity: 2, unitCost: 150000 },
    ],
    totalQuantity: 2,
    totalTransferCost: 300000,
    status: 'received',
    receivedDate: '2026-10-13',
  },
];

const MOCK_MEMBER_PASSES: MemberPassScope[] = [
  {
    passId: 'PASS-ALL-001',
    memberId: 'MEM-101',
    memberName: '김성우 (전지점 프리패스)',
    homeLocationId: 'loc-1',
    homeLocationName: '강남 본점 (직영)',
    passType: 'all_branches',
    remainingCredits: 18,
    validUntil: '2026-12-31',
    interBranchSplitRatio: { homeSharePercent: 30, visitingSharePercent: 70 },
  },
  {
    passId: 'PASS-GANGNAM-002',
    memberId: 'MEM-102',
    memberName: '박지현 (강남점 전용)',
    homeLocationId: 'loc-1',
    homeLocationName: '강남 본점 (직영)',
    passType: 'single_location',
    remainingCredits: 5,
    validUntil: '2026-11-30',
    interBranchSplitRatio: { homeSharePercent: 100, visitingSharePercent: 0 },
  },
];

export const BranchConsolidationHqView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kpi_matrix' | 'transfers' | 'cross_pass'>('kpi_matrix');
  const [branches] = useState<LocationKpiInput[]>(INITIAL_BRANCHES);
  const [transfers, setTransfers] = useState<InterBranchTransferOrder[]>(INITIAL_TRANSFERS);
  const [passes, setPasses] = useState<MemberPassScope[]>(MOCK_MEMBER_PASSES);

  // 교차 승인 시뮬레이터 상태
  const [selectedPassId, setSelectedPassId] = useState(MOCK_MEMBER_PASSES[0].passId);
  const [targetLocationId, setTargetLocationId] = useState('loc-3'); // 홍대점 방문 가정
  const [lastCheckInResult, setLastCheckInResult] = useState<any>(null);

  // 본사 KPI 집계
  const hqSummary = aggregateHqBranchKpis(branches);

  // 재고 수령 확정 처리
  const handleConfirmReceipt = (transferId: string) => {
    setTransfers(
      transfers.map((t) =>
        t.transferId === transferId ? confirmInterBranchTransferReceipt(t) : t
      )
    );
    showToast('수신 지점에서 재고 수령이 확정되었습니다. (양 지점 재고 실시간 동기화 완료)', 'success');
  };

  // 교차 이용권 승인 시뮬레이션 실행
  const handleSimulateCrossCheckIn = () => {
    const pass = passes.find((p) => p.passId === selectedPassId);
    if (!pass) return;

    const result = verifyAndProcessCrossBranchPassCheckIn({
      pass,
      targetLocationId,
      sessionEstimatedValue: 30000,
    });

    setLastCheckInResult(result);

    if (result.isAuthorized) {
      setPasses(
        passes.map((p) =>
          p.passId === pass.passId ? { ...p, remainingCredits: result.updatedRemainingCredits } : p
        )
      );
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
            본사-가맹점 통합 관제 센터 (Multi-Branch HQ)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            전 지점 실시간 매출·객단가·가동률 비교, 지점 간 재고 수평 이동 및 멀티 지점 회원권 교차 이용 승인
          </p>
        </div>
        <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '6px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}>
          총 {hqSummary.totalLocationsCount}개 지점 통합 관제 중
        </div>
      </div>

      {/* KPI 카드 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>전 지점 통합 월 매출</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#111827', marginTop: '6px' }}>
            {hqSummary.totalGrossSales.toLocaleString()}원
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
            당월 목표 달성률 104.2%
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>전사 활성 회원 수</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2563eb', marginTop: '6px' }}>
            {hqSummary.totalActiveMembers.toLocaleString()}명
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            전 지점 합산 고유 회원수
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>평균 시설 가동률</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#7c3aed', marginTop: '6px' }}>
            {hqSummary.averageOccupancyRatePercent}%
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            피크 타임 좌석/룸 예약 점유율
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>최우수 매출 지점</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706', marginTop: '6px' }}>
            {branches[0]?.locationName}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            매출 비중 {hqSummary.branches[0]?.salesSharePercent}%
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '20px', gap: '8px' }}>
        {[
          { key: 'kpi_matrix', label: '전 지점 경영 KPI 매트릭스' },
          { key: 'transfers', label: '지점 간 재고 수평 이동 (Inter-Branch)' },
          { key: 'cross_pass', label: '멀티 지점 회원권 교차 승인 & 정산' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              color: activeTab === tab.key ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 1: 전 지점 경영 KPI 매트릭스 */}
      {activeTab === 'kpi_matrix' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>순위</th>
                <th style={{ padding: '12px 16px' }}>지점명</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>당월 매출액</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>매출 비중</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>평균 객단가</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>활성 회원 수</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>시설 가동률</th>
              </tr>
            </thead>
            <tbody>
              {hqSummary.branches.map((b) => (
                <tr key={b.locationId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: b.salesRank === 1 ? '#fef3c7' : b.salesRank === 2 ? '#f3f4f6' : '#fff',
                        color: b.salesRank === 1 ? '#d97706' : '#374151',
                        border: '1px solid #e5e7eb',
                        fontWeight: 'bold',
                        lineHeight: '22px',
                        fontSize: '12px',
                      }}
                    >
                      {b.salesRank}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#111827' }}>
                    {b.locationName}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                    {b.grossSales.toLocaleString()}원
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#2563eb', fontWeight: 500 }}>
                    {b.salesSharePercent}%
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#4b5563' }}>
                    {b.averageTicketPrice.toLocaleString()}원
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#4b5563' }}>
                    {b.activeMembersCount.toLocaleString()}명
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, color: b.occupancyRatePercent >= 80 ? '#059669' : '#d97706' }}>
                      {b.occupancyRatePercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 탭 2: 지점 간 재고 수평 이동 (Inter-Branch Transfer) */}
      {activeTab === 'transfers' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>지점 간 재고 이동(전출/전입) 전표 관리</span>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>지점 간 품목 전출입 시 원자적 재고 증감 연동</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '12px 16px' }}>전표번호 / 요청일</th>
                <th style={{ padding: '12px 16px' }}>발송(전출) 지점</th>
                <th style={{ padding: '12px 16px' }}>수신(전입) 지점</th>
                <th style={{ padding: '12px 16px' }}>이동 품목 요약</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>총 이동수량</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>이동 원가총액</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>진행 상태</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.transferId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{t.transferId}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{t.requestDate}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#dc2626', fontWeight: 500 }}>
                    {t.fromLocationName}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#059669', fontWeight: 500 }}>
                    {t.toLocationName}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#374151' }}>
                    {t.items[0]?.itemName}
                    {t.items.length > 1 ? ` 외 ${t.items.length - 1}건` : ''}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>{t.totalQuantity}개</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>
                    {t.totalTransferCost.toLocaleString()}원
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {t.status === 'in_transit' ? (
                      <button
                        onClick={() => handleConfirmReceipt(t.transferId)}
                        style={{
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        이동 중 (수령 확정)
                      </button>
                    ) : (
                      <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                        수령 완료 ({t.receivedDate})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 탭 3: 멀티 지점 회원권 교차 승인 & 정산 */}
      {activeTab === 'cross_pass' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* 교차 승인 시뮬레이터 */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: 600, color: '#111827' }}>
              타 지점 회원 교차 입장 승인기
            </h3>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                방문 회원권 선택
              </label>
              <select
                value={selectedPassId}
                onChange={(e) => setSelectedPassId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
              >
                {passes.map((p) => (
                  <option key={p.passId} value={p.passId}>
                    {p.memberName} | {p.homeLocationName} 발급 (잔여 {p.remainingCredits}회)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                현재 방문 지점
              </label>
              <select
                value={targetLocationId}
                onChange={(e) => setTargetLocationId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
              >
                {branches.map((b) => (
                  <option key={b.locationId} value={b.locationId}>{b.locationName}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSimulateCrossCheckIn}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              교차 입장 승인 및 내부 정산 실행
            </button>
          </div>

          {/* 승인 결과 및 내부 정산 분개 표출 */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: 600, color: '#111827' }}>
              실시간 교차 승인 & 지점 간 내부 정산 결과
            </h3>
            {lastCheckInResult ? (
              <div>
                {lastCheckInResult.isAuthorized ? (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                    <div style={{ color: '#065f46', fontWeight: 'bold', fontSize: '15px' }}>✓ 교차 입장 승인 완료</div>
                    <div style={{ fontSize: '13px', color: '#047857', marginTop: '4px' }}>
                      회원 잔여 횟수 1회 차감 완료 (잔여: {lastCheckInResult.updatedRemainingCredits}회)
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                    <div style={{ color: '#991b1b', fontWeight: 'bold', fontSize: '15px' }}>❌ 교차 입장 승인 거절</div>
                    <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '4px' }}>
                      사유: {lastCheckInResult.failureReason}
                    </div>
                  </div>
                )}

                {lastCheckInResult.settlementRecord && (
                  <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', fontSize: '13px', lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 600, color: '#111827', marginBottom: '6px' }}>[지점 간 내부 정산 분개표]</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>1회 환산 가액:</span>
                      <strong>{lastCheckInResult.settlementRecord.settlementAmount.toLocaleString()}원</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                      <span>발급(홈) 지점 귀속 (30%):</span>
                      <strong>+{lastCheckInResult.settlementRecord.homeShareAmount.toLocaleString()}원</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                      <span>방문(서비스) 지점 귀속 (70%):</span>
                      <strong>+{lastCheckInResult.settlementRecord.visitingShareAmount.toLocaleString()}원</strong>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>
                좌측에서 회원권을 선택하고 승인을 실행하면 결과가 여기에 표시됩니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
