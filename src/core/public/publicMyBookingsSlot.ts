import type { ComponentType } from 'react';

let PublicMyBookings: ComponentType | null = null;

/** Composition/parent가 등록. Core는 modules를 import하지 않는다. */
export function registerPublicMyBookingsView(component: ComponentType): void {
  PublicMyBookings = component;
}

export function getPublicMyBookingsView(): ComponentType | null {
  return PublicMyBookings;
}
