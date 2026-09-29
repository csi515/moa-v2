export type CareFocus =
  | { kind: 'journal'; studentId: string }
  | { kind: 'medications' }
  | { kind: 'records'; ops: 'health' | 'meals' };

type CareFocusListener = () => void;

let focus: CareFocus | null = null;
const listeners = new Set<CareFocusListener>();

export function requestCareFocus(next: CareFocus): void {
  focus = next;
  listeners.forEach((listener) => listener());
}

export function peekCareFocus(): CareFocus | null {
  return focus;
}

export function takeCareFocus(kind: CareFocus['kind']): CareFocus | null {
  if (!focus || focus.kind !== kind) return null;
  const current = focus;
  focus = null;
  return current;
}

export function subscribeCareFocus(listener: CareFocusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
