import confetti from 'canvas-confetti';

/** 완곡 승인·수여 축하 폭죽 */
export function fireSongCompletionConfetti(): void {
  const defaults = { startVelocity: 28, spread: 0.72, ticks: 180, zIndex: 80 };
  confetti({ ...defaults, particleCount: 50, spread: 60, origin: { x: 0.2, y: 0.7 } });
  confetti({ ...defaults, particleCount: 50, spread: 120, origin: { x: 0.8, y: 0.7 } });
  confetti({
    ...defaults,
    particleCount: 80,
    spread: 100,
    origin: { x: 0.5, y: 0.55 },
    colors: ['#4f46e5', '#f59e0b', '#10b981', '#ec4899'],
  });
}

function honorificName(name: string): string {
  const n = name.trim();
  if (!n) return '아이';
  if (/[이가]$/.test(n)) return n;
  return `${n}이`;
}

/** Web Share — 학부모 카톡 등 (수동 수여·승인 공통) */
export async function shareSongCelebration(params: {
  studentName: string;
  bookName: string;
  songTitle: string;
  stampCount: number;
  /** 선생님 수동 수여 톤 */
  teacherGrant?: boolean;
}): Promise<'shared' | 'copied' | 'unsupported'> {
  const who = honorificName(params.studentName);
  const text = params.teacherGrant
    ? `${who}가 오늘 [${params.bookName} ${params.songTitle}] 완곡 스탬프를 받았어요! 🎹\n모두의 아카데미 모아`
    : `${params.studentName} 학생이 「${params.bookName} · ${params.songTitle}」을(를) 완곡했어요! 🎹\n모은 스탬프 ${params.stampCount}개 · 모두의 아카데미 모아`;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: '완곡 축하!', text });
      return 'shared';
    } catch {
      /* cancel / fail → clipboard */
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'unsupported';
  }
}
