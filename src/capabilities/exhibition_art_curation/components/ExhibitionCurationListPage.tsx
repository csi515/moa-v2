import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
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

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: 8 }}>관리번호</th>
              <th style={{ padding: 8 }}>작품명 / 작가</th>
              <th style={{ padding: 8 }}>매체 / 규격</th>
              <th style={{ padding: 8 }}>전시 위치</th>
              <th style={{ padding: 8 }}>상태</th>
              <th style={{ padding: 8 }}>월 렌탈료</th>
              <th style={{ padding: 8 }}>보험가액</th>
              <th style={{ padding: 8 }}>전시 기한</th>
            </tr>
          </thead>
          <tbody>
            {items.map((piece) => (
              <tr key={piece.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8, fontFamily: 'monospace' }}>{piece.artworkCode}</td>
                <td style={{ padding: 8, fontWeight: 500 }}>
                  {piece.title} <span style={{ color: '#666', fontSize: 12 }}>({piece.artistName})</span>
                </td>
                <td style={{ padding: 8, fontSize: 13 }}>{piece.medium}</td>
                <td style={{ padding: 8 }}>{piece.zoneLocation}</td>
                <td style={{ padding: 8 }}>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 12,
                      backgroundColor: piece.status === 'on_display' ? '#d1fae5' : '#e5e7eb',
                      color: piece.status === 'on_display' ? '#065f46' : '#374151',
                    }}
                  >
                    {piece.status === 'on_display' ? '전시 중' : piece.status}
                  </span>
                </td>
                <td style={{ padding: 8 }}>{piece.rentalFeeMonthly.toLocaleString()}원</td>
                <td style={{ padding: 8 }}>{piece.insuranceValue.toLocaleString()}원</td>
                <td style={{ padding: 8, fontSize: 12 }}>~ {piece.endDate}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  등록된 전시 작품이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
