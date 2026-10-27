import type {
  AttendanceRecord,
  AcademyEvent,
  Expense,
  LessonRecord,
  PerformanceVideo,
  PracticeRecord,
  Song,
  Student,
  Textbook,
  TextbookInventoryTransaction,
  TextbookPayment,
  TextbookSale,
} from '../../../../types';
import type {
  Json,
  PaymentMethod as DbPaymentMethod,
  PianoAttendanceStatus,
  PianoInventoryTransactionType,
  PianoTextbookPaymentStatus,
} from '../../../../lib/supabase/database.types';


// ─── Inventory Transactions ─────────────────────────────────────

const INV_TYPE_TO_DB: Record<TextbookInventoryTransaction['transactionType'], PianoInventoryTransactionType> = {
  inbound: 'inbound',
  sale: 'sale',
  return: 'return',
  adjust: 'adjust',
};

const DB_TO_INV_TYPE: Record<PianoInventoryTransactionType, TextbookInventoryTransaction['transactionType']> = {
  inbound: 'inbound',
  sale: 'sale',
  return: 'return',
  adjust: 'adjust',
};

export function inventoryToPianoRow(tx: TextbookInventoryTransaction, organizationId: string) {
  return {
    id: tx.id,
    organization_id: organizationId,
    textbook_id: tx.textbookId,
    transaction_type: INV_TYPE_TO_DB[tx.transactionType],
    quantity: tx.quantity,
    previous_stock: tx.previousStock,
    current_stock: tx.currentStock,
    reference_id: tx.referenceId || null,
    transaction_date: tx.transactionDate,
    memo: tx.memo || null,
    metadata: { textbookTitle: tx.textbookTitle } as Json,
  };
}

export function pianoRowToInventory(row: {
  id: string;
  textbook_id: string;
  transaction_type: PianoInventoryTransactionType;
  quantity: number;
  previous_stock: number;
  current_stock: number;
  reference_id: string | null;
  transaction_date: string;
  memo: string | null;
  metadata: Json;
  created_at: string;
}): TextbookInventoryTransaction {
  const meta = (row.metadata || {}) as { textbookTitle?: string };
  return {
    id: row.id,
    textbookId: row.textbook_id,
    textbookTitle: meta.textbookTitle || '',
    transactionType: DB_TO_INV_TYPE[row.transaction_type],
    quantity: row.quantity,
    previousStock: row.previous_stock,
    currentStock: row.current_stock,
    referenceId: row.reference_id || undefined,
    transactionDate: row.transaction_date,
    memo: row.memo || undefined,
    createdAt: row.created_at,
  };
}

