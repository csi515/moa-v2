import assert from 'node:assert/strict';
import {
  type MentoringPair,
  calculateCompletionRate,
  isEligibleForReward,
  filterActivePairs,
} from './mentorMenteeEngine';

function run() {
  const pair1: MentoringPair = {
    id: '1',
    mentorName: '선배 강호동',
    menteeName: '후배 이승기',
    topic: '자료구조 및 백준 골드 달성',
    targetSessions: 10,
    completedSessions: 10,
    menteeRating: 4.8,
    status: 'completed',
  };

  const pair2: MentoringPair = {
    id: '2',
    mentorName: '선배 유재석',
    menteeName: '후배 하하',
    topic: '체르니 40번 테크닉 교정',
    targetSessions: 8,
    completedSessions: 4,
    menteeRating: 4.0,
    status: 'active',
  };

  const pair3: MentoringPair = {
    id: '3',
    mentorName: '선배 신동엽',
    menteeName: '후배 전현무',
    topic: '스피치 트레이닝',
    targetSessions: 6,
    completedSessions: 6,
    menteeRating: 3.5,
    status: 'completed',
  };

  // 1. calculateCompletionRate
  assert.equal(calculateCompletionRate(pair1), 100);
  assert.equal(calculateCompletionRate(pair2), 50);

  // 2. isEligibleForReward (기준: 세션 8회 이상, 평점 4.5 이상)
  assert.equal(isEligibleForReward(pair1, 8, 4.5), true);
  assert.equal(isEligibleForReward(pair2, 8, 4.5), false); // 세션 부족
  assert.equal(isEligibleForReward(pair3, 6, 4.0), false); // 평점 미달 (3.5 < 4.0)

  // 3. filterActivePairs
  const active = filterActivePairs([pair1, pair2, pair3]);
  assert.equal(active.length, 1);
  assert.equal(active[0].id, '2');

  console.log('mentorMenteeEngine tests passed!');
}

run();
