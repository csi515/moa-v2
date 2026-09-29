import type { ShuttleRideRequest } from '@/core/transport/types';
import { STORAGE_KEYS } from '../adapters';
import { deleteById, generateEntityId, getItem, setItem } from './helpers';

/** 차량 운행 신청 CRUD (로컬) */
export function createShuttleRideStorage() {
  return {
    getShuttleRideRequests(): ShuttleRideRequest[] {
      return getItem<ShuttleRideRequest[]>(STORAGE_KEYS.SHUTTLE_RIDE_REQUESTS, []);
    },

    saveShuttleRideRequest(
      input: Omit<ShuttleRideRequest, 'id' | 'createdAt' | 'updatedAt'> & {
        id?: string;
        createdAt?: string;
        updatedAt?: string;
      }
    ): ShuttleRideRequest {
      const list = this.getShuttleRideRequests();
      const now = new Date().toISOString();
      let saved: ShuttleRideRequest;

      if (input.id) {
        const idx = list.findIndex((item) => item.id === input.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...input, id: input.id, updatedAt: now };
          list[idx] = saved;
        } else {
          saved = {
            ...(input as ShuttleRideRequest),
            id: input.id,
            createdAt: input.createdAt || now,
            updatedAt: now,
          };
          list.unshift(saved);
        }
      } else {
        saved = {
          ...(input as ShuttleRideRequest),
          id: generateEntityId('ride'),
          createdAt: now,
          updatedAt: now,
        };
        list.unshift(saved);
      }

      setItem(STORAGE_KEYS.SHUTTLE_RIDE_REQUESTS, list);
      return saved;
    },

    deleteShuttleRideRequest(id: string): boolean {
      const list = this.getShuttleRideRequests();
      if (!deleteById(list, id)) return false;
      setItem(STORAGE_KEYS.SHUTTLE_RIDE_REQUESTS, list);
      return true;
    },
  };
}
