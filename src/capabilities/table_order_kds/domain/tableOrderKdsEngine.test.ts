import assert from 'node:assert/strict';
import {
  createTableOrderTicket,
  advanceTicketStatus,
  calculateElapsedMinutes,
  calculateKitchenMetrics,
  type TableOrderTicket,
} from './tableOrderKdsEngine';

function run() {
  const baseTime = '2026-10-15T12:00:00Z';

  // 1. createTableOrderTicket
  const ticket1 = createTableOrderTicket('ord-1', {
    tableNumber: '테이블-3',
    items: [
      { id: 'm-1', name: '아메리카노 (Ice)', quantity: 2, unitPrice: 4500, options: ['연하게'] },
      { id: 'm-2', name: '크로플 세트', quantity: 1, unitPrice: 8500 },
    ],
    customerNote: '시럽은 따로 주세요',
    submittedAt: baseTime,
  });

  assert.equal(ticket1.id, 'ord-1');
  assert.equal(ticket1.tableNumber, '테이블-3');
  assert.equal(ticket1.totalQuantity, 3);
  assert.equal(ticket1.totalAmount, 17500); // 4500*2 + 8500 = 17500
  assert.equal(ticket1.status, 'SUBMITTED');
  assert.equal(ticket1.customerNote, '시럽은 따로 주세요');

  // 빈 주문 검증 예외
  assert.throws(() => {
    createTableOrderTicket('ord-bad', {
      tableNumber: '1',
      items: [],
    });
  }, /주문 항목이 최소 1개 이상/);

  // 2. advanceTicketStatus 상태머신 전이
  // SUBMITTED -> RECEIVED
  const received = advanceTicketStatus(ticket1, 'RECEIVED', '2026-10-15T12:01:00Z');
  assert.equal(received.status, 'RECEIVED');
  assert.equal(received.receivedAt, '2026-10-15T12:01:00Z');

  // RECEIVED -> COOKING
  const cooking = advanceTicketStatus(received, 'COOKING', '2026-10-15T12:02:00Z');
  assert.equal(cooking.status, 'COOKING');
  assert.equal(cooking.cookingStartedAt, '2026-10-15T12:02:00Z');

  // COOKING -> READY
  const ready = advanceTicketStatus(cooking, 'READY', '2026-10-15T12:10:00Z');
  assert.equal(ready.status, 'READY');
  assert.equal(ready.readyAt, '2026-10-15T12:10:00Z');

  // READY -> SERVED
  const served = advanceTicketStatus(ready, 'SERVED', '2026-10-15T12:12:00Z');
  assert.equal(served.status, 'SERVED');
  assert.equal(served.servedAt, '2026-10-15T12:12:00Z');

  // 잘못된 전이: SERVED에서 COOKING 불가
  assert.throws(() => {
    advanceTicketStatus(served, 'COOKING');
  }, /유효하지 않은 상태 전이/);

  // 3. calculateElapsedMinutes
  const elapsed = calculateElapsedMinutes('2026-10-15T12:00:00Z', '2026-10-15T12:18:00Z');
  assert.equal(elapsed, 18);

  // 4. calculateKitchenMetrics
  const dummyTickets: TableOrderTicket[] = [
    {
      ...ticket1,
      id: 't-1',
      status: 'COOKING',
      submittedAt: '2026-10-15T12:00:00Z', // 20분 경과 -> 지연
    },
    {
      ...ticket1,
      id: 't-2',
      status: 'SUBMITTED',
      submittedAt: '2026-10-15T12:15:00Z', // 5분 경과
    },
    {
      ...ticket1,
      id: 't-3',
      status: 'READY',
      submittedAt: '2026-10-15T12:10:00Z', // 10분 경과
    },
    {
      ...ticket1,
      id: 't-4',
      status: 'SERVED', // 완료된 티켓 (집계 제외)
      submittedAt: '2026-10-15T11:30:00Z',
    },
  ];

  const metrics = calculateKitchenMetrics(dummyTickets, '2026-10-15T12:20:00Z', 15);
  assert.equal(metrics.totalActiveTickets, 3);
  assert.equal(metrics.waitingCount, 1); // t-2
  assert.equal(metrics.cookingCount, 1); // t-1
  assert.equal(metrics.readyCount, 1); // t-3
  assert.equal(metrics.overdueTicketsCount, 1); // t-1 (20분 >= 15분)
  assert.equal(metrics.averageCookingMinutes, 11.7); // (20 + 5 + 10) / 3 = 11.666... -> 11.7

  console.log('✅ tableOrderKdsEngine tests all passed!');
}

run();
