export type SubTab = 'inventory' | 'sales' | 'payments' | 'history';

export type TextbookSortOption = 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'title';

export type SalesStatusFilter = 'all' | 'unpaid' | 'partial' | 'paid';

export type HistoryFilterType = 'all' | 'inbound' | 'sale' | 'adjust' | 'return';

export interface TextbookStats {
  monthlySaleAmount: number;
  monthlyPaidAmount: number;
  totalUnpaidAmount: number;
  unpaidStudentsCount: number;
  monthlyBooksSold: number;
  lowStockBooksCount: number;
}
