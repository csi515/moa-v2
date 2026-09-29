const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null
  );
}

export function trapTabKey(event: KeyboardEvent, root: HTMLElement): void {
  if (event.key !== 'Tab') return;
  const items = getFocusableElements(root);
  if (items.length === 0) {
    event.preventDefault();
    root.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export function focusInitialElement(root: HTMLElement): void {
  const items = getFocusableElements(root);
  (items[0] ?? root).focus();
}

export function getMenuItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
    (el) => !el.hasAttribute('disabled') && !(el as HTMLButtonElement).disabled
  );
}

export function focusAdjacentMenuItem(root: HTMLElement, direction: 1 | -1): void {
  const items = getMenuItems(root);
  if (items.length === 0) return;
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (current < 0) {
    (direction === 1 ? items[0] : items[items.length - 1]).focus();
    return;
  }
  items[(current + direction + items.length) % items.length].focus();
}

export function getRoleItems(root: HTMLElement, role: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[role="${role}"]`)).filter(
    (el) => !el.hasAttribute('disabled') && !(el as HTMLButtonElement).disabled
  );
}

export function focusAdjacentRoleItem(
  root: HTMLElement,
  role: string,
  direction: 1 | -1
): void {
  const items = getRoleItems(root, role);
  if (items.length === 0) return;
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (current < 0) {
    (direction === 1 ? items[0] : items[items.length - 1]).focus();
    return;
  }
  items[(current + direction + items.length) % items.length].focus();
}

/** role=listbox. Tab은 기본 흐름 유지. Escape만 trigger 복귀. */
export function handleListboxKeydown(
  event: KeyboardEvent,
  root: HTMLElement,
  onClose: (restoreTrigger: boolean) => void
): void {
  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      onClose(true);
      return;
    case 'Tab':
      onClose(false);
      return;
    case 'ArrowDown':
      event.preventDefault();
      focusAdjacentRoleItem(root, 'option', 1);
      return;
    case 'ArrowUp':
      event.preventDefault();
      focusAdjacentRoleItem(root, 'option', -1);
      return;
    case 'Home': {
      event.preventDefault();
      getRoleItems(root, 'option')[0]?.focus();
      return;
    }
    case 'End': {
      event.preventDefault();
      const items = getRoleItems(root, 'option');
      items[items.length - 1]?.focus();
    }
  }
}

/** role=menu 키보드. Escape는 onClose. */
export function handleMenuKeydown(
  event: KeyboardEvent,
  root: HTMLElement,
  onClose: () => void
): void {
  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      onClose();
      return;
    case 'ArrowDown':
      event.preventDefault();
      focusAdjacentMenuItem(root, 1);
      return;
    case 'ArrowUp':
      event.preventDefault();
      focusAdjacentMenuItem(root, -1);
      return;
    case 'Home': {
      event.preventDefault();
      const items = getMenuItems(root);
      items[0]?.focus();
      return;
    }
    case 'End': {
      event.preventDefault();
      const items = getMenuItems(root);
      items[items.length - 1]?.focus();
    }
  }
}
