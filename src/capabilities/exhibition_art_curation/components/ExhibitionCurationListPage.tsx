import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import { StandardDataTable, type StandardColumn } from '@/shared/components/ui/StandardDataTable';
import {
  type ArtExhibitionPiece,
  calculateMonthlyRentalTotal,
  calculateTotalInsuredValue,
} from '../domain/exhibitionCurationEngine';

export const ExhibitionCurationListPage: React.FC = () => {
  const { query } = useList<ArtExhibitionPiece>({
    resource: 'art_exhibitions',
  });
  const items = (query?.data?.data as ArtExhibitionPiece[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createPiece } = useCreate();

  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [artworkCode, setArtworkCode] = useState('');
  const [medium, setMedium] = useState('');
  const [zoneLocation, setZoneLocation] = useState('1층 로비');
  const [insuranceValue, setInsuranceValue] = useState(10000000);
  const [rentalFeeMonthly, setRentalFeeMonthly] = useState(200000);
  const [endDate, setEndDate] = useState('2026-12-31');

  const monthlyTotal = calculateMonthlyRentalTotal(items);
  const totalInsured = calculateTotalInsuredValue(items);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artistName.trim()) {
      showToast('작품명과 작가명을 입력해주세요.', 'error');
      return;
    }

    createPiece(
      {
        resource: 'art_exhibitions',
        values: {
          artworkCode: artworkCode || `ART-${Date.now().toString().slice(-4)}`,
          title,
          artistName,
          medium: medium || '캔버스 혼합매체',
          dimensions: '규격협의',
          zoneLocation,
          insuranceValue: Number(insuranceValue),
          rentalFeeMonthly: Number(rentalFeeMonthly),
          status: 'on_display',
          startDate: new Date().toISOString().split('T')[0],
          endDate,
        },
      },
      {
        onSuccess: () => {
          showToast('예술품 전시/렌탈 정보가 등록되었습니다.', 'success');
          setTitle('');
          setArtistName('');
          setArtworkCode('');
          refetch();
        },
      }
    );
  };

  const columns: StandardColumn<ArtExhibitionPiece>[] = [
    {
      key: 'artworkCode',
      header: '관리번호',
      render: (piece) => <span className="font-mono text-xs text-slate-500">{piece.artworkCode}</span>,
    },
    {
      key: 'title',
      header: '작품명 / 작가',
      render: (piece) => (
        <span className="font-semibold text-slate-900">
          {piece.title} <span className="text-slate-500 text-xs font-normal">({piece.artistName})</span>
        </span>
      ),
    },
    {
      key: 'medium',
      header: '매체 / 규격',
      render: (piece) => <span className="text-slate-600 text-xs">{piece.medium}</span>,
    },
    {
      key: 'zoneLocation',
      header: '전시 위치',
      render: (piece) => <span className="text-slate-700">{piece.zoneLocation}</span>,
    },
    {
      key: 'status',
      header: '상태',
      render: (piece) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            piece.status === 'on_display'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {piece.status === 'on_display' ? '전시 중' : piece.status}
        </span>
      ),
    },
    {
      key: 'rentalFeeMonthly',
      header: '월 렌탈료',
      align: 'right',
      render: (piece) => <span className="tabular-nums font-mono text-slate-700">{piece.rentalFeeMonthly.toLocaleString()}원</span>,
    },
    {
      key: 'insuranceValue',
      header: '보험가액',
      align: 'right',
      render: (piece) => <span className="tabular-nums font-mono text-slate-600">{piece.insuranceValue.toLocaleString()}원</span>,
    },
    {
      key: 'endDate',
      header: '전시 기한',
      render: (piece) => <span className="text-xs font-mono text-slate-500">~ {piece.endDate}</span>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2>원내 작품 전시·아트 렌탈 및 캡션 대장</h2>
      <p style={{ color: '#666' }}>
        시설 내 갤러리/로비 전시 작품의 렌탈 비용, 위치, 보험평가액 및 만료 일정을 관리합니다.
      </p>

      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, padding: 16, backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 13, color: '#166534' }}>전시 중 월간 렌탈료 총액</div>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#15803d' }}>
            {monthlyTotal.toLocaleString()}원 / 월
          </div>
        </div>
        <div style={{ flex: 1, padding: 16, backgroundColor: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 13, color: '#1e40af' }}>원내 보관/전시 총 보험평가액</div>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1d4ed8' }}>
            {totalInsured.toLocaleString()}원
          </div>
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
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>작품 관리번호</label>
          <input
            type="text"
            value={artworkCode}
            onChange={(e) => setArtworkCode(e.target.value)}
            placeholder="자동 채번 (미입력 시)"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>작품명</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 푸른 잔향"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>작가명</label>
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="예: 이우환"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>기법 / 매체</label>
          <input
            type="text"
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            placeholder="예: 유채, 청동, 판화"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>전시 구역</label>
          <input
            type="text"
            value={zoneLocation}
            onChange={(e) => setZoneLocation(e.target.value)}
            placeholder="예: 1층 메인 로비"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>월 렌탈료 (원)</label>
          <input
            type="number"
            value={rentalFeeMonthly}
            onChange={(e) => setRentalFeeMonthly(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>보험 평가액 (원)</label>
          <input
            type="number"
            value={insuranceValue}
            onChange={(e) => setInsuranceValue(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>전시 종료 예정일</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
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
            작품 등록
          </button>
        </div>
      </form>

      <StandardDataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="전시 등록된 예술품이 없습니다"
        emptyDescription="신규 작품 정보를 등록하여 전시 및 렌탈 관리를 시작하세요."
        keyExtractor={(piece) => piece.id}
      />
    </div>
  );
};
