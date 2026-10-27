/**
 * 원내 시보 및 안내방송 타임테이블 스케줄러 도메인 엔진 (Pure Functions)
 */

export type BroadcastType = 'CHIME_BELL' | 'CLOSING_ANNOUNCEMENT' | 'SAFETY_GUIDE' | 'BACKGROUND_MUSIC';

export interface BroadcastScheduleRecord {
  id: string;
  tenant_id: string;
  title: string;
  broadcast_type: BroadcastType;
  target_time: string; // "HH:mm" (예: "21:30")
  days_of_week: number[]; // 0(일) ~ 6(토)
  audio_url?: string;
  tts_text?: string;
  volume_percent: number;
  is_active: boolean;
  last_played_at?: string;
}

export function shouldTriggerBroadcast(
  schedule: BroadcastScheduleRecord,
  currentTime: Date
): boolean {
  if (!schedule.is_active) return false;

  const currentDay = currentTime.getDay();
  if (!schedule.days_of_week.includes(currentDay)) {
    return false;
  }

  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const currentHHmm = `${hours}:${minutes}`;

  if (currentHHmm !== schedule.target_time) {
    return false;
  }

  // 동일한 날에 이미 재생되었는지 체크
  if (schedule.last_played_at) {
    const lastDate = new Date(schedule.last_played_at);
    if (
      lastDate.getFullYear() === currentTime.getFullYear() &&
      lastDate.getMonth() === currentTime.getMonth() &&
      lastDate.getDate() === currentTime.getDate() &&
      lastDate.getHours() === currentTime.getHours() &&
      lastDate.getMinutes() === currentTime.getMinutes()
    ) {
      return false;
    }
  }

  return true;
}

export function validateScheduleInput(
  title: string,
  targetTime: string,
  daysOfWeek: number[]
): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: '방송 타이틀을 입력해 주세요.' };
  }
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(targetTime)) {
    return { isValid: false, error: '시간 형식을 HH:mm 형태로 입력해 주세요 (예: 14:00).' };
  }
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return { isValid: false, error: '재생 요일을 최소 하루 이상 선택해 주세요.' };
  }
  return { isValid: true };
}
