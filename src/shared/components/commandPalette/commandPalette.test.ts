import assert from 'node:assert/strict';
import { COMMAND_CATALOG, filterCommands, isPaletteShortcut, moveCommandIndex } from './commandPalette';

assert.equal(isPaletteShortcut({ metaKey: true, ctrlKey: false, key: 'k' }), true);
assert.equal(isPaletteShortcut({ metaKey: false, ctrlKey: true, key: 'K' }), true);
assert.equal(isPaletteShortcut({ metaKey: false, ctrlKey: false, key: 'k' }), false);

const chosung = filterCommands('ㄱㅁ', COMMAND_CATALOG);
assert.deepEqual(chosung.map((item) => item.id), ['member-kim']);

const name = filterCommands('시간표', COMMAND_CATALOG);
assert.equal(name[0]?.id, 'menu-schedule');

assert.equal(moveCommandIndex(0, 3, -1), 2);
assert.equal(moveCommandIndex(2, 3, 1), 0);

console.log('commandPalette.test.ts: ok');
