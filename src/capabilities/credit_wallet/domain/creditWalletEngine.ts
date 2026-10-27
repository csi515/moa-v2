/**
 * 선불 충전금 & 마일리지 포인트 원장 엔진 (Pure Function Domain)
 *
 * 대상: 세차장 카드 선불 충전, 애견 호텔 예치금, 키즈카페 시간 충전금
 * 순수 로직:
 *  1. 선불 충전/차감 원자적 원장 계산식
 *  2. 충전 보너스 요율 계산
 *  3. 잔액 음수 방어
 */

export type WalletTxType = 'CHARGE' | 'USE' | 'REFUND' | 'EXPIRE' | 'BONUS';

export interface BonusTier {
  thresholdAmount: number; // 충전 금액 기준
  bonusRate: number; // e.g. 0.1 = 10% 추가 적립
  fixedBonusAmount?: number;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTxType;
  amount: number;
  bonusAmount?: number;
  balanceAfter: number;
  timestamp: string; // ISO String
  description?: string;
}

export interface WalletState {
  id: string;
  customerId: string;
  cashBalance: number;
  bonusBalance: number;
  totalBalance: number;
  lastUpdatedAt: string;
}

export function calculateBonusCredit(
  chargeAmount: number,
  tiers: BonusTier[]
): { bonusAmount: number; totalCredit: number } {
  if (chargeAmount <= 0) {
    return { bonusAmount: 0, totalCredit: 0 };
  }

  // 기준 금액 높은 순으로 정렬하여 가장 높은 해당 티어 적용
  const sortedTiers = [...tiers].sort(
    (a, b) => b.thresholdAmount - a.thresholdAmount
  );

  const matchedTier = sortedTiers.find((t) => chargeAmount >= t.thresholdAmount);

  let bonusAmount = 0;
  if (matchedTier) {
    if (matchedTier.fixedBonusAmount) {
      bonusAmount = matchedTier.fixedBonusAmount;
    } else {
      bonusAmount = Math.floor(chargeAmount * matchedTier.bonusRate);
    }
  }

  return {
    bonusAmount,
    totalCredit: chargeAmount + bonusAmount,
  };
}

export function applyWalletTransaction(
  current: WalletState,
  tx: {
    id: string;
    type: 'CHARGE' | 'USE' | 'REFUND';
    amount: number;
    bonusAmount?: number;
    description?: string;
    timestamp?: string;
  }
): {
  nextWallet: WalletState;
  record: WalletTransaction;
  success: boolean;
  error?: string;
} {
  const ts = tx.timestamp ?? new Date().toISOString();

  if (tx.amount <= 0) {
    return {
      nextWallet: current,
      record: {
        id: tx.id,
        walletId: current.id,
        type: tx.type,
        amount: 0,
        balanceAfter: current.totalBalance,
        timestamp: ts,
      },
      success: false,
      error: '거래 금액은 0보다 커야 합니다.',
    };
  }

  switch (tx.type) {
    case 'CHARGE': {
      const bonus = tx.bonusAmount ?? 0;
      const nextCash = current.cashBalance + tx.amount;
      const nextBonus = current.bonusBalance + bonus;
      const nextTotal = nextCash + nextBonus;

      const nextWallet: WalletState = {
        ...current,
        cashBalance: nextCash,
        bonusBalance: nextBonus,
        totalBalance: nextTotal,
        lastUpdatedAt: ts,
      };

      const record: WalletTransaction = {
        id: tx.id,
        walletId: current.id,
        type: 'CHARGE',
        amount: tx.amount,
        bonusAmount: bonus,
        balanceAfter: nextTotal,
        timestamp: ts,
        description: tx.description ?? '선불금 충전',
      };

      return { nextWallet, record, success: true };
    }

    case 'USE': {
      // 잔액 음수 방어
      if (current.totalBalance < tx.amount) {
        return {
          nextWallet: current,
          record: {
            id: tx.id,
            walletId: current.id,
            type: 'USE',
            amount: tx.amount,
            balanceAfter: current.totalBalance,
            timestamp: ts,
          },
          success: false,
          error: `잔액이 부족합니다 (현재 잔액: ${current.totalBalance}원, 차감 요청: ${tx.amount}원)`,
        };
      }

      // 선불 차감 정책: 유상 충전금 먼저 차감, 부족분은 보너스에서 차감
      let remainingDeduct = tx.amount;
      let nextCash = current.cashBalance;
      let nextBonus = current.bonusBalance;

      if (nextCash >= remainingDeduct) {
        nextCash -= remainingDeduct;
        remainingDeduct = 0;
      } else {
        remainingDeduct -= nextCash;
        nextCash = 0;
        nextBonus -= remainingDeduct;
      }

      const nextTotal = nextCash + nextBonus;
      const nextWallet: WalletState = {
        ...current,
        cashBalance: nextCash,
        bonusBalance: nextBonus,
        totalBalance: nextTotal,
        lastUpdatedAt: ts,
      };

      const record: WalletTransaction = {
        id: tx.id,
        walletId: current.id,
        type: 'USE',
        amount: tx.amount,
        balanceAfter: nextTotal,
        timestamp: ts,
        description: tx.description ?? '선불금 사용',
      };

      return { nextWallet, record, success: true };
    }

    case 'REFUND': {
      const nextCash = current.cashBalance + tx.amount;
      const nextTotal = nextCash + current.bonusBalance;

      const nextWallet: WalletState = {
        ...current,
        cashBalance: nextCash,
        totalBalance: nextTotal,
        lastUpdatedAt: ts,
      };

      const record: WalletTransaction = {
        id: tx.id,
        walletId: current.id,
        type: 'REFUND',
        amount: tx.amount,
        balanceAfter: nextTotal,
        timestamp: ts,
        description: tx.description ?? '선불금 환불',
      };

      return { nextWallet, record, success: true };
    }

    default:
      return {
        nextWallet: current,
        record: {
          id: tx.id,
          walletId: current.id,
          type: tx.type,
          amount: tx.amount,
          balanceAfter: current.totalBalance,
          timestamp: ts,
        },
        success: false,
        error: '지원하지 않는 원장 작업입니다.',
      };
  }
}
