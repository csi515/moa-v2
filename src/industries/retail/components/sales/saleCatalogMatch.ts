import { normalizeScannedKoreanText } from '@/capabilities/inventory/hooks/useBarcodeScanner';
import type { SaleCatalogItem } from '../../types/sale';

/** 바코드/QR 텍스트와 카탈로그 아이템 매칭 (순수 함수) */
export function matchCatalogItem(
  rawCode: string,
  catalog: SaleCatalogItem[]
): SaleCatalogItem | null {
  const code = normalizeScannedKoreanText(rawCode).trim().toLowerCase();
  if (!code) return null;

  // 1. 카탈로그 key 직접 일치 (예: 'v:uuid', 'p:uuid')
  const byKey = catalog.find((c) => c.key.toLowerCase() === code);
  if (byKey) return byKey;

  // 2. productCode 완전 일치
  const byCode = catalog.find(
    (c) => c.productCode && c.productCode.toLowerCase() === code
  );
  if (byCode) return byCode;

  // 3. variantId 일치 (v: 없는 순수 UUID)
  const byVariantId = catalog.find(
    (c) => c.variantId && c.variantId.toLowerCase() === code
  );
  if (byVariantId) return byVariantId;

  // 4. productId 일치 (단품 상품)
  const byProductId = catalog.find(
    (c) => !c.variantId && c.productId.toLowerCase() === code
  );
  if (byProductId) return byProductId;

  // 5. URL 형태의 QR인 경우 파라미터나 마지막 세그먼트 탐색
  try {
    if (code.startsWith('http://') || code.startsWith('https://')) {
      const url = new URL(code);
      const paramCode =
        url.searchParams.get('code') ||
        url.searchParams.get('sku') ||
        url.searchParams.get('id');
      if (paramCode) {
        const matched = matchCatalogItem(paramCode, catalog);
        if (matched) return matched;
      }
      const lastSeg = url.pathname.split('/').filter(Boolean).pop();
      if (lastSeg) {
        const matched = matchCatalogItem(lastSeg, catalog);
        if (matched) return matched;
      }
    }
  } catch {
    // URL 파싱 에러 무시
  }

  return null;
}
