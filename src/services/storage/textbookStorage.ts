import type { StorageApi } from './helpers';
import { createTextbookCatalogStorage } from './textbookCatalogStorage';
import { createTextbookSalesStorage } from './textbookSalesStorage';
import { createTextbookSaleService } from '@/industries/piano/services/textbookSaleService';

/** 교재·판매·재고·통합 청구 도메인 (catalog + sales persistence + sale orchestration) */
export function createTextbookStorage(api: StorageApi) {
  return Object.assign(
    createTextbookCatalogStorage(api),
    createTextbookSalesStorage(api),
    createTextbookSaleService(api)
  );
}
