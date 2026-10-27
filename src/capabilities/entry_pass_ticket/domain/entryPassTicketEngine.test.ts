import assert from 'node:assert/strict';
import {
  issueEntryPassTicket,
  processTicketScan,
  renderEntryPassSvgTicket,
} from './entryPassTicketEngine.js';

console.log('[test:entry-pass-ticket] starting test suite...');

// 1. 일일 입장권 발권 검증
const ticket = issueEntryPassTicket({
  id: 'tick-uuid-1',
  organizationId: 'org-test',
  sequence: 42,
  customerName: '강하늘',
  customerPhone: '010-9876-5432',
  ticketType: 'allday',
  validDate: '2026-10-17',
  price: 25000,
});

assert.equal(ticket.ticketNumber, 'TICK-20261017-0042');
assert.equal(ticket.status, 'issued');
assert.equal(ticket.customerName, '강하늘');
console.log('✓ 1. 일일 입장권 고유 채번 및 발권 통과');

// 2. 정상 체크인 검표
const scan1 = processTicketScan(ticket, '2026-10-17', 'check_in');
assert.equal(scan1.allowed, true);
assert.equal(scan1.result, 'valid');
assert.equal(scan1.updatedTicket?.status, 'checked_in');
console.log('✓ 2. 현장 QR 정상 체크인 통과');

// 3. 중복 입장 시도 차단 검증
const scanDuplicate = processTicketScan(scan1.updatedTicket!, '2026-10-17', 'check_in');
assert.equal(scanDuplicate.allowed, false);
assert.equal(scanDuplicate.result, 'already_used');
assert.match(scanDuplicate.message, /이미 입장 처리된 티켓입니다/);
console.log('✓ 3. 동일 티켓 중복 입장 시도 차단 통과');

// 4. 정상 체크아웃(퇴장) 검표
const scanCheckout = processTicketScan(scan1.updatedTicket!, '2026-10-17', 'check_out');
assert.equal(scanCheckout.allowed, true);
assert.equal(scanCheckout.result, 'valid');
assert.equal(scanCheckout.updatedTicket?.status, 'checked_out');
console.log('✓ 4. 정상 퇴장 처리 통과');

// 5. 날짜 만료 티켓 차단 검증
const scanExpired = processTicketScan(ticket, '2026-10-18', 'check_in');
assert.equal(scanExpired.allowed, false);
assert.equal(scanExpired.result, 'expired');
console.log('✓ 5. 유효기간 만료 티켓 차단 통과');

// 6. W3C SVG QR 티켓 렌더링 검증
const svg = renderEntryPassSvgTicket(ticket);
assert.match(svg, /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
assert.match(svg, /TICK-20261017-0042/);
assert.match(svg, /강하늘 고객님/);
console.log('✓ 6. W3C SVG 0원 QR 티켓 그래픽 렌더링 통과');

console.log('[test:entry-pass-ticket] ALL TESTS PASSED! (100%)');
