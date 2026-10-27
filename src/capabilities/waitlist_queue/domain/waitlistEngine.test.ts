import assert from 'node:assert';
import {
  isOfferExpired,
  sortWaitlistQueue,
  getNextWaitlistCandidate,
  BookingWaitlistEntry,
} from './waitlistEngine';

// Test 1: isOfferExpired correctly detects expired and non-expired offers
{
  const offeredAt = '2026-10-19T10:00:00.000Z';
  const timeoutMinutes = 30; // expires at 10:30:00

  // 10:15 -> Not expired
  assert.strictEqual(
    isOfferExpired(offeredAt, timeoutMinutes, '2026-10-19T10:15:00.000Z'),
    false
  );

  // 10:30 -> Not expired (exact border)
  assert.strictEqual(
    isOfferExpired(offeredAt, timeoutMinutes, '2026-10-19T10:30:00.000Z'),
    false
  );

  // 10:30:01 -> Expired
  assert.strictEqual(
    isOfferExpired(offeredAt, timeoutMinutes, '2026-10-19T10:30:01.000Z'),
    true
  );

  // offeredAt is null -> false
  assert.strictEqual(isOfferExpired(null, timeoutMinutes), false);
}

// Test 2: FIFO sorting order by queue_order and created_at
{
  const entries: BookingWaitlistEntry[] = [
    {
      booking_slot_id: 'slot-1',
      customer_id: 'cust-3',
      queue_order: 3,
      status: 'WAITING',
      created_at: '2026-10-19T09:05:00Z',
    },
    {
      booking_slot_id: 'slot-1',
      customer_id: 'cust-1',
      queue_order: 1,
      status: 'WAITING',
      created_at: '2026-10-19T09:00:00Z',
    },
    {
      booking_slot_id: 'slot-1',
      customer_id: 'cust-2',
      queue_order: 2,
      status: 'WAITING',
      created_at: '2026-10-19T09:02:00Z',
    },
  ];

  const sorted = sortWaitlistQueue(entries);
  assert.strictEqual(sorted[0].customer_id, 'cust-1');
  assert.strictEqual(sorted[1].customer_id, 'cust-2');
  assert.strictEqual(sorted[2].customer_id, 'cust-3');

  const nextCandidate = getNextWaitlistCandidate(entries);
  assert.strictEqual(nextCandidate?.customer_id, 'cust-1');
}

// Test 3: getNextWaitlistCandidate skips already offered or converted entries
{
  const entries: BookingWaitlistEntry[] = [
    {
      booking_slot_id: 'slot-1',
      customer_id: 'cust-1',
      queue_order: 1,
      status: 'OFFERED',
    },
    {
      booking_slot_id: 'slot-1',
      customer_id: 'cust-2',
      queue_order: 2,
      status: 'WAITING',
    },
  ];

  const candidate = getNextWaitlistCandidate(entries);
  assert.strictEqual(candidate?.customer_id, 'cust-2');
}

console.log('✅ waitlist_queue waitlistEngine tests passed!');
