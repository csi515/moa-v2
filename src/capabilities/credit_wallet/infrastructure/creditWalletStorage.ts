import {
  applyWalletTransaction,
  type WalletState,
  type WalletTransaction,
} from '../domain/creditWalletEngine';

const STORAGE_KEY_WALLETS = 'moa_credit_wallets';
const STORAGE_KEY_TRANSACTIONS = 'moa_credit_wallet_transactions';

interface StoredWalletRow {
  id: string;
  organizationId: string;
  customerId: string;
  cashBalance: number;
  bonusBalance: number;
  totalBalance: number;
  lastUpdatedAt: string;
}

interface StoredTransactionRow extends WalletTransaction {
  organizationId: string;
  customerId: string;
}

// Node.js / SSR 환경 및 비-브라우저 환경 메모리 폴백
let memoryWallets: StoredWalletRow[] = [];
let memoryTransactions: StoredTransactionRow[] = [];

function loadWallets(): StoredWalletRow[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [...memoryWallets];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WALLETS);
    return raw ? JSON.parse(raw) : [...memoryWallets];
  } catch {
    return [...memoryWallets];
  }
}

function saveWallets(wallets: StoredWalletRow[]): void {
  const cloned = [...wallets];
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    memoryWallets = cloned;
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(cloned));
  } catch (err) {
    console.error('[CreditWalletStorage] Failed to save wallets:', err);
  }
}

function loadTransactions(): StoredTransactionRow[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [...memoryTransactions];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return raw ? JSON.parse(raw) : [...memoryTransactions];
  } catch {
    return [...memoryTransactions];
  }
}

function saveTransactions(txs: StoredTransactionRow[]): void {
  const cloned = [...txs];
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    memoryTransactions = cloned;
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(cloned));
  } catch (err) {
    console.error('[CreditWalletStorage] Failed to save transactions:', err);
  }
}

export const creditWalletStorage = {
  getWallet(organizationId: string, customerId: string): WalletState {
    const wallets = loadWallets();
    const found = wallets.find(
      (w) => w.organizationId === organizationId && w.customerId === customerId
    );

    if (found) {
      return {
        id: found.id,
        customerId: found.customerId,
        cashBalance: found.cashBalance,
        bonusBalance: found.bonusBalance,
        totalBalance: found.totalBalance,
        lastUpdatedAt: found.lastUpdatedAt,
      };
    }

    const defaultWallet: WalletState = {
      id: `wallet_${customerId}`,
      customerId,
      cashBalance: 0,
      bonusBalance: 0,
      totalBalance: 0,
      lastUpdatedAt: new Date().toISOString(),
    };
    return defaultWallet;
  },

  applyTx(
    organizationId: string,
    customerId: string,
    tx: {
      type: 'CHARGE' | 'USE' | 'REFUND';
      amount: number;
      bonusAmount?: number;
      description?: string;
    }
  ): { success: boolean; newWallet: WalletState; txRecord?: WalletTransaction; error?: string } {
    const current = this.getWallet(organizationId, customerId);
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const result = applyWalletTransaction(current, {
      id: txId,
      type: tx.type,
      amount: tx.amount,
      bonusAmount: tx.bonusAmount,
      description: tx.description,
      timestamp: new Date().toISOString(),
    });

    if (!result.success) {
      return { success: false, newWallet: current, error: result.error };
    }

    // 영속화 (테넌트 격리)
    const wallets = loadWallets();
    const idx = wallets.findIndex(
      (w) => w.organizationId === organizationId && w.customerId === customerId
    );
    const storedRow: StoredWalletRow = {
      id: result.nextWallet.id,
      organizationId,
      customerId,
      cashBalance: result.nextWallet.cashBalance,
      bonusBalance: result.nextWallet.bonusBalance,
      totalBalance: result.nextWallet.totalBalance,
      lastUpdatedAt: result.nextWallet.lastUpdatedAt,
    };

    if (idx >= 0) {
      wallets[idx] = storedRow;
    } else {
      wallets.push(storedRow);
    }
    saveWallets(wallets);

    const txs = loadTransactions();
    const storedTx: StoredTransactionRow = {
      ...result.record,
      organizationId,
      customerId,
    };
    txs.unshift(storedTx);
    saveTransactions(txs);

    return {
      success: true,
      newWallet: result.nextWallet,
      txRecord: result.record,
    };
  },

  listTransactions(organizationId: string, customerId: string): WalletTransaction[] {
    const txs = loadTransactions();
    return txs.filter(
      (t) => t.organizationId === organizationId && t.customerId === customerId
    );
  },

  clearMemoryForTest(): void {
    memoryWallets = [];
    memoryTransactions = [];
  },
};
