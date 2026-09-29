/**
 * 월회비 invoice ID가 local → remote로 바뀌면
 * textbook billingInvoiceId를 최종 invoice로 옮긴다.
 */

export function uniqueInvoiceLinkIds(ids?: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids || []) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function sameIdSet(left: string[] | undefined, right: string[]): boolean {
  const a = uniqueInvoiceLinkIds(left || []);
  if (a.length !== right.length) return false;
  const set = new Set(a);
  return right.every((id) => set.has(id));
}

export type InvoiceTextbookRelinkPlan = {
  saleIdsToRelink: string[];
  nextLinkedSaleIds: string[];
  invoiceLinksChanged: boolean;
};

/** local temp invoice가 remote existing으로 대체될 때 연결 변경분만 계산한다. */
export function planInvoiceTextbookRelink(params: {
  localInvoiceId: string;
  remoteInvoiceId: string;
  localLinkedSaleIds?: string[];
  remoteLinkedSaleIds?: string[];
  sales: Array<{ id: string; billingInvoiceId?: string }>;
}): InvoiceTextbookRelinkPlan {
  const remoteLinked = uniqueInvoiceLinkIds(params.remoteLinkedSaleIds || []);
  const alreadyOnRemote = params.sales
    .filter((sale) => sale.billingInvoiceId === params.remoteInvoiceId)
    .map((sale) => sale.id);

  if (params.localInvoiceId === params.remoteInvoiceId) {
    const nextLinkedSaleIds = uniqueInvoiceLinkIds([...remoteLinked, ...alreadyOnRemote]);
    return {
      saleIdsToRelink: [],
      nextLinkedSaleIds,
      invoiceLinksChanged: false,
    };
  }

  const saleIdsToRelink = uniqueInvoiceLinkIds([
    ...(params.localLinkedSaleIds || []),
    ...params.sales
      .filter((sale) => sale.billingInvoiceId === params.localInvoiceId)
      .map((sale) => sale.id),
  ]).filter((saleId) => {
    const sale = params.sales.find((row) => row.id === saleId);
    if (!sale) return true;
    if (sale.billingInvoiceId === params.remoteInvoiceId) return false;
    if (sale.billingInvoiceId && sale.billingInvoiceId !== params.localInvoiceId) return false;
    return true;
  });

  const nextLinkedSaleIds = uniqueInvoiceLinkIds([
    ...remoteLinked,
    ...alreadyOnRemote,
    ...saleIdsToRelink,
  ]);

  return {
    saleIdsToRelink,
    nextLinkedSaleIds,
    invoiceLinksChanged: !sameIdSet(params.remoteLinkedSaleIds, nextLinkedSaleIds),
  };
}

export function applyInvoiceTextbookRelink<T extends { id: string; billingInvoiceId?: string }>(
  sales: T[],
  saleIdsToRelink: string[],
  remoteInvoiceId: string
): T[] {
  if (saleIdsToRelink.length === 0) return sales;
  const relink = new Set(saleIdsToRelink);
  return sales.map((sale) =>
    relink.has(sale.id) ? { ...sale, billingInvoiceId: remoteInvoiceId } : sale
  );
}

export function orphanTextbookInvoiceRefs<T extends { billingInvoiceId?: string }>(
  sales: T[],
  deletedInvoiceId: string
): T[] {
  return sales.filter((sale) => sale.billingInvoiceId === deletedInvoiceId);
}
