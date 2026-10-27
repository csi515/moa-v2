export const DAYCARE_AGE_CLASSES = [
  '0세반',
  '1세반',
  '2세반',
  '3세반',
  '4세반',
  '5세반',
  '혼합반',
  '방과후',
] as const;

export type DaycareAgeClass = (typeof DAYCARE_AGE_CLASSES)[number];

export const DAYCARE_AGE_CLASS_LABELS: Record<DaycareAgeClass, string> = {
  '0세반': '0세반',
  '1세반': '1세반',
  '2세반': '2세반',
  '3세반': '3세반',
  '4세반': '4세반',
  '5세반': '5세반',
  혼합반: '혼합반',
  방과후: '방과후',
};

export function isDaycareAgeClass(value: string | null | undefined): value is DaycareAgeClass {
  return !!value && (DAYCARE_AGE_CLASSES as readonly string[]).includes(value);
}
