import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import {
  assembleIntakeSummaryCard,
  type IntakeSubmission,
} from '../domain/intakeAssessmentEngine';

export const IntakeAssessmentView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'new'>('submissions');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [hasDisc, setHasDisc] = useState(false);
  const [hasAllergy, setHasAllergy] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('체형교정');
  const [summaryPreview, setSummaryPreview] = useState<string | null>(null);

  // 1. 문진표 제출 내역 조회 (Refine v5)
  const { query } = useList<IntakeSubmission>({
    resource: 'intake_submissions',
    pagination: { pageSize: 50 },
  });
  const submissions = query?.data?.data ?? [];
  const isLoading = query?.isLoading;

  // 2. 신규 문진표 작성 뮤테이션
  const { mutate: createSubmission } = useCreate();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const riskFlags: string[] = [];
    if (hasDisc) riskFlags.push('척추/디스크 질환 주의');
    if (hasAllergy) riskFlags.push('약물/금속/피부 알레르기');

    const hasCriticalCondition = hasDisc || hasAllergy;

    setIsCreating(true);
    createSubmission(
      {
        resource: 'intake_submissions',
        values: {
          template_id: '00000000-0000-0000-0000-000000000001',
          customer_name: customerName,
          customer_phone: customerPhone,
          answers: {
            hasDisc,
            hasAllergy,
            selectedGoal,
          },
          risk_flags: riskFlags,
          has_critical_condition: hasCriticalCondition,
        },
      },
      {
        onSuccess: () => {
          setIsCreating(false);
          setCustomerName('');
          setCustomerPhone('');
          setHasDisc(false);
          setHasAllergy(false);
          setActiveTab('submissions');
        },
        onError: () => {
          setIsCreating(false);
        },
      }
    );
  };

  const handleShowSummary = (sub: IntakeSubmission) => {
    const card = assembleIntakeSummaryCard(sub);
    setSummaryPreview(card);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(card);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          사전 문진표 & 첫 방문 고객 맞춤 진단서
        </h1>
        <p style={{ color: '#4B5563', fontSize: '14px', marginTop: '6px' }}>
          첫 방문 고객 병력/주의사항(디스크, 알레르기) 실시간 위험 감지 및 담당 강사용 요약 카드
        </p>
      </header>

      {summaryPreview && (
        <div
          style={{
            backgroundColor: '#1E293B',
            color: '#F8FAFC',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            fontSize: '13px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#38BDF8', fontWeight: 'bold' }}>✓ 클립보드 복사됨 (카톡/메모에 붙여넣기 가능)</span>
            <button
              type="button"
              onClick={() => setSummaryPreview(null)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
            >
              닫기 ✕
            </button>
          </div>
          {summaryPreview}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E5E7EB', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'submissions' ? 600 : 400,
            borderBottom: activeTab === 'submissions' ? '2px solid #2563EB' : 'none',
            color: activeTab === 'submissions' ? '#2563EB' : '#6B7280',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          제출된 문진표 ({submissions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'new' ? 600 : 400,
            borderBottom: activeTab === 'new' ? '2px solid #2563EB' : 'none',
            color: activeTab === 'new' ? '#2563EB' : '#6B7280',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          + 신규 문진표 작성
        </button>
      </div>

      {activeTab === 'submissions' ? (
        <div>
          {isLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>문진표 내역 로딩 중...</div>
          ) : submissions.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                color: '#6B7280',
              }}
            >
              등록된 사전 문진표가 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>고객명</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>연락처</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>위험 감지 여부</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>주의 이력 플래그</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>작성일</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>
                        {sub.customerName}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                        {sub.customerPhone || '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {sub.hasCriticalCondition ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: '#FEE2E2',
                              color: '#991B1B',
                            }}
                          >
                            🚨 집중 주의
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 500,
                              backgroundColor: '#DEF7EC',
                              color: '#03543F',
                            }}
                          >
                            ✓ 정상
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                        {sub.riskFlags && sub.riskFlags.length > 0 ? sub.riskFlags.join(', ') : '없음'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6B7280' }}>
                        {sub.createdAt ? sub.createdAt.slice(0, 10) : '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => handleShowSummary(sub)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#F3F4F6',
                            color: '#1F2937',
                            border: '1px solid #D1D5DB',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          📋 요약 카드
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleCreateSubmission}
          style={{
            maxWidth: '560px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>
            현장 사전 문진표 간편 입력
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              고객 성함
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="예: 홍길동"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              연락처
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="예: 010-1234-5678"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              방문 목적
            </label>
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
              }}
            >
              <option value="체형교정">체형교정 / 자세개선</option>
              <option value="다이어트">다이어트 / 체지방 감량</option>
              <option value="근력증가">근력 증가 / 체력 증진</option>
              <option value="재활">재활 / 통증 완화</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#991B1B', marginBottom: '8px' }}>
              ⚠️ 주의 요망 병력 체크
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', marginBottom: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasDisc}
                onChange={(e) => setHasDisc(e.target.checked)}
              />
              허리/목 디스크 또는 척추 관절 질환 이력이 있습니다.
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasAllergy}
                onChange={(e) => setHasAllergy(e.target.checked)}
              />
              약물, 금속, 피부 알레르기 또는 특이 질환이 있습니다.
            </label>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isCreating ? '저장 중...' : '문진표 등록 및 위험 분석'}
          </button>
        </form>
      )}
    </div>
  );
};
