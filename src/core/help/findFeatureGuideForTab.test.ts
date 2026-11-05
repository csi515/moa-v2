import assert from 'node:assert/strict';
import { findFeatureGuideForTab } from './findFeatureGuideForTab';

function run() {
  assert.equal(findFeatureGuideForTab('piano', 'dashboard'), null);

  const attendance = findFeatureGuideForTab('piano', 'attendance');
  assert.ok(attendance, 'piano attendance guide expected');
  assert.ok(attendance!.item.title.length > 0);

  const settings = findFeatureGuideForTab('piano', 'settings');
  assert.ok(settings, 'piano settings guide expected');

  console.log('findFeatureGuideForTab.test.ts: ok');
}

run();
