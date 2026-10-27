import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  type VendorEvaluationRecord,
  calculateCompositeScore,
  determineVendorTier,
} from '../domain/vendorScorecardEngine';

export const VendorScorecardListPage: React.FC = () => {
  const { query } = useList<VendorEvaluationRecord>({
    resource: 'vendor_evaluations',
  });
  const items = (query?.data?.data as VendorEvaluationRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createEvaluation } = useCreate();

  const [vendorCode, setVendorCode] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState('화훼/식물');
  const [deliveryPunctualityRate, setDeliveryPunctualityRate] = useState(95);
  const [defectRate, setDefectRate] = useState(2);
  const [priceScore, setPriceScore] = useState(4);
  const [csScore, setCsScore] = useState(5);
  const [period, setPeriod] = useState('2026-Q3');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      showToast('거래처명을 입력해주세요.', 'error');
      return;
    }

    createEvaluation(
      {
        resource: 'vendor_evaluations',
        values: {
          vendorCode: vendorCode || `VND-${Date.now().toString().slice(-4)}`,
          vendorName,
          category,
          deliveryPunctualityRate: Number(deliveryPunctualityRate),
          defectRate: Number(defectRate),
          priceCompetitivenessScore: Number(priceScore),
          csResponsivenessScore: Number(csScore),
          evaluationPeriod: period,
        },
      },
      {
        onSuccess: () => {
          showToast('거래처 다면 평가가 등록되었습니다.', 'success');
          setVendorName('');
          setVendorCode('');
          refetch();
        },
      }
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>거래처 공급업체 다면 평가표</h2>
      <p style={{ color: '#666' }}>
        화원, 에스테틱 앰플 도매상, 교재 출판사 등 정기 납품업체의 납기 준수율, 불량률, 단가 및 CS 점수를 가중 종합 평가합니다.
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
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>거래처 관리코드</label>
          <input
            type="text"
            value={vendorCode}
            onChange={(e) => setVendorCode(e.target.value)}
            placeholder="자동 채번 (미입력 시)"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>거래처명</label>
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="예: 서울화훼종묘협동조합"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>품목 분류</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="예: 화훼, 화장품, 악기교재"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>납기 준수율 (%)</label>
          <input
            type="number"
            value={deliveryPunctualityRate}
            onChange={(e) => setDeliveryPunctualityRate(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>불량/파손율 (%)</label>
          <input
            type="number"
            value={defectRate}
            onChange={(e) => setDefectRate(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>단가 경쟁력 (1~5점)</label>
          <input
            type="number"
            min={1}
            max={5}
            value={priceScore}
            onChange={(e) => setPriceScore(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>CS 응대 만족도 (1~5점)</label>
          <input
            type="number"
            min={1}
            max={5}
            value={csScore}
            onChange={(e) => setCsScore(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>평가 분기/기간</label>
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="예: 2026-Q3"
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
            평가 등록
          </button>
        </div>
      </form>

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: 8 }}>거래처 코드</th>
              <th style={{ padding: 8 }}>거래처명 / 분류</th>
              <th style={{ padding: 8 }}>평가 기간</th>
              <th style={{ padding: 8 }}>납기준수율 / 불량률</th>
              <th style={{ padding: 8 }}>단가 / CS 평점</th>
              <th style={{ padding: 8 }}>종합 평가 점수</th>
              <th style={{ padding: 8 }}>파트너 등급</th>
            </tr>
          </thead>
          <tbody>
            {items.map((record) => {
              const score = calculateCompositeScore(
                record.deliveryPunctualityRate,
                record.defectRate,
                record.priceCompetitivenessScore,
                record.csResponsivenessScore
              );
              const tier = determineVendorTier(score);

              return (
                <tr key={record.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8, fontFamily: 'monospace' }}>{record.vendorCode}</td>
                  <td style={{ padding: 8, fontWeight: 500 }}>
                    {record.vendorName}{' '}
                    <span style={{ fontSize: 12, color: '#666' }}>({record.category})</span>
                  </td>
                  <td style={{ padding: 8 }}>{record.evaluationPeriod}</td>
                  <td style={{ padding: 8 }}>
                    준수 {record.deliveryPunctualityRate}% / 불량 {record.defectRate}%
                  </td>
                  <td style={{ padding: 8 }}>
                    단가 {record.priceCompetitivenessScore}점 / CS {record.csResponsivenessScore}점
                  </td>
                  <td style={{ padding: 8, fontWeight: 'bold', fontSize: 15, color: '#1d4ed8' }}>
                    {score}점
                  </td>
                  <td style={{ padding: 8 }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 'bold',
                        backgroundColor:
                          tier === 'A_EXCELLENT'
                            ? '#d1fae5'
                            : tier === 'B_GOOD'
                            ? '#e0e7ff'
                            : tier === 'C_AVERAGE'
                            ? '#fef3c7'
                            : '#fee2e2',
                        color:
                          tier === 'A_EXCELLENT'
                            ? '#065f46'
                            : tier === 'B_GOOD'
                            ? '#3730a3'
                            : tier === 'C_AVERAGE'
                            ? '#92400e'
                            : '#991b1b',
                      }}
                    >
                      {tier === 'A_EXCELLENT'
                        ? '★ A (최우수)'
                        : tier === 'B_GOOD'
                        ? 'B (우수)'
                        : tier === 'C_AVERAGE'
                        ? 'C (보통)'
                        : '🚨 D (재검토)'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  등록된 거래처 평가 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
