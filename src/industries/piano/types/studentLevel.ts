export const PIANO_STUDENT_LEVELS = [
  '바이엘 상',
  '바이엘 하',
  '체르니 100',
  '체르니 30',
  '체르니 40',
  '체르니 50',
  '소나티네/명곡',
  '작품집/쇼팽',
  '입시/콩쿠르',
  '성인 취미',
] as const;

export type PianoStudentLevel = (typeof PIANO_STUDENT_LEVELS)[number];

export const PIANO_STUDENT_LEVEL_LABELS: Record<PianoStudentLevel, string> = {
  '바이엘 상': '바이엘 상',
  '바이엘 하': '바이엘 하',
  '체르니 100': '체르니 100',
  '체르니 30': '체르니 30',
  '체르니 40': '체르니 40',
  '체르니 50': '체르니 50',
  '소나티네/명곡': '소나티네/명곡',
  '작품집/쇼팽': '작품집/쇼팽',
  '입시/콩쿠르': '입시/콩쿠르',
  '성인 취미': '성인 취미',
};

export function isPianoStudentLevel(value: string | null | undefined): value is PianoStudentLevel {
  return !!value && (PIANO_STUDENT_LEVELS as readonly string[]).includes(value);
}
