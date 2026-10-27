import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  recordQuestProgress,
  renderAchievementBadgeSvg,
  formatAchievementShareText,
  type AchievementQuestItem,
  type AchievementQuestMemberItem,
  type QuestCategory,
  type BadgeTier,
  type BadgeIconName,
} from '../domain/achievementQuestEngine';

export const AchievementQuestBadgeView: React.FC = () => {
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<AchievementQuestMemberItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 퀘스트 생성 폼
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<QuestCategory>('skill');
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unit, setUnit] = useState('회');
  const [badgeTier, setBadgeTier] = useState<BadgeTier>('gold');
  const [badgeIconName, setBadgeIconName] = useState<BadgeIconName>('trophy');
  const [rewardPoints, setRewardPoints] = useState<number>(500);

  // 진척도 추가 폼
  const [progressDelta, setProgressDelta] = useState<number>(1);

  // 퀘스트 목록
  const { query: questQuery } = useList<AchievementQuestItem>({
    resource: 'achievement_quests',
    pagination: { pageSize: 50 },
  });

  // 회원별 참여 목록
  const { query: memberQuery } = useList<AchievementQuestMemberItem>({
    resource: 'achievement_quest_members',
    pagination: { pageSize: 100 },
  });

  const { mutate: createQuest } = useCreate<AchievementQuestItem>();
  const { mutate: updateMember } = useUpdate<AchievementQuestMemberItem>();

  const quests = (questQuery?.data?.data as AchievementQuestItem[]) || [];
  const members = (memberQuery?.data?.data as AchievementQuestMemberItem[]) || [];

  const activeQuestId = selectedQuestId || (quests.length > 0 ? quests[0].id : null);
  const activeQuest = quests.find((q) => q.id === activeQuestId);
  const currentMembers = activeQuestId ? members.filter((m) => m.questId === activeQuestId) : members;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || targetCount <= 0) return;

    setIsSubmitting(true);
    createQuest(
      {
        resource: 'achievement_quests',
        values: {
          title,
          description,
          category,
          target_count: targetCount,
          unit,
          badge_tier: badgeTier,
          badge_icon_name: badgeIconName,
          reward_points: rewardPoints,
          is_active: true,
        },
      },
      {
        onSuccess: () => {
          setIsSubmitting(false);
          setShowCreateModal(false);
          setTitle('');
          setDescription('');
          questQuery?.refetch();
        },
        onError: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleAddProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !activeQuest) return;

    const result = recordQuestProgress(selectedMember.currentProgress, progressDelta, activeQuest.targetCount);

    updateMember(
      {
        resource: 'achievement_quest_members',
        id: selectedMember.id,
        values: {
          current_progress: result.newProgress,
          is_completed: result.isCompleted,
          completed_at: result.justCompleted ? new Date().toISOString() : selectedMember.completedAt,
          badge_issued: result.isCompleted,
          badge_issued_at: result.justCompleted ? new Date().toISOString() : selectedMember.badgeIssuedAt,
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setShowProgressModal(false);
          memberQuery?.refetch();
          setSelectedMember({
            ...selectedMember,
            currentProgress: result.newProgress,
            isCompleted: result.isCompleted,
            badgeIssued: result.isCompleted,
          });
        },
      }
    );
  };

  const handleCopyCelebration = (quest: AchievementQuestItem, member: AchievementQuestMemberItem) => {
    const text = formatAchievementShareText(quest, member);
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>🎖️ 원생 성취 퀘스트 & 디지털 뱃지 수여 엔진</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            원생에게 도전 과제를 부여하고, 목표 완주 시 비용 0원의 고품질 W3C SVG 공식 메달 뱃지를 수여합니다.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            backgroundColor: '#f59e0b',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          + 새 퀘스트 만들기
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedMember && activeQuest ? '1fr 380px' : '1fr', gap: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* 퀘스트 탭 */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '8px 16px', gap: '8px', overflowX: 'auto' }}>
            {quests.map((q) => (
              <button
                key={q.id}
                onClick={() => {
                  setSelectedQuestId(q.id);
                  setSelectedMember(null);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeQuestId === q.id ? '#f59e0b' : 'transparent',
                  color: activeQuestId === q.id ? '#fff' : '#64748b',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {q.title} ({q.badgeTier.toUpperCase()})
              </button>
            ))}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>도전자(원생)</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>진척도 / 목표</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>달성률</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>뱃지 상태</th>
                <th style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {currentMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    현재 이 퀘스트에 도전 중인 원생이 없습니다.
                  </td>
                </tr>
              ) : (
                currentMembers.map((m) => {
                  const target = activeQuest ? activeQuest.targetCount : 10;
                  const pct = Math.min(100, Math.round((m.currentProgress / target) * 100));
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: selectedMember?.id === m.id ? '#fffbeb' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold' }}>
                        {m.memberName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        {m.currentProgress} / {target} {activeQuest?.unit || '회'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ width: '100px', background: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, background: m.isCompleted ? '#16a34a' : '#f59e0b', height: '100%' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{pct}%</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {m.isCompleted ? (
                          <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', fontSize: '12px', fontWeight: 'bold' }}>
                            🎖️ 뱃지 수여 완료
                          </span>
                        ) : (
                          <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b', fontSize: '12px' }}>
                            진행 중
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMember(m);
                            setShowProgressModal(true);
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer',
                            marginRight: '6px',
                          }}
                        >
                          + 진척 추가
                        </button>
                        {m.isCompleted && activeQuest && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCelebration(activeQuest, m);
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: 'none',
                              background: '#fef3c7',
                              color: '#b45309',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            {copySuccess ? '복사됨!' : '축하글 복사'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selectedMember && activeQuest && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>디지털 뱃지 인증서</h2>
              <button
                onClick={() => setSelectedMember(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{ width: '100%', maxWidth: '340px', margin: '0 auto 16px auto' }}
              dangerouslySetInnerHTML={{ __html: renderAchievementBadgeSvg(activeQuest, selectedMember) }}
            />

            <button
              onClick={() => handleCopyCelebration(activeQuest, selectedMember)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: '#f59e0b',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {copySuccess ? '축하 메시지 복사 완료!' : '📢 카카오톡/학부모 축하 메시지 전송'}
            </button>
          </div>
        )}
      </div>

      {/* 새 퀘스트 생성 모달 */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '480px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>🎖️ 새 성취 퀘스트 개설</h2>
            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>퀘스트 명칭 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 체르니 100번 완주 퀘스트"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>목표 수치 *</label>
                  <input
                    type="number"
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    min={1}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>단위</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="예: 회, 곡, 일"
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>뱃지 티어</label>
                  <select
                    value={badgeTier}
                    onChange={(e) => setBadgeTier(e.target.value as BadgeTier)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  >
                    <option value="bronze">브론즈 (동)</option>
                    <option value="silver">실버 (은)</option>
                    <option value="gold">골드 (금)</option>
                    <option value="platinum">플래티넘</option>
                    <option value="diamond">다이아몬드</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>보상 포인트 (P)</label>
                  <input
                    type="number"
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isSubmitting ? '등록 중...' : '퀘스트 개설'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 진척도 추가 모달 */}
      {showProgressModal && selectedMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '360px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
              {selectedMember.memberName} 원생 진척 추가
            </h2>
            <form onSubmit={handleAddProgress}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  추가할 달성량 ({activeQuest?.unit || '회'})
                </label>
                <input
                  type="number"
                  value={progressDelta}
                  onChange={(e) => setProgressDelta(Number(e.target.value))}
                  min={1}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  진척 반영
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
