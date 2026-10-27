import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  type MonthlyFinancialStatement,
  calculateOperatingIncome,
  calculateOperatingMargin,
  calculateTotalOpex,
  predictNextMonthCash,
} from '../domain/simplePlCashflowEngine';

export const SimplePlCashflowListPage: React.FC = () => {
  const { query } = useList<MonthlyFinancialStatement>({
    resource: 'financial_statements',
  });
  const items = (query?.data?.data as MonthlyFinancialStatement[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createStatement } = useCreate();

  const [yearMonth, setYearMonth] = useState('2026-10');
  const [revenue, setRevenue] = useState(12000000);
  const [cogs, setCogs] = useState(2500000);
  const [labor, setLabor] = useState(4500000);
  const [rent, setRent] = useState(1500000);
  const [utilities, setUtilities] = useState(400000);
  const [marketing, setMarketing] = useState(300000);
  const [others, setOthers] = useState(200000);
  const [currentCash, setCurrentCash] = useState(8000000);
  const [expectedInflow, setExpectedInflow] = useState(10000000);
  const [expectedOutflow, setExpectedOutflow] = useState(9000000);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearMonth) {
      showToast('정산 연월을 입력해주세요.', 'error');
      return;
    }

    createStatement(
      {
        resource: 'financial_statements',
        values: {
          yearMonth,
          grossRevenue: Number(revenue),
          costOfGoodsSold: Number(cogs),
          operatingExpenses: {
            labor: Number(labor),
            rent: Number(rent),
            utilities: Number(utilities),
            marketing: Number(marketing),
            others: Number(others),
          },
          currentCashBalance: Number(currentCash),
          expectedInflowsNextMonth: Number(expectedInflow),
          expectedOutflowsNextMonth: Number(expectedOutflow),
        },
      },
      {
        onSuccess: () => {
          showToast('월간 손익 및 현금흐름 데이터가 저장되었습니다.', 'success');
          refetch();
        },
      }
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>매장 간이 손익계산서 & 현금흐름 예측기</h2>
      <p style={{ color: '#666' }}>
        월별 매출, 원가, 판관비를 종합하여 실질 영업이익을 산출하고 다음 달 현금 잔고 소진(Burn-Rate)을 사전 예측합니다.
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
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>정산 연월 (YYYY-MM)</label>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>총매출액 (원)</label>
          <input
            type="number"
            value={revenue}
            onChange={(e) => setRevenue(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>매출원가(재료비) (원)</label>
          <input
            type="number"
            value={cogs}
            onChange={(e) => setCogs(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>인건비(급여/수당) (원)</label>
          <input
            type="number"
            value={labor}
            onChange={(e) => setLabor(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>임차료(월세) (원)</label>
          <input
            type="number"
            value={rent}
            onChange={(e) => setRent(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>관리비/공과금 (원)</label>
          <input
            type="number"
            value={utilities}
            onChange={(e) => setUtilities(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>현재 보유 통장/시재금 (원)</label>
          <input
            type="number"
            value={currentCash}
            onChange={(e) => setCurrentCash(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>차월 예상 매출 유입 (원)</label>
          <input
            type="number"
            value={expectedInflow}
            onChange={(e) => setExpectedInflow(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>차월 예상 고정 지출 (원)</label>
          <input
            type="number"
            value={expectedOutflow}
            onChange={(e) => setExpectedOutflow(Number(e.target.value))}
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
            손익 전표 저장
          </button>
        </div>
      </form>

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: 8 }}>정산 연월</th>
              <th style={{ padding: 8 }}>총매출</th>
              <th style={{ padding: 8 }}>매출원가</th>
              <th style={{ padding: 8 }}>총 판관비</th>
              <th style={{ padding: 8 }}>영업이익 (이익률)</th>
              <th style={{ padding: 8 }}>현재 잔고</th>
              <th style={{ padding: 8 }}>차월말 예상 잔고 (위험도)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((stmt) => {
              const totalOpex = calculateTotalOpex(stmt.operatingExpenses);
              const opIncome = calculateOperatingIncome(
                stmt.grossRevenue,
                stmt.costOfGoodsSold,
                stmt.operatingExpenses
              );
              const margin = calculateOperatingMargin(stmt.grossRevenue, opIncome);
              const forecast = predictNextMonthCash(
                stmt.currentCashBalance,
                stmt.expectedInflowsNextMonth,
                stmt.expectedOutflowsNextMonth,
                5000000 // 500만원 안전 기준
              );

              return (
                <tr key={stmt.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8, fontWeight: 'bold' }}>{stmt.yearMonth}</td>
                  <td style={{ padding: 8 }}>{stmt.grossRevenue.toLocaleString()}원</td>
                  <td style={{ padding: 8 }}>{stmt.costOfGoodsSold.toLocaleString()}원</td>
                  <td style={{ padding: 8 }}>{totalOpex.toLocaleString()}원</td>
                  <td style={{ padding: 8, fontWeight: 'bold', color: opIncome >= 0 ? '#059669' : '#dc2626' }}>
                    {opIncome.toLocaleString()}원 ({margin}%)
                  </td>
                  <td style={{ padding: 8 }}>{stmt.currentCashBalance.toLocaleString()}원</td>
                  <td style={{ padding: 8 }}>
                    <span>{forecast.projectedBalance.toLocaleString()}원</span>{' '}
                    {forecast.isDeficitRisk ? (
                      <span
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 'bold',
                        }}
                      >
                        ⚠️ 안전잔고 부족 (-{forecast.shortfallAmount.toLocaleString()}원)
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: '#d1fae5',
                          color: '#065f46',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                        }}
                      >
                        ✓ 양호
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  등록된 손익 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
