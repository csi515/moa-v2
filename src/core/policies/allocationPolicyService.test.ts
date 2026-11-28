import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultAllocationPolicy,
  evaluateNegativeStock,
  evaluateOverbook,
} from './allocationPolicyService';
import {
  applyRounding,
  applyTaxToAmount,
  defaultRoundingPolicy,
  defaultTaxPolicy,
} from './taxPolicyService';
import {
  canApplyBookingCommand,
  defaultBookingLifecycleCatalog,
  isBookingSideEffectEnabled,
} from './bookingLifecycleService';

describe('Phase 3 policies', () => {
  it('evaluateOverbook respects forbid/warn/allow', () => {
    const base = defaultAllocationPolicy('org');
    assert.equal(evaluateOverbook({ ...base, overbookMode: 'forbid' }, 5, 5).allowed, false);
    assert.equal(
      evaluateOverbook({ ...base, overbookMode: 'forbid', allowWaitlist: true }, 5, 5)
        .suggestWaitlist,
      true
    );
    assert.equal(evaluateOverbook({ ...base, overbookMode: 'allow' }, 5, 5).allowed, true);
    assert.equal(evaluateOverbook({ ...base, overbookMode: 'warn' }, 5, 5).overbooked, true);
  });

  it('evaluateNegativeStock respects modes', () => {
    const base = defaultAllocationPolicy('org');
    assert.equal(evaluateNegativeStock({ ...base, negativeStockMode: 'forbid' }, -1).allowed, false);
    assert.equal(evaluateNegativeStock({ ...base, negativeStockMode: 'warn' }, -1).warning, true);
    assert.equal(evaluateNegativeStock({ ...base, negativeStockMode: 'allow' }, -1).allowed, true);
  });

  it('applyTaxToAmount inclusive/exclusive + rounding', () => {
    const tax = { ...defaultTaxPolicy('org'), mode: 'exclusive' as const, rate: 0.1 };
    const exclusive = applyTaxToAmount(10000, tax);
    assert.equal(exclusive.net, 10000);
    assert.equal(exclusive.tax, 1000);
    assert.equal(exclusive.gross, 11000);

    const inclusive = applyTaxToAmount(11000, {
      ...tax,
      mode: 'inclusive',
    });
    assert.equal(inclusive.gross, 11000);
    assert.ok(Math.abs(inclusive.net - 10000) < 1);

    const rounded = applyRounding(1005, { ...defaultRoundingPolicy('org'), mode: 'floor', unit: 10 });
    assert.equal(rounded, 1000);
  });

  it('booking lifecycle catalog mirrors reservation machine defaults', () => {
    const catalog = defaultBookingLifecycleCatalog();
    assert.equal(canApplyBookingCommand(catalog, 'requested', 'confirm'), true);
    assert.equal(canApplyBookingCommand(catalog, 'cancelled', 'confirm'), false);
    assert.equal(isBookingSideEffectEnabled(catalog, 'confirm', 'notify'), true);
    assert.equal(isBookingSideEffectEnabled(catalog, 'cancel', 'notify'), false);
  });
});
