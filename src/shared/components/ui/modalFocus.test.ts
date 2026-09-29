/**
 * Modal focus trap helpers.
 * 실행: npm run test:modal-focus
 */
import assert from 'node:assert/strict';
import {
  focusAdjacentMenuItem,
  getFocusableElements,
  getMenuItems,
  handleListboxKeydown,
  handleMenuKeydown,
  trapTabKey,
} from './modalFocus';

function stubRoot(ids: string[]) {
  const nodes = ids.map((id) => ({
    id,
    tabIndex: 0,
    hasAttribute: () => false,
    offsetParent: {},
    focus() {
      focused = id;
    },
  }));
  return {
    querySelectorAll: () => nodes,
    focus() {
      focused = 'root';
    },
  } as unknown as HTMLElement;
}

let focused = '';

function run() {
  focused = '';
  const empty = stubRoot([]);
  assert.deepEqual(getFocusableElements(empty), []);

  const root = stubRoot(['first', 'mid', 'last']);
  const items = getFocusableElements(root);
  assert.equal(items.length, 3);
  assert.equal(items[0].id, 'first');

  let prevented = false;
  trapTabKey(
    { key: 'Enter', preventDefault() { prevented = true; } } as KeyboardEvent,
    root
  );
  assert.equal(prevented, false);

  trapTabKey(
    { key: 'Tab', preventDefault() { prevented = true; } } as KeyboardEvent,
    empty
  );
  assert.equal(prevented, true);
  assert.equal(focused, 'root');

  const menuNodes = ['m1', 'm2', 'm3'].map((id) => ({
    id,
    disabled: false,
    hasAttribute: () => false,
    focus() {
      focused = id;
    },
  }));
  const menuRoot = {
    querySelectorAll: () => menuNodes,
  } as unknown as HTMLElement;

  assert.equal(getMenuItems(menuRoot).length, 3);
  let active: (typeof menuNodes)[number] | null = null;
  (globalThis as { document?: { activeElement: unknown } }).document = {
    get activeElement() {
      return active;
    },
  };
  focused = '';
  active = null;
  focusAdjacentMenuItem(menuRoot, 1);
  assert.equal(focused, 'm1');

  active = menuNodes[0];
  focusAdjacentMenuItem(menuRoot, 1);
  assert.equal(focused, 'm2');
  active = menuNodes[1];
  focusAdjacentMenuItem(menuRoot, -1);
  assert.equal(focused, 'm1');

  let closed = false;
  handleMenuKeydown(
    { key: 'Escape', preventDefault() {} } as KeyboardEvent,
    menuRoot,
    () => {
      closed = true;
    }
  );
  assert.equal(closed, true);

  handleMenuKeydown(
    { key: 'End', preventDefault() {} } as KeyboardEvent,
    menuRoot,
    () => {}
  );
  assert.equal(focused, 'm3');
  handleMenuKeydown(
    { key: 'Home', preventDefault() {} } as KeyboardEvent,
    menuRoot,
    () => {}
  );
  assert.equal(focused, 'm1');

  const optionNodes = ['o1', 'o2', 'o3'].map((id) => ({
    id,
    disabled: false,
    hasAttribute: () => false,
    focus() {
      focused = id;
    },
  }));
  const listRoot = {
    querySelectorAll: () => optionNodes,
  } as unknown as HTMLElement;
  let restore: boolean | null = null;
  const closeList = (restoreTrigger: boolean) => {
    restore = restoreTrigger;
  };

  focused = '';
  active = optionNodes[0];
  handleListboxKeydown(
    { key: 'ArrowDown', preventDefault() {} } as KeyboardEvent,
    listRoot,
    closeList
  );
  assert.equal(focused, 'o2');
  active = optionNodes[1];
  handleListboxKeydown(
    { key: 'End', preventDefault() {} } as KeyboardEvent,
    listRoot,
    closeList
  );
  assert.equal(focused, 'o3');
  handleListboxKeydown(
    { key: 'Home', preventDefault() {} } as KeyboardEvent,
    listRoot,
    closeList
  );
  assert.equal(focused, 'o1');
  restore = null;
  handleListboxKeydown(
    { key: 'Escape', preventDefault() {} } as KeyboardEvent,
    listRoot,
    closeList
  );
  assert.equal(restore, true);
  restore = null;
  handleListboxKeydown(
    { key: 'Tab', preventDefault() {} } as KeyboardEvent,
    listRoot,
    closeList
  );
  assert.equal(restore, false);

  console.log('modalFocus.test.ts: ok');
}

run();
