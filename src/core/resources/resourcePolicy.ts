import { windowsFromResourceHours, isOutsideResourceHours } from '@/core/availability/windows';
import { RESOURCE_KINDS } from './types';
import type { Resource } from './types';

/** 비활성 Resource는 예약할 수 없다. */
export function canReserveResource(resource: Pick<Resource, 'active'>): boolean {
  return resource.active;
}

/** 활성 + 운영시간 안. 확정은 DB 가드가 한다. */
export function isResourceSlotAllowed(
  resource: Pick<Resource, 'id' | 'active' | 'openTime' | 'closeTime'>,
  startsAt: string,
  endsAt: string
): boolean {
  if (!canReserveResource(resource)) return false;
  return !isOutsideResourceHours({
    resourceId: resource.id,
    startsAt,
    endsAt,
    windows: [
      windowsFromResourceHours({
        id: resource.id,
        open_time: resource.openTime,
        close_time: resource.closeTime,
      }),
    ],
  });
}

export function isKnownResourceKind(kind: string): boolean {
  return (RESOURCE_KINDS as readonly string[]).includes(kind);
}
