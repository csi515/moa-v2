import type { ComponentType, ReactNode } from 'react';

export interface SlotRegistration<TContext = any> {
  slotName: string;
  id: string;
  Component: ComponentType<{ context: TContext }>;
  order?: number;
  predicate?: (context: TContext) => boolean;
}

class SlotRegistry {
  private slots = new Map<string, Map<string, SlotRegistration>>();

  register<TContext = any>(registration: SlotRegistration<TContext>): () => void {
    const { slotName, id } = registration;
    if (!this.slots.has(slotName)) {
      this.slots.set(slotName, new Map());
    }
    this.slots.get(slotName)!.set(id, registration);

    return () => this.unregister(slotName, id);
  }

  unregister(slotName: string, id: string): boolean {
    const group = this.slots.get(slotName);
    if (!group) return false;
    return group.delete(id);
  }

  getExtensions<TContext = any>(
    slotName: string,
    context?: TContext
  ): SlotRegistration<TContext>[] {
    const group = this.slots.get(slotName);
    if (!group) return [];

    const list = Array.from(group.values()) as SlotRegistration<TContext>[];
    const filtered = context
      ? list.filter((item) => (item.predicate ? item.predicate(context) : true))
      : list;

    return filtered.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  clear(): void {
    this.slots.clear();
  }
}

export const slotRegistry = new SlotRegistry();

export function registerSlotExtension<TContext = any>(
  registration: SlotRegistration<TContext>
): () => void {
  return slotRegistry.register(registration);
}
