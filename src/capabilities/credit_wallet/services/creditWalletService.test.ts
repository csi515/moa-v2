import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creditWalletService } from './creditWalletService';

test('creditWalletService: 기본 잔액 조회, 충전, 차감 및 음수 잔액 방어 검증', async () => {
  const orgId = 'org_test_123';
  const customerId = 'cust_test_456';

  // 1. 초기 지갑 잔액은 0원이어야 함
  const initial = await creditWalletService.getWallet(orgId, customerId);
  assert.equal(initial.totalBalance, 0);

  // 2. 50,000원 충전 (보너스 5,000원 적용)
  const chargeRes = await creditWalletService.chargeCredit({
    organizationId: orgId,
    customerId,
    amount: 50000,
    bonusAmount: 5000,
    description: '선입금 5만원 충전 이벤트',
  });
  assert.equal(chargeRes.success, true);
  assert.equal(chargeRes.newBalance, 55000);
  assert.equal(chargeRes.chargedAmount, 50000);
  assert.equal(chargeRes.bonusAmount, 5000);

  // 3. 지갑 잔액 재조회
  const walletAfterCharge = await creditWalletService.getWallet(orgId, customerId);
  assert.equal(walletAfterCharge.totalBalance, 55000);
  assert.equal(walletAfterCharge.cashBalance, 50000);
  assert.equal(walletAfterCharge.bonusBalance, 5000);

  // 4. 20,000원 사용 차감 (보너스 5,000원 먼저 차감 + 현금 15,000원 차감)
  const useRes = await creditWalletService.useCredit({
    organizationId: orgId,
    customerId,
    amount: 20000,
    description: '상품 결제 차감',
  });
  assert.equal(useRes.success, true);
  assert.equal(useRes.newBalance, 35000);

  // 5. 잔액 초과 차감 시도 -> 실패 및 음수 방어
  const overUseRes = await creditWalletService.useCredit({
    organizationId: orgId,
    customerId,
    amount: 50000,
    description: '잔액 초과 결제 시도',
  });
  assert.equal(overUseRes.success, false);
  assert.match(overUseRes.error ?? '', /잔액이 부족합니다/);

  // 잔액은 여전히 35,000원이어야 함
  const finalWallet = await creditWalletService.getWallet(orgId, customerId);
  assert.equal(finalWallet.totalBalance, 35000);

  // 6. 거래 내역 목록 확인
  const txs = await creditWalletService.listTransactions(orgId, customerId);
  assert.equal(txs.length >= 2, true);
  assert.equal(txs[0].type, 'USE');
  assert.equal(txs[1].type, 'CHARGE');
});
