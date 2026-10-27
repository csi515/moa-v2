import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordQuestProgress,
  getTierColors,
  renderAchievementBadgeSvg,
  formatAchievementShareText,
  type AchievementQuestItem,
  type AchievementQuestMemberItem,
} from './achievementQuestEngine';

describe('achievement_quest_badge - domain engine', () => {
  it('진척도 누적 시 목표 달성 여부가 정확히 판정된다', () => {
    // 10회 목표 중 5회에서 3회 추가 -> 8회 (미달성)
    const res1 = recordQuestProgress(5, 3, 10);
    assert.equal(res1.newProgress, 8);
    assert.equal(res1.isCompleted, false);
    assert.equal(res1.justCompleted, false);

    // 8회에서 2회 추가 -> 10회 (달성 완료 순간)
    const res2 = recordQuestProgress(8, 2, 10);
    assert.equal(res2.newProgress, 10);
    assert.equal(res2.isCompleted, true);
    assert.equal(res2.justCompleted, true);

    // 이미 달성한 10회에서 1회 추가 -> 11회 (달성은 유지되나 justCompleted=false)
    const res3 = recordQuestProgress(10, 1, 10);
    assert.equal(res3.newProgress, 11);
    assert.equal(res3.isCompleted, true);
    assert.equal(res3.justCompleted, false);
  });

  it('티어별 스타일 색상이 정상 반환된다', () => {
    const gold = getTierColors('gold');
    assert.ok(gold.bgGradient.includes('goldGrad'));
    const diamond = getTierColors('diamond');
    assert.ok(diamond.bgGradient.includes('diamondGrad'));
  });

  it('W3C SVG 뱃지 훈장 및 축하 공유 텍스트가 정상 생성된다', () => {
    const quest: AchievementQuestItem = {
      id: 'q-1',
      organizationId: 'org-1',
      title: '체르니 100번 완주 퀘스트',
      category: 'skill',
      targetCount: 100,
      unit: '곡',
      badgeTier: 'gold',
      badgeIconName: 'trophy',
      rewardPoints: 1000,
      isActive: true,
      createdAt: '2026-10-17T10:00:00Z',
      updatedAt: '2026-10-17T10:00:00Z',
    };

    const member: AchievementQuestMemberItem = {
      id: 'qm-1',
      organizationId: 'org-1',
      questId: 'q-1',
      memberName: '정하은',
      currentProgress: 100,
      isCompleted: true,
      badgeIssued: true,
      createdAt: '2026-10-17T10:00:00Z',
      updatedAt: '2026-10-17T10:00:00Z',
    };

    const svg = renderAchievementBadgeSvg(quest, member);
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('체르니 100번 완주 퀘스트'));
    assert.ok(svg.includes('정하은'));
    assert.ok(svg.includes('GOLD BADGE'));

    const text = formatAchievementShareText(quest, member);
    assert.ok(text.includes('정하은'));
    assert.ok(text.includes('체르니 100번 완주 퀘스트'));
    assert.ok(text.includes('+1000 포인트'));
  });
});
