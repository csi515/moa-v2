import assert from 'node:assert/strict';
import { formatIssuerLabel } from './formatIssuerLabel.ts';

assert.equal(
  formatIssuerLabel({ organizationName: '모아 피아노', representative: '대표' }),
  '모아 피아노 대표'
);

assert.equal(
  formatIssuerLabel({ organizationName: '모아 피아노', representative: null }),
  '모아 피아노 대표'
);

assert.equal(
  formatIssuerLabel({
    organizationName: '모아 피아노',
    representative: '홍길동',
  }),
  '모아 피아노 대표 홍길동'
);

assert.equal(
  formatIssuerLabel({
    organizationName: '모아 피아노',
    representative: '대표 홍길동',
  }),
  '모아 피아노 대표 홍길동'
);

assert.equal(
  formatIssuerLabel({
    organizationName: '모아 피아노',
    representative: '원장',
    title: '원장',
  }),
  '모아 피아노 원장'
);

console.log('formatIssuerLabel.test.ts: ok');
