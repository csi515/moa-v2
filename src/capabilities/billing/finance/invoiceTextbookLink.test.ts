/**
 * local/remote invoice ID 불일치 시 textbook 연결.
 * 실행: npm run test:invoice-textbook-link
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyInvoiceTextbookRelink,
  orphanTextbookInvoiceRefs,
  planInvoiceTextbookRelink,
} from './invoiceTextbookLink';

function run() {
  // Case 1: local 없음 + remote 없음 → 새 invoice ID가 최종. 재매핑 없음
  {
    const plan = planInvoiceTextbookRelink({
      localInvoiceId: 'inv-new',
      remoteInvoiceId: 'inv-new',
      localLinkedSaleIds: ['sale-1'],
      remoteLinkedSaleIds: ['sale-1'],
      sales: [{ id: 'sale-1', billingInvoiceId: 'inv-new' }],
    });
    assert.deepEqual(plan.saleIdsToRelink, []);
    assert.equal(plan.invoiceLinksChanged, false);
    const next = applyInvoiceTextbookRelink(
      [{ id: 'sale-1', billingInvoiceId: 'inv-new' }],
      plan.saleIdsToRelink,
      'inv-new'
    );
    assert.equal(next[0].billingInvoiceId, 'inv-new');
  }

  // Case 2: local temp + remote existing → textbook은 remote ID를 가리킴
  {
    const sales = [{ id: 'sale-1', billingInvoiceId: 'inv-local' }];
    const plan = planInvoiceTextbookRelink({
      localInvoiceId: 'inv-local',
      remoteInvoiceId: 'inv-remote',
      localLinkedSaleIds: ['sale-1'],
      remoteLinkedSaleIds: undefined,
      sales,
    });
    assert.deepEqual(plan.saleIdsToRelink, ['sale-1']);
    assert.equal(plan.invoiceLinksChanged, true);
    assert.deepEqual(plan.nextLinkedSaleIds, ['sale-1']);
    const next = applyInvoiceTextbookRelink(sales, plan.saleIdsToRelink, 'inv-remote');
    assert.equal(next[0].billingInvoiceId, 'inv-remote');
    assert.equal(orphanTextbookInvoiceRefs(next, 'inv-local').length, 0);
  }

  // Case 3: 동시 실행 — 한쪽 local만 최종 invoice가 되고 연결은 유효 ID
  {
    const winnerId = 'inv-a';
    const loserId = 'inv-b';
    const sales = [
      { id: 'sale-1', billingInvoiceId: loserId },
      { id: 'sale-2', billingInvoiceId: winnerId },
    ];
    const loserPlan = planInvoiceTextbookRelink({
      localInvoiceId: loserId,
      remoteInvoiceId: winnerId,
      localLinkedSaleIds: ['sale-1'],
      remoteLinkedSaleIds: ['sale-2'],
      sales,
    });
    assert.deepEqual(loserPlan.saleIdsToRelink, ['sale-1']);
    const next = applyInvoiceTextbookRelink(sales, loserPlan.saleIdsToRelink, winnerId);
    assert.equal(next.find((s) => s.id === 'sale-1')?.billingInvoiceId, winnerId);
    assert.equal(next.find((s) => s.id === 'sale-2')?.billingInvoiceId, winnerId);
    assert.equal(orphanTextbookInvoiceRefs(next, loserId).length, 0);
    assert.deepEqual(loserPlan.nextLinkedSaleIds, ['sale-2', 'sale-1']);

    const winnerPlan = planInvoiceTextbookRelink({
      localInvoiceId: winnerId,
      remoteInvoiceId: winnerId,
      localLinkedSaleIds: ['sale-2'],
      remoteLinkedSaleIds: ['sale-2'],
      sales: next,
    });
    assert.deepEqual(winnerPlan.saleIdsToRelink, []);
  }

  // Case 4: 기존 invoice에 이미 linked textbook → 깨지지 않음, 불필요 수정 없음
  {
    const sales = [
      { id: 'sale-old', billingInvoiceId: 'inv-remote' },
      { id: 'sale-other', billingInvoiceId: 'inv-other' },
    ];
    const plan = planInvoiceTextbookRelink({
      localInvoiceId: 'inv-local',
      remoteInvoiceId: 'inv-remote',
      localLinkedSaleIds: ['sale-old'],
      remoteLinkedSaleIds: ['sale-old'],
      sales,
    });
    assert.deepEqual(plan.saleIdsToRelink, []);
    assert.equal(plan.invoiceLinksChanged, false);
    const next = applyInvoiceTextbookRelink(sales, plan.saleIdsToRelink, 'inv-remote');
    assert.equal(next[0].billingInvoiceId, 'inv-remote');
    assert.equal(next[1].billingInvoiceId, 'inv-other');
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const service = readFileSync(join(here, 'services/tuitionService.ts'), 'utf8');
  assert.match(service, /planInvoiceTextbookRelink/);
  assert.match(service, /linkTextbookSalesToInvoice/);
  assert.match(service, /deleteInvoice\(local\.id\)/);
  const relinkIndex = service.indexOf('planInvoiceTextbookRelink');
  const deleteIndex = service.indexOf('deleteInvoice(local.id)');
  assert.ok(relinkIndex > 0 && deleteIndex > relinkIndex);

  console.log('invoiceTextbookLink.test.ts: ok');
}

run();
