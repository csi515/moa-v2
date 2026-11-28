import assert from 'node:assert/strict';
import {
  VIEWPORT_BREAKPOINTS,
  classifyViewportWidth,
} from './density';

async function runTests() {
  assert.equal(VIEWPORT_BREAKPOINTS.mdMin, 768);
  assert.equal(VIEWPORT_BREAKPOINTS.lgMin, 1024);

  assert.equal(classifyViewportWidth(375), 'phone');
  assert.equal(classifyViewportWidth(767), 'phone');
  assert.equal(classifyViewportWidth(768), 'tablet');
  assert.equal(classifyViewportWidth(1023), 'tablet');
  assert.equal(classifyViewportWidth(1024), 'desktop');
  assert.equal(classifyViewportWidth(1440), 'desktop');

  console.log('viewportBreakpoints.test.ts: ok');
}

void runTests();
