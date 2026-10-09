import assert from 'node:assert/strict';
import {
  calculateBonusCredit,
  applyWalletTransaction,
  type WalletState,
  type BonusTier,
} from './creditWalletEngine';

function run() {
  const tiers: BonusTier[] = [
    { thresholdAmount: 30000, bonusRate: 0.05 }, // 3만원 이상 5%
    { thresholdAmount: 50000, bonusRate: 0.1 },  // 5만원 이상 10%
    { thresholdAmount: 100000, bonusRate: 0.15 }, // 10만원 이상 15%
  ];

  // 1. 충전 보너스 요율 계산
  // 50,000원 충전 -> 10% 적용 = 5,000원 보너스, 총 55,000원 적립
  const bonus50k = calculateBonusCredit(50000, tiers);
  assert.equal(bonus50k.bonusAmount, 5000);
  assert.equal(bonus50k.totalCredit, 55000);

  // 20,000원 충전 -> 티어 미달로 보너스 0원
  const bonus20k = calculateBonusCredit(20000, tiers);
  assert.equal(bonus20k.bonusAmount, 0);
  assert.equal(bonus20k.totalCredit, 20000);

  // 2. 원자적 충전 트랜잭션 적용
  const initialWallet: WalletState = {
    id: 'w-1',
    customerId: 'cust-1',
    cashBalance: 0,
    bonusBalance: 0,
    totalBalance: 0,
    lastUpdatedAt: '2026-06-01T00:00:00Z',
  };

  const charged = applyWalletTransaction(initialWallet, {
    id: 'tx-1',
    type: 'CHARGE',
    amount: 50000,
    bonusAmount: 5000,
  });
  assert.equal(charged.success, true);
  assert.equal(charged.nextWallet.cashBalance, 50000);
  assert.equal(charged.nextWallet.bonusBalance, 5000);
  assert.equal(charged.nextWallet.totalBalance, 55000);
  assert.equal(charged.record.balanceAfter, 55000);

  // 3. 차감 사용 트랜잭션 (유상 충전금 우선 소진)
  // 30,000원 사용 -> 현금 20,000원 잔여, 보너스 5,000원 잔여
  const used1 = applyWalletTransaction(charged.nextWallet, {
    id: 'tx-2',
    type: 'USE',
    amount: 30000,
  });
  assert.equal(used1.success, true);
  assert.equal(used1.nextWallet.cashBalance, 20000);
  assert.equal(used1.nextWallet.bonusBalance, 5000);
  assert.equal(used1.nextWallet.totalBalance, 25000);

  // 4. 추가 차감 사용 (현금 전액 소진 후 보너스 차감)
  // 22,000원 사용 -> 현금 20,000 차감 후 보너스에서 2,000 차감 -> 보너스 3,000 잔여
  const used2 = applyWalletTransaction(used1.nextWallet, {
    id: 'tx-3',
    type: 'USE',
    amount: 22000,
  });
  assert.equal(used2.success, true);
  assert.equal(used2.nextWallet.cashBalance, 0);
  assert.equal(used2.nextWallet.bonusBalance, 3000);
  assert.equal(used2.nextWallet.totalBalance, 3000);

  // 5. 잔액 음수 방어 (현재 잔액 3,000원인데 5,000원 차감 시도 -> 실패)
  const overUse = applyWalletTransaction(used2.nextWallet, {
    id: 'tx-4',
    type: 'USE',
    amount: 5000,
  });
  assert.equal(overUse.success, false);
  assert.match(overUse.error!, /잔액이 부족합니다/);
  assert.equal(overUse.nextWallet.totalBalance, 3000);

  console.log('creditWalletEngine.test.ts: ok');
}

run();
