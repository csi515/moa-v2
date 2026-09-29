/**
 * 통합 수납 Application Command 의존 방향.
 * 시나리오 계약은 combinedPaymentAtomic.test / combinedPaymentCommand.
 * 실행: npm run test:record-combined-payment
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function run() {
  const here = dirname(fileURLToPath(import.meta.url));
  const command = readFileSync(join(here, 'recordCombinedPayment.ts'), 'utf8');
  assert.match(command, /recordCombinedPaymentAtomic/);
  assert.equal(command.includes('@/modules/'), false);
  assert.equal(command.includes('recordTuitionPaymentAtomic'), false);
  assert.equal(command.includes('recordTextbookPaymentAtomic'), false);

  const modal = readFileSync(
    join(here, '../../../../core/academy/components/tuition/CombinedPaymentModal.tsx'),
    'utf8'
  );
  assert.match(modal, /useCombinedPaymentSubmit/);
  assert.match(modal, /buildCombinedPaymentRequest/);
  assert.equal(modal.includes('TuitionService.recordCombinedPayment'), false);
  assert.equal(modal.includes('recordCombinedPaymentAtomic'), false);

  const service = readFileSync(join(here, '../services/tuitionService.ts'), 'utf8');
  assert.match(service, /application\/recordCombinedPayment/);
  assert.equal(service.includes('recordCombinedPaymentAtomic'), false);

  const saleService = readFileSync(
    join(here, '../../../../industries/piano/services/textbookSaleService.ts'),
    'utf8'
  );
  assert.equal(saleService.includes('recordCombinedPayment'), false);
  assert.equal(saleService.includes('recordCombinedPaymentAtomic'), false);
  assert.equal(saleService.includes('recordTuitionPaymentAtomic'), false);
  assert.equal(saleService.includes('for (const item of tuitionItems)'), false);

  const financeIndex = readFileSync(join(here, '../index.ts'), 'utf8');
  assert.match(financeIndex, /application\/recordCombinedPayment/);

  console.log('recordCombinedPayment.test.ts: ok');
}

run();
