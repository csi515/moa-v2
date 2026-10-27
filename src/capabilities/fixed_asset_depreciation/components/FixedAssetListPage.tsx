import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  type FixedAssetItem,
  type AssetAuditStatus,
  calculateAccumulatedDepreciation,
  calculateMonthlyDepreciation,
} from '../domain/fixedAssetEngine';

export const FixedAssetListPage: React.FC = () => {
  const { query } = useList<FixedAssetItem>({
    resource: 'fixed_assets',
  });
  const items = (query?.data?.data as FixedAssetItem[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createAsset } = useCreate();
  const { mutate: updateAsset } = useUpdate();

  const [assetName, setAssetName] = useState('');
  const [assetCode, setAssetCode] = useState('');
  const [category, setCategory] = useState('악기/예술장비');
  const [acquisitionCost, setAcquisitionCost] = useState(5000000);
  const [acquisitionDate, setAcquisitionDate] = useState('2024-01-01');
  const [usefulLifeYears, setUsefulLifeYears] = useState(5);
  const [salvageValue, setSalvageValue] = useState(1000);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) {
      showToast('자산명을 입력해주세요.', 'error');
      return;
    }

    createAsset(
      {
        resource: 'fixed_assets',
        values: {
          assetCode: assetCode || `AST-${Date.now().toString().slice(-4)}`,
          assetName,
          category,
          acquisitionCost: Number(acquisitionCost),
          acquisitionDate,
          usefulLifeYears: Number(usefulLifeYears),
          salvageValue: Number(salvageValue),
          auditStatus: 'active_normal',
        },
      },
      {
        onSuccess: () => {
          showToast('고정자산이 장부에 등록되었습니다.', 'success');
          setAssetName('');
          setAssetCode('');
          refetch();
        },
      }
    );
  };

  const handleStatusChange = (asset: FixedAssetItem, newStatus: AssetAuditStatus) => {
    updateAsset(
      {
        resource: 'fixed_assets',
        id: asset.id,
        values: {
          ...asset,
          auditStatus: newStatus,
        },
      },
      {
        onSuccess: () => {
          showToast('실사 상태가 갱신되었습니다.', 'success');
          refetch();
        },
      }
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>고정자산 감가상각 & 바코드 실사 대장</h2>
      <p style={{ color: '#666' }}>
        피아노, 피부관리 기기, 주방 설비 등 고가 자산의 취득원가, 내용연수, 월별 감가상각비 및 장부가치를 추적합니다.
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
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>자산 관리번호</label>
          <input
            type="text"
            value={assetCode}
            onChange={(e) => setAssetCode(e.target.value)}
            placeholder="자동 채번 (미입력 시)"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>자산/비품명</label>
          <input
            type="text"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder="예: 야마하 그랜드 피아노 C3X"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>자산 분류</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="예: 악기, 시술기기, 냉장고"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>취득원가 (원)</label>
          <input
            type="number"
            value={acquisitionCost}
            onChange={(e) => setAcquisitionCost(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>취득일자</label>
          <input
            type="date"
            value={acquisitionDate}
            onChange={(e) => setAcquisitionDate(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>내용연수 (년)</label>
          <input
            type="number"
            value={usefulLifeYears}
            onChange={(e) => setUsefulLifeYears(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>상각완료 잔존/비망가 (원)</label>
          <input
            type="number"
            value={salvageValue}
            onChange={(e) => setSalvageValue(Number(e.target.value))}
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
            자산 등록
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
              <th style={{ padding: 8 }}>자산명 / 분류</th>
              <th style={{ padding: 8 }}>취득원가</th>
              <th style={{ padding: 8 }}>월 상각액</th>
              <th style={{ padding: 8 }}>감가상각 누계액 (경과월)</th>
              <th style={{ padding: 8 }}>현재 장부가액</th>
              <th style={{ padding: 8 }}>실사 상태 변경</th>
            </tr>
          </thead>
          <tbody>
            {items.map((asset) => {
              const monthly = calculateMonthlyDepreciation(
                asset.acquisitionCost,
                asset.salvageValue,
                asset.usefulLifeYears
              );
              const dep = calculateAccumulatedDepreciation(
                asset.acquisitionCost,
                asset.salvageValue,
                asset.usefulLifeYears,
                asset.acquisitionDate,
                todayStr
              );

              return (
                <tr key={asset.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8, fontFamily: 'monospace' }}>{asset.assetCode}</td>
                  <td style={{ padding: 8, fontWeight: 500 }}>
                    {asset.assetName}{' '}
                    <span style={{ fontSize: 12, color: '#666' }}>({asset.category})</span>
                  </td>
                  <td style={{ padding: 8 }}>{asset.acquisitionCost.toLocaleString()}원</td>
                  <td style={{ padding: 8 }}>{monthly.toLocaleString()}원 / 월</td>
                  <td style={{ padding: 8 }}>
                    {dep.accumulated.toLocaleString()}원 ({dep.elapsedMonths}개월 경과)
                    {dep.isFullyDepreciated && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          backgroundColor: '#e5e7eb',
                          padding: '1px 4px',
                          borderRadius: 4,
                        }}
                      >
                        상각완료
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 8, fontWeight: 'bold', color: '#1d4ed8' }}>
                    {dep.bookValue.toLocaleString()}원
                  </td>
                  <td style={{ padding: 8 }}>
                    <select
                      value={asset.auditStatus}
                      onChange={(e) => handleStatusChange(asset, e.target.value as AssetAuditStatus)}
                      style={{
                        padding: 4,
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor:
                          asset.auditStatus === 'active_normal'
                            ? '#d1fae5'
                            : asset.auditStatus === 'needs_repair'
                            ? '#fef3c7'
                            : '#fee2e2',
                      }}
                    >
                      <option value="active_normal">✓ 정상 가동</option>
                      <option value="needs_repair">⚠️ 수리/보수 필요</option>
                      <option value="missing">🚨 분실/망실</option>
                      <option value="scrapped">🗑️ 폐기 완료</option>
                    </select>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  등록된 고정자산이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
