import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  type StudyGroup,
  settleStudyGroup,
  calculateGroupTotalPenalty,
} from '../domain/studyGroupEngine';

export const StudyGroupListPage: React.FC = () => {
  const { query } = useList<StudyGroup>({
    resource: 'study_groups',
  });
  const items = (query?.data?.data as StudyGroup[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createGroup } = useCreate();
  const { mutate: updateGroup } = useUpdate();

  const [groupName, setGroupName] = useState('');
  const [subject, setSubject] = useState('');
  const [minRate, setMinRate] = useState(80);
  const [memberNamesInput, setMemberNamesInput] = useState('');
  const [depositAmount, setDepositAmount] = useState(50000);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !subject.trim()) {
      showToast('스터디 그룹명과 목표 과목을 입력해주세요.', 'error');
      return;
    }

    const memberNames = memberNamesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const members = memberNames.map((name, idx) => ({
      memberId: `m_${Date.now()}_${idx}`,
      memberName: name,
      depositAmount: Number(depositAmount),
      attendanceRate: 100, // 기본 100% 시작
      penaltyDeducted: 0,
      refundAmount: 0,
    }));

    createGroup(
      {
        resource: 'study_groups',
        values: {
          groupName,
          subject,
          minAttendanceRate: Number(minRate),
          members,
          status: 'active',
        },
      },
      {
        onSuccess: () => {
          showToast('자율 스터디 그룹이 개설되었습니다.', 'success');
          setGroupName('');
          setSubject('');
          setMemberNamesInput('');
          refetch();
        },
      }
    );
  };

  const handleSettle = (group: StudyGroup) => {
    const settled = settleStudyGroup(group);
    updateGroup(
      {
        resource: 'study_groups',
        id: group.id,
        values: settled,
      },
      {
        onSuccess: () => {
          showToast(`[${group.groupName}] 보증금 정산이 완료되었습니다.`, 'success');
          refetch();
        },
      }
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>자율 스터디 그룹 결성 및 출석 보증금 정산 대장</h2>
      <p style={{ color: '#666' }}>
        독서실/학원 내 자율 스터디 모임을 결성하고 목표 출석률 미달자에 대한 보증금 차감 및 환급을 일괄 정산합니다.
      </p>

      <form
        onSubmit={handleRegister}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          padding: 16,
          backgroundColor: '#f9f9f9',
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>스터디 그룹명</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="예: 2026 로스쿨 LEET 스터디"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>목표 과목/주제</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="예: 언어이해 및 추리논증"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>인당 보증금 (원)</label>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>환급 기준 최소출석률(%)</label>
          <input
            type="number"
            value={minRate}
            onChange={(e) => setMinRate(Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>참여 멤버 (쉼표 구분)</label>
          <input
            type="text"
            value={memberNamesInput}
            onChange={(e) => setMemberNamesInput(e.target.value)}
            placeholder="예: 이철수, 김영희, 박지성"
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
            그룹 개설
          </button>
        </div>
      </form>

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((group) => {
            const totalPenalty = calculateGroupTotalPenalty(group);
            return (
              <div
                key={group.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0' }}>{group.groupName}</h3>
                    <div style={{ fontSize: 13, color: '#666' }}>
                      과목: {group.subject} | 최소 출석 기준: {group.minAttendanceRate}%
                    </div>
                  </div>
                  <div>
                    {group.status !== 'settled' ? (
                      <button
                        onClick={() => handleSettle(group)}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#059669',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        보증금 정산 실행
                      </button>
                    ) : (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          fontSize: 12,
                          backgroundColor: '#d1fae5',
                          color: '#065f46',
                          fontWeight: 'bold',
                        }}
                      >
                        ✓ 정산 완료 (총 페널티: {totalPenalty.toLocaleString()}원)
                      </span>
                    )}
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: 6, textAlign: 'left' }}>멤버</th>
                      <th style={{ padding: 6, textAlign: 'right' }}>납부 보증금</th>
                      <th style={{ padding: 6, textAlign: 'right' }}>출석률</th>
                      <th style={{ padding: 6, textAlign: 'right' }}>차감 페널티</th>
                      <th style={{ padding: 6, textAlign: 'right' }}>최종 환급액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.members.map((m) => (
                      <tr key={m.memberId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: 6 }}>{m.memberName}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{m.depositAmount.toLocaleString()}원</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{m.attendanceRate}%</td>
                        <td style={{ padding: 6, textAlign: 'right', color: m.penaltyDeducted > 0 ? '#dc2626' : '#666' }}>
                          {m.penaltyDeducted.toLocaleString()}원
                        </td>
                        <td style={{ padding: 6, textAlign: 'right', fontWeight: 'bold', color: '#047857' }}>
                          {m.refundAmount.toLocaleString()}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {items.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#999', backgroundColor: '#f9f9f9', borderRadius: 8 }}>
              개설된 스터디 그룹이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
