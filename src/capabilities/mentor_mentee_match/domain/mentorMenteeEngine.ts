export interface MentoringPair {
  id: string;
  mentorName: string;
  menteeName: string;
  topic: string;
  targetSessions: number;
  completedSessions: number;
  menteeRating: number; // 1.0 ~ 5.0
  status: 'active' | 'completed' | 'paused';
}

export function calculateCompletionRate(pair: MentoringPair): number {
  if (pair.targetSessions <= 0) return 0;
  const rate = Math.round((pair.completedSessions / pair.targetSessions) * 100);
  return Math.min(100, Math.max(0, rate));
}

export function isEligibleForReward(
  pair: MentoringPair,
  minSessions: number,
  minRating: number
): boolean {
  return pair.completedSessions >= minSessions && pair.menteeRating >= minRating;
}

export function filterActivePairs(pairs: MentoringPair[]): MentoringPair[] {
  return pairs.filter((p) => p.status === 'active');
}
