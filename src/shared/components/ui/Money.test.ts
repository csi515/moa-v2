import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Money } from './Money';

test('Money component renders default KRW currency with tabular-nums', () => {
  const html = renderToString(React.createElement(Money, { amount: 50000 }));
  assert.ok(html.includes('₩50,000'));
  assert.ok(html.includes('tabular-nums'));
  assert.ok(html.includes('font-mono'));
});

test('Money component renders won format when requested', () => {
  const html = renderToString(React.createElement(Money, { amount: 12000, format: 'won' }));
  assert.ok(html.includes('12,000원'));
});

test('Money component renders plain format when requested', () => {
  const html = renderToString(React.createElement(Money, { amount: 3500, format: 'plain' }));
  assert.ok(html.includes('3,500'));
  assert.ok(!html.includes('₩'));
  assert.ok(!html.includes('원'));
});

test('Money component handles negative properly', () => {
  const negHtml = renderToString(React.createElement(Money, { amount: -15000 }));
  assert.ok(negHtml.includes('-₩15,000'));
});

test('Money component handles positive signs properly', () => {
  const posHtml = renderToString(React.createElement(Money, { amount: 20000, showPositiveSign: true }));
  assert.ok(posHtml.includes('+₩20,000'));
});

test('Money component renders fallback for null or empty values', () => {
  const nullHtml = renderToString(React.createElement(Money, { amount: null, fallbackText: '무료' }));
  assert.ok(nullHtml.includes('무료'));

  const defaultNullHtml = renderToString(React.createElement(Money, { amount: undefined }));
  assert.ok(defaultNullHtml.includes('-'));
});
