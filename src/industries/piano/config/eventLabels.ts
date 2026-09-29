import { AcademyEvent } from '@/types';
import { PerformanceVideo } from '@/types';

export const ACADEMY_EVENT_TYPE_LABEL: Record<AcademyEvent['type'], string> = {
  concert: '연주회',
  competition: '콩쿠르',
  special_lesson: '특강',
  tuning: '조율',
  vacation: '방학',
  other: '기타',
};

export const PERFORMANCE_VIDEO_TYPE_LABEL: Record<PerformanceVideo['eventType'], string> = {
  recital: '연주회',
  competition: '콩쿠르',
  lesson: '수업',
  practice: '연습',
  other: '기타',
};

/** 캘린더 이벤트 타입 → 연주 영상 분류 매핑 */
export function academyEventTypeToVideoType(
  type: AcademyEvent['type']
): PerformanceVideo['eventType'] {
  if (type === 'concert') return 'recital';
  if (type === 'competition') return 'competition';
  return 'other';
}
