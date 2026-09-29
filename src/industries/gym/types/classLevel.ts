export const GYM_CLASS_LEVELS = [
  '어린이',
  '초급',
  '중급',
  '고급',
  '선수반',
  '성인',
  '시니어',
] as const;

export type GymClassLevel = (typeof GYM_CLASS_LEVELS)[number];

export function isGymClassLevel(value: string | null | undefined): value is GymClassLevel {
  return !!value && (GYM_CLASS_LEVELS as readonly string[]).includes(value);
}
