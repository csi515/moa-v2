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


// ─── Textbooks ────────────────────────────────────────────────────

export function textbookToPianoRow(tb: Textbook, organizationId: string) {
  return {
    id: tb.id,
    organization_id: organizationId,
    title: tb.title,
    publisher: tb.publisher,
    author: tb.author || null,
    isbn: tb.isbn || null,
    level: tb.level,
    sale_price: tb.salePrice ?? tb.price,
    cost_price: tb.costPrice,
    stock: tb.stock ?? tb.currentStock ?? 0,
    min_stock: tb.minStock,
    is_for_sale: tb.isForSale,
    memo: tb.memo || null,
    metadata: {
      productId: tb.productId || tb.id,
    } as Json,
  };
}

export function pianoRowToTextbook(row: {
  id: string;
  title: string;
  publisher: string;
  author: string | null;
  isbn: string | null;
  level: string;
  sale_price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  is_for_sale: boolean;
  memo: string | null;
  metadata?: Json | null;
  created_at: string;
  updated_at: string;
}): Textbook {
  const meta = (row.metadata || {}) as { productId?: string };
  return {
    id: row.id,
    title: row.title,
    publisher: row.publisher,
    author: row.author || undefined,
    isbn: row.isbn || undefined,
    level: row.level,
    price: row.sale_price,
    salePrice: row.sale_price,
    costPrice: row.cost_price,
    stock: row.stock,
    currentStock: row.stock,
    minStock: row.min_stock,
    isForSale: row.is_for_sale,
    memo: row.memo || undefined,
    productId: meta.productId || row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

