import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  type MentoringPair,
  calculateCompletionRate,
  isEligibleForReward,
} from '../domain/mentorMenteeEngine';

export const MentorMenteeListPage: React.FC = () => {
  const { query } = useList<MentoringPair>({
    resource: 'mentoring_pairs',
  });
  const items = (query?.data?.data as MentoringPair[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createPair } = useCreate();
  const { mutate: updatePair } = useUpdate();

  const [mentorName, setMentorName] = useState('');
  const [menteeName, setMenteeName] = useState('');
  const [topic, setTopic] = useState('');
  const [targetSessions, setTargetSessions] = useState(8);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorName.trim() || !menteeName.trim() || !topic.trim()) {
      showToast('멘토, 멘티 이름과 멘토링 주제를 입력해주세요.', 'error');
      return;
    }

    createPair(
      {
        resource: 'mentoring_pairs',
        values: {
          mentorName,
          menteeName,
          topic,
          targetSessions: Number(targetSessions),
          completedSessions: 0,
          menteeRating: 5.0,
          status: 'active',
        },
      },
      {
        onSuccess: () => {
          showToast('새로운 멘토-멘티 매칭이 생성되었습니다.', 'success');
          setMentorName('');
          setMenteeName('');
          setTopic('');
          refetch();
        },
      }
    );
  };

  const handleAddSession = (pair: MentoringPair) => {
    const nextCompleted = Math.min(pair.targetSessions, pair.completedSessions + 1);
    const nextStatus = nextCompleted >= pair.targetSessions ? 'completed' : 'active';

    updatePair(
      {
        resource: 'mentoring_pairs',
        id: pair.id,
        values: {
          ...pair,
          completedSessions: nextCompleted,
          status: nextStatus,
        },
      },
      {
        onSuccess: () => {
          showToast(`[${pair.mentorName} - ${pair.menteeName}] 세션이 기록되었습니다.`, 'success');
          refetch();
        },
      }
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>수강생 선후배 멘토링 매칭 및 활동 평가 대장</h2>
      <p style={{ color: '#666' }}>
        상급생과 신규 원생 간의 1:1 멘토링 진행률, 세션 출석, 피드백 평점 및 우수 멘토 장학 혜택 자격을 관리합니다.
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
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>멘토 (선배)</label>
          <input
            type="text"
            value={mentorName}
            onChange={(e) => setMentorName(e.target.value)}
            placeholder="예: 김선배"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>멘티 (후배)</label>
          <input
            type="text"
            value={menteeName}
            onChange={(e) => setMenteeName(e.target.value)}
            placeholder="예: 이신입"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>멘토링 주제</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 체르니 30번 테크닉 코칭"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>목표 세션 수 (회)</label>
          <input
            type="number"
            value={targetSessions}
            onChange={(e) => setTargetSessions(Number(e.target.value))}
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
            멘토링 매칭 등록
          </button>
        </div>
      </form>

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: 8 }}>멘토 / 멘티</th>
              <th style={{ padding: 8 }}>멘토링 주제</th>
              <th style={{ padding: 8 }}>진행률</th>
              <th style={{ padding: 8 }}>만족도 평점</th>
              <th style={{ padding: 8 }}>상태</th>
              <th style={{ padding: 8 }}>우수 장학 자격</th>
              <th style={{ padding: 8 }}>세션 기록</th>
            </tr>
          </thead>
          <tbody>
            {items.map((pair) => {
              const completionRate = calculateCompletionRate(pair);
              const eligible = isEligibleForReward(pair, pair.targetSessions, 4.5);

              return (
                <tr key={pair.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8, fontWeight: 500 }}>
                    {pair.mentorName} ➔ {pair.menteeName}
                  </td>
                  <td style={{ padding: 8 }}>{pair.topic}</td>
                  <td style={{ padding: 8 }}>
                    <div style={{ fontSize: 12, marginBottom: 2 }}>
                      {pair.completedSessions} / {pair.targetSessions}회 ({completionRate}%)
                    </div>
                    <div style={{ width: '100px', height: 6, backgroundColor: '#e5e7eb', borderRadius: 3 }}>
                      <div
                        style={{
                          width: `${completionRate}%`,
                          height: '100%',
                          backgroundColor: '#4f46e5',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: 8, color: '#f59e0b', fontWeight: 'bold' }}>
                    ★ {pair.menteeRating.toFixed(1)}
                  </td>
                  <td style={{ padding: 8 }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor: pair.status === 'completed' ? '#d1fae5' : '#eff6ff',
                        color: pair.status === 'completed' ? '#065f46' : '#1d4ed8',
                      }}
                    >
                      {pair.status === 'completed' ? '수료 완료' : '진행 중'}
                    </span>
                  </td>
                  <td style={{ padding: 8 }}>
                    {eligible ? (
                      <span style={{ color: '#059669', fontWeight: 'bold', fontSize: 12 }}>
                        🏅 장학 포인트 대상
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    {pair.status === 'active' && (
                      <button
                        onClick={() => handleAddSession(pair)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        + 세션 1회 완료
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                  등록된 멘토링 매칭 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
