import type { PickupAddress, ShuttleDirection } from './types';
import type { Student } from '@/types';

export function createPickupAddress(
  partial?: Partial<PickupAddress> & { isDefault?: boolean }
): PickupAddress {
  return {
    id: partial?.id || crypto.randomUUID(),
    label: partial?.label || '집',
    address: partial?.address || '',
    detail: partial?.detail,
    contactName: partial?.contactName,
    contactPhone: partial?.contactPhone,
    directions: partial?.directions,
    shuttleDirection: partial?.shuttleDirection || 'both',
    isDefault: partial?.isDefault ?? false,
  };
}

export function normalizePickupAddresses(addresses: PickupAddress[] | undefined): PickupAddress[] {
  if (!addresses?.length) return [];
  const list = addresses.map((a) => ({ ...a, id: a.id || crypto.randomUUID() }));
  if (!list.some((a) => a.isDefault) && list.length > 0) {
    list[0] = { ...list[0], isDefault: true };
  }
  return list;
}

export function studentUsesShuttleService(student: Student): boolean {
  return Boolean(
    student.usesShuttleService &&
      student.pickupAddresses?.some((a) => (a.address || '').trim().length > 0)
  );
}

export function getDefaultPickupAddress(student: Student): PickupAddress | undefined {
  const list = student.pickupAddresses || [];
  return (
    list.find((a) => a.isDefault) ||
    list.find((a) => (a.address || '').trim()) ||
    list[0]
  );
}

export function formatPickupAddressLine(address: PickupAddress): string {
  const parts = [(address.address || '').trim()];
  if (address.detail?.trim()) parts.push(address.detail.trim());
  return parts.filter(Boolean).join(' ');
}

export function formatShuttleDirection(direction: ShuttleDirection): string {
  if (direction === 'pickup') return '픽업';
  if (direction === 'dropoff') return '하원';
  return '픽업·하원';
}

export function sanitizePickupAddressesForSave(
  addresses: PickupAddress[],
  usesShuttleService: boolean
): PickupAddress[] | undefined {
  if (!usesShuttleService) return undefined;
  const cleaned = normalizePickupAddresses(
    addresses
      .map((a) => ({
        ...a,
        label: (a.label || '').trim() || '주소',
        address: (a.address || '').trim(),
        detail: a.detail?.trim() || undefined,
        contactName: a.contactName?.trim() || undefined,
        contactPhone: a.contactPhone?.trim() || undefined,
        directions: a.directions?.trim() || undefined,
      }))
      .filter((a) => a.address.length > 0)
  );
  return cleaned.length > 0 ? cleaned : undefined;
}
