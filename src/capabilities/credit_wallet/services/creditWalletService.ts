import {
  type WalletState,
  type WalletTransaction,
  type BonusTier,
  calculateBonusCredit,
} from '../domain/creditWalletEngine';
import { creditWalletStorage } from '../infrastructure/creditWalletStorage';

export interface ChargeCreditInput {
  organizationId: string;
  customerId: string;
  amount: number;
  bonusAmount?: number;
  description?: string;
  bonusTiers?: BonusTier[];
  idempotencyKey?: string;
}

export interface UseCreditInput {
  organizationId: string;
  customerId: string;
  amount: number;
  description?: string;
  idempotencyKey?: string;
}

export interface RefundCreditInput {
  organizationId: string;
  customerId: string;
  amount: number;
  description?: string;
  reason?: string;
  idempotencyKey?: string;
}

export const creditWalletService = {
  /**
   * 고객의 선불 지갑(예치금 잔액) 조회
   */
  async getWallet(organizationId: string, customerId: string): Promise<WalletState> {
    if (!organizationId || !customerId) {
      return {
        id: `wallet_${customerId || 'unknown'}`,
        customerId: customerId || '',
        cashBalance: 0,
        bonusBalance: 0,
        totalBalance: 0,
        lastUpdatedAt: new Date().toISOString(),
      };
    }
    return creditWalletStorage.getWallet(organizationId, customerId);
  },

  /**
   * 선불 충전금 충전 (보너스 요율 옵션 포함)
   */
  async chargeCredit(input: ChargeCreditInput): Promise<{
    success: boolean;
    newBalance: number;
    chargedAmount: number;
    bonusAmount: number;
    error?: string;
  }> {
    const { organizationId, customerId, amount, description, bonusTiers } = input;
    if (amount <= 0) {
      return {
        success: false,
        newBalance: 0,
        chargedAmount: 0,
        bonusAmount: 0,
        error: '충전 금액은 0원보다 커야 합니다.',
      };
    }

    let calculatedBonus = input.bonusAmount ?? 0;
    if (bonusTiers && bonusTiers.length > 0) {
      const bonusRes = calculateBonusCredit(amount, bonusTiers);
      calculatedBonus = bonusRes.bonusAmount;
    }

    const res = creditWalletStorage.applyTx(organizationId, customerId, {
      type: 'CHARGE',
      amount,
      bonusAmount: calculatedBonus,
      description: description || '선불 예치금 충전',
    });

    if (!res.success) {
      return {
        success: false,
        newBalance: res.newWallet.totalBalance,
        chargedAmount: 0,
        bonusAmount: 0,
        error: res.error,
      };
    }

    return {
      success: true,
      newBalance: res.newWallet.totalBalance,
      chargedAmount: amount,
      bonusAmount: calculatedBonus,
    };
  },

  /**
   * 결제 시 예치금 잔액 차감 (음수 잔액 방어)
   */
  async useCredit(input: UseCreditInput): Promise<{
    success: boolean;
    newBalance: number;
    usedAmount: number;
    error?: string;
  }> {
    const { organizationId, customerId, amount, description } = input;
    if (amount <= 0) {
      return {
        success: false,
        newBalance: 0,
        usedAmount: 0,
        error: '차감 금액은 0원보다 커야 합니다.',
      };
    }

    const current = await this.getWallet(organizationId, customerId);
    if (current.totalBalance < amount) {
      return {
        success: false,
        newBalance: current.totalBalance,
        usedAmount: 0,
        error: `예치금 잔액이 부족합니다. (현재 잔액: ${current.totalBalance.toLocaleString()}원, 필요 금액: ${amount.toLocaleString()}원)`,
      };
    }

    const res = creditWalletStorage.applyTx(organizationId, customerId, {
      type: 'USE',
      amount,
      description: description || '판매 결제 차감',
    });

    if (!res.success) {
      return {
        success: false,
        newBalance: res.newWallet.totalBalance,
        usedAmount: 0,
        error: res.error,
      };
    }

    return {
      success: true,
      newBalance: res.newWallet.totalBalance,
      usedAmount: amount,
    };
  },

  /**
   * 환불 처리
   */
  async refundCredit(input: RefundCreditInput): Promise<{
    success: boolean;
    newBalance: number;
    error?: string;
  }> {
    const { organizationId, customerId, amount, description, reason } = input;
    const res = creditWalletStorage.applyTx(organizationId, customerId, {
      type: 'REFUND',
      amount,
      description: description || reason || '예치금 환불 처리',
    });

    return {
      success: res.success,
      newBalance: res.newWallet.totalBalance,
      error: res.error,
    };
  },

  /**
   * 고객 거래 내역 목록 조회
   */
  async listTransactions(organizationId: string, customerId: string): Promise<WalletTransaction[]> {
    return creditWalletStorage.listTransactions(organizationId, customerId);
  },
};
