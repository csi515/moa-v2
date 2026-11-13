/**
 * 전문 조달·구매 관리 파이프라인 엔진 (Pure Domain Functions)
 *
 * 1단계: 부서별 구매 요청 (PR) & 구매 사유 필수 & 과거 구매 이력 자동 매핑
 * 2단계: 구매부서의 타당성 검수 및 사내 창고 가용재고 중복 확인
 * 3단계: 다품목 묶음 패키지 계약 & 계약 방식 결정 (경쟁입찰 대사 vs 수의계약 사유서)
 * 4단계: 전자결재 및 발주서(PO) 일괄 발행 & 재고(inventory) '입고 대기' 연동
 */

export interface ItemProcurementHistory {
  sku: string;
  itemName: string;
  specification?: string;
  lastVendor: string;
  purchaseAccount?: string; // 예: 쿠팡 비즈니스, MRO 도매몰, 오피스디포 등
  lastUnitPrice: number;
  lastPurchasedAt: string;
}

export interface RequisitionItem {
  id: string;
  sku: string;
  itemName: string;
  specification?: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedSubtotal: number;
  lastVendor?: string;
  purchaseAccount?: string;
  lastUnitPrice?: number;
}

export type RequisitionStatus =
  | 'draft'
  | 'submitted'
  | 'vetted_approved'
  | 'rejected'
  | 'contract_packaged'
  | 'po_issued';

export interface AuditTrailEntry {
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  comment?: string;
}

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  department: string; // 예: 생산팀, 연구소, 품질팀, 총무팀
  requesterName: string;
  targetDeliveryDate: string;
  justification: string; // ★ 필수: "왜 이 물품이 지금 필요한가?"
  items: RequisitionItem[];
  totalEstimatedAmount: number;
  status: RequisitionStatus;
  rejectionReason?: string;
  vettedBy?: string;
  vettedAt?: string;
  auditTrail: AuditTrailEntry[];
  createdAt: string;
}

export interface StockInventoryItem {
  sku: string;
  itemName: string;
  availableQuantity: number;
  location?: string;
}

export interface StockAvailabilityCheckResult {
  sku: string;
  itemName: string;
  requestedQuantity: number;
  inStockQuantity: number;
  hasEnoughStock: boolean;
  hasPartialStock: boolean;
  message: string;
}

export type SoleSourceReasonType =
  | 'patent_exclusive' // 특허/독점 공급
  | 'equipment_compatibility' // 기존 설비 호환성 유지
  | 'emergency_restoration' // 긴급 복구 조달
  | 'small_amount_statutory'; // 법정 소액 수의계약

export const SOLE_SOURCE_REASON_LABELS: Record<SoleSourceReasonType, string> = {
  patent_exclusive: '특허·기술 독점 공급 (국내외 유일 제조/수입사)',
  equipment_compatibility: '기존 설비·기계 호환성 보증 유지 (정품 부품)',
  emergency_restoration: '재해·설비 긴급 고장 복구용 긴급 조달',
  small_amount_statutory: '국가계약법/사규 기준 소액 수의계약 범위 이내',
};

export interface BiddingVendorQuote {
  vendorName: string;
  quotedUnitPrice: number;
  totalQuotedAmount: number;
  leadTimeDays: number;
  isRecommendedWinner?: boolean;
  isSelectedWinner?: boolean;
  quoteDocumentName?: string;
  notes?: string;
}

export interface SoleSourceDetails {
  reasonType: SoleSourceReasonType;
  reasonDetail: string; // ★ 상세 사유 필수 서술
  supportingDocumentName?: string; // 예: 독점공급확인서, 제조사공문 등
  targetVendor: string;
  agreedAmount: number;
}

export interface ContractPackage {
  id: string;
  packageNumber: string;
  packageTitle: string;
  contractType: 'bidding' | 'sole_source';
  items: RequisitionItem[];
  totalBudget: number;
  // 경쟁 입찰일 경우
  biddingQuotes?: BiddingVendorQuote[];
  winningVendor?: string;
  // 수의 계약일 경우
  soleSource?: SoleSourceDetails;
  status: 'draft' | 'approved' | 'po_issued';
  auditEvidence: {
    prNumbers: string[];
    justifications: Array<{ prNumber: string; department: string; justification: string }>;
    contractMethodJustification: string;
  };
}

export interface ContractPurchaseOrder {
  poNumber: string;
  packageId: string;
  packageTitle: string;
  contractType: 'bidding' | 'sole_source';
  vendorName: string;
  totalAmount: number;
  items: Array<{
    sku: string;
    itemName: string;
    specification?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    subtotal: number;
  }>;
  orderDate: string;
  deliveryDueDate: string;
  requesterDepartments: string[];
  justificationSummary: string; // 영구 보존되는 구매 사유
  contractRationaleSummary: string; // 영구 보존되는 입찰/수의계약 사유
  approverSignatures: Array<{ name: string; role: string; signedAt: string }>;
  status: 'issued' | 'pending_receipt' | 'completed';
}

/**
 * 1. 품목번호(SKU)나 품목명으로 과거 구매 이력 조회 (자동완성용)
 */
export function lookupItemProcurementHistory(
  query: string,
  history: ItemProcurementHistory[]
): ItemProcurementHistory | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    history.find(
      (h) => h.sku.toLowerCase() === q || h.itemName.toLowerCase().includes(q)
    ) ?? null
  );
}

/**
 * 2. 부서별 구매 요청서(PR) 생성 및 구매 사유(Justification) 유효성 검증
 */
export function createPurchaseRequisition(params: {
  department: string;
  requesterName: string;
  targetDeliveryDate: string;
  justification: string;
  items: Array<Omit<RequisitionItem, 'id' | 'estimatedSubtotal'>>;
  historyList?: ItemProcurementHistory[];
  sequenceNumber?: number;
}): { pr: PurchaseRequisition | null; error?: string } {
  if (!params.department.trim()) {
    return { pr: null, error: '요청 부서를 입력해야 합니다.' };
  }
  if (!params.requesterName.trim()) {
    return { pr: null, error: '신청자 성명을 입력해야 합니다.' };
  }
  if (!params.justification.trim() || params.justification.trim().length < 5) {
    return {
      pr: null,
      error: '구매 사유(Justification)는 5자 이상 필수 입력해야 합니다 (왜 이 물품이 지금 필요한가?).',
    };
  }
  if (!params.items || params.items.length === 0) {
    return { pr: null, error: '최소 1개 이상의 구매 요청 품목이 필요합니다.' };
  }

  const seq = params.sequenceNumber ?? Math.floor(100 + Math.random() * 900);
  const dateStr = new Date(Date.now()).toISOString().slice(0, 10).replace(/-/g, '');
  const prNumber = `PR-${dateStr}-${String(seq).padStart(3, '0')}`;

  let totalEstimatedAmount = 0;
  const items: RequisitionItem[] = params.items.map((item, idx) => {
    const subtotal = item.quantity * item.estimatedUnitPrice;
    totalEstimatedAmount += subtotal;

    // 과거 이력 자동 매핑이 필요한 경우 매칭
    const history = params.historyList
      ? lookupItemProcurementHistory(item.sku, params.historyList)
      : null;

    return {
      id: `pri-${Date.now()}-${idx + 1}`,
      sku: item.sku,
      itemName: item.itemName,
      specification: item.specification,
      quantity: item.quantity,
      unit: item.unit || 'EA',
      estimatedUnitPrice: item.estimatedUnitPrice,
      estimatedSubtotal: subtotal,
      lastVendor: item.lastVendor || history?.lastVendor,
      purchaseAccount: item.purchaseAccount || history?.purchaseAccount,
      lastUnitPrice: item.lastUnitPrice ?? history?.lastUnitPrice,
    };
  });

  const nowIso = new Date(Date.now()).toISOString();
  const pr: PurchaseRequisition = {
    id: `pr-${Date.now()}`,
    prNumber,
    department: params.department.trim(),
    requesterName: params.requesterName.trim(),
    targetDeliveryDate: params.targetDeliveryDate || nowIso.slice(0, 10),
    justification: params.justification.trim(),
    items,
    totalEstimatedAmount,
    status: 'submitted',
    auditTrail: [
      {
        timestamp: nowIso,
        actor: params.requesterName.trim(),
        role: `${params.department.trim()} 신청자`,
        action: 'SUBMIT_PR',
        comment: `구매 요청서 상신 (사유: ${params.justification.trim()})`,
      },
    ],
    createdAt: nowIso,
  };

  return { pr };
}

/**
 * 3. 사내 창고(inventory) 가용 재고 중복 확인
 */
export function checkInternalInventoryAvailability(
  requestedItems: RequisitionItem[],
  inventoryStock: StockInventoryItem[]
): StockAvailabilityCheckResult[] {
  return requestedItems.map((reqItem) => {
    const matchedStock = inventoryStock.find(
      (s) => s.sku.toLowerCase() === reqItem.sku.toLowerCase()
    );
    const inStock = matchedStock?.availableQuantity ?? 0;
    const hasEnoughStock = inStock >= reqItem.quantity;
    const hasPartialStock = inStock > 0 && inStock < reqItem.quantity;

    let message = '사내 창고 재고 없음 (신규 구매 필요)';
    if (hasEnoughStock) {
      message = `사내 창고 내 대체/가용 재고 충분 (${inStock}개 보유 중)`;
    } else if (hasPartialStock) {
      message = `사내 창고 내 일부 재고 있음 (${inStock}개 보유 중, 잔여 ${reqItem.quantity - inStock}개 구매 요망)`;
    }

    return {
      sku: reqItem.sku,
      itemName: reqItem.itemName,
      requestedQuantity: reqItem.quantity,
      inStockQuantity: inStock,
      hasEnoughStock,
      hasPartialStock,
      message,
    };
  });
}

/**
 * 3-1. 사내 가용 재고 선불출 권고 (Stock Pre-release & Internal Transfer Recommendation)
 * - 사내 다른 창고에 재고가 이미 존재할 경우, 불필요한 신규 외부 구매를 방지하고 사내 전배/불출을 유도
 */
export interface StockPreReleaseRecommendation {
  canAvoidExternalPurchase: boolean;
  recommendedActions: Array<{
    sku: string;
    itemName: string;
    requestedQuantity: number;
    inStockQuantity: number;
    recommendedAction: 'INTERNAL_TRANSFER_PREFERRED' | 'PARTIAL_PURCHASE_ALLOWED' | 'EXTERNAL_PURCHASE_REQUIRED';
    instruction: string;
    savingAmount: number;
  }>;
  totalSavingsPotential: number;
}

export function evaluateStockPreRelease(
  requestedItems: RequisitionItem[],
  inventoryStock: StockInventoryItem[]
): StockPreReleaseRecommendation {
  let totalSavings = 0;
  let canAvoidAll = requestedItems.length > 0;

  const actions = requestedItems.map((reqItem) => {
    const stock = inventoryStock.find(
      (s) => s.sku.toLowerCase() === reqItem.sku.toLowerCase()
    );
    const inStock = stock?.availableQuantity ?? 0;
    const unitPrice = reqItem.estimatedUnitPrice || 0;

    if (inStock >= reqItem.quantity) {
      const saving = reqItem.quantity * unitPrice;
      totalSavings += saving;
      return {
        sku: reqItem.sku,
        itemName: reqItem.itemName,
        requestedQuantity: reqItem.quantity,
        inStockQuantity: inStock,
        recommendedAction: 'INTERNAL_TRANSFER_PREFERRED' as const,
        instruction: `사내 창고에 충분한 재고(${inStock}개)가 있습니다. 신규 발주를 차단하고 [사내 창고 재고 선불출]로 처리하세요. (절감액: ${saving.toLocaleString()}원)`,
        savingAmount: saving,
      };
    } else if (inStock > 0) {
      canAvoidAll = false;
      const saving = inStock * unitPrice;
      totalSavings += saving;
      return {
        sku: reqItem.sku,
        itemName: reqItem.itemName,
        requestedQuantity: reqItem.quantity,
        inStockQuantity: inStock,
        recommendedAction: 'PARTIAL_PURCHASE_ALLOWED' as const,
        instruction: `사내 창고에 ${inStock}개 보유 중입니다. ${inStock}개는 사내 선불출하고 잔여 ${reqItem.quantity - inStock}개만 신규 구매하세요.`,
        savingAmount: saving,
      };
    } else {
      canAvoidAll = false;
      return {
        sku: reqItem.sku,
        itemName: reqItem.itemName,
        requestedQuantity: reqItem.quantity,
        inStockQuantity: 0,
        recommendedAction: 'EXTERNAL_PURCHASE_REQUIRED' as const,
        instruction: '사내 창고에 재고가 없으므로 정규 외부 구매 발주를 진행합니다.',
        savingAmount: 0,
      };
    }
  });

  return {
    canAvoidExternalPurchase: canAvoidAll && requestedItems.length > 0,
    recommendedActions: actions,
    totalSavingsPotential: totalSavings,
  };
}

/**
 * 3-2. 부서별 구매 예산 한도(Budget Ceiling) 인터락
 */
export interface DepartmentBudgetCeiling {
  department: string;
  periodYearMonth: string; // YYYY-MM
  allocatedBudget: number; // 배정 예산
  spentBudget: number; // 기집행 예산
  remainingBudget: number; // 잔여 예산
}

export interface BudgetCeilingCheckResult {
  isWithinBudget: boolean;
  requiresExecutiveOverride: boolean; // 최고권한자 특약 승인 요구 여부
  department: string;
  requestedAmount: number;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  deficitAmount: number; // 초과 결손액
  message: string;
}

export function checkDepartmentBudgetCeiling(params: {
  budget: DepartmentBudgetCeiling;
  requestedAmount: number;
  hasExecutiveApproval?: boolean;
}): BudgetCeilingCheckResult {
  const remaining = Math.max(0, params.budget.allocatedBudget - params.budget.spentBudget);
  const isWithin = params.requestedAmount <= remaining;
  const deficit = Math.max(0, params.requestedAmount - remaining);

  if (isWithin) {
    return {
      isWithinBudget: true,
      requiresExecutiveOverride: false,
      department: params.budget.department,
      requestedAmount: params.requestedAmount,
      allocatedBudget: params.budget.allocatedBudget,
      spentBudget: params.budget.spentBudget,
      remainingBudget: remaining,
      deficitAmount: 0,
      message: `당월 부서 예산 한도 내 정상 승인 가능 (잔여 예산: ${remaining.toLocaleString()}원)`,
    };
  }

  return {
    isWithinBudget: false,
    requiresExecutiveOverride: !params.hasExecutiveApproval,
    department: params.budget.department,
    requestedAmount: params.requestedAmount,
    allocatedBudget: params.budget.allocatedBudget,
    spentBudget: params.budget.spentBudget,
    remainingBudget: remaining,
    deficitAmount: deficit,
    message: params.hasExecutiveApproval
      ? `당월 예산 초과(${deficit.toLocaleString()}원) - 최고책임자 특약 결재로 조건부 승인됨`
      : `[예산 초과 경고] 당월 잔여 예산(${remaining.toLocaleString()}원)을 ${deficit.toLocaleString()}원 초과했습니다. 자동 반려되거나 최고권한자(임원/대표) 특약 승인이 필요합니다.`,
  };
}

/**
 * 4. 구매부서의 타당성 검수 (Vetting)
 */
export function vetPurchaseRequisition(
  pr: PurchaseRequisition,
  action: 'approve' | 'reject',
  vetter: { name: string; department?: string },
  reason?: string
): PurchaseRequisition {
  const nowIso = new Date(Date.now()).toISOString();

  if (action === 'reject') {
    if (!reason || !reason.trim()) {
      throw new Error('구매 요청 반려 시 구체적인 반려 사유를 반드시 입력해야 합니다.');
    }
    return {
      ...pr,
      status: 'rejected',
      rejectionReason: reason.trim(),
      vettedBy: vetter.name,
      vettedAt: nowIso,
      auditTrail: [
        ...pr.auditTrail,
        {
          timestamp: nowIso,
          actor: vetter.name,
          role: vetter.department || '구매관리부',
          action: 'REJECT_PR',
          comment: `검수 반려 (사유: ${reason.trim()})`,
        },
      ],
    };
  }

  return {
    ...pr,
    status: 'vetted_approved',
    vettedBy: vetter.name,
    vettedAt: nowIso,
    auditTrail: [
      ...pr.auditTrail,
      {
        timestamp: nowIso,
        actor: vetter.name,
        role: vetter.department || '구매관리부',
        action: 'APPROVE_PR',
        comment: '구매 타당성 검수 적합 판정 (구매 계약 단계 이관)',
      },
    ],
  };
}

/**
 * 5. 다품목 묶음 패키지 및 계약 방식 결정 (경쟁 입찰 vs 수의 계약)
 */
export function createPurchaseContractPackage(params: {
  packageTitle: string;
  sourceRequisitions: PurchaseRequisition[];
  contractType: 'bidding' | 'sole_source';
  biddingQuotes?: BiddingVendorQuote[];
  soleSource?: SoleSourceDetails;
}): { package: ContractPackage | null; error?: string } {
  if (!params.packageTitle.trim()) {
    return { package: null, error: '계약 패키지 명칭을 입력해야 합니다.' };
  }

  // 검수 통과된 PR의 품목들만 수집
  const approvedPrs = params.sourceRequisitions.filter(
    (pr) => pr.status === 'vetted_approved' || pr.status === 'contract_packaged'
  );
  if (approvedPrs.length === 0) {
    return { package: null, error: '검수 승인(적합)된 구매 요청 품목이 없습니다.' };
  }

  const allItems: RequisitionItem[] = [];
  const justifications: Array<{ prNumber: string; department: string; justification: string }> = [];
  let totalBudget = 0;

  approvedPrs.forEach((pr) => {
    justifications.push({
      prNumber: pr.prNumber,
      department: pr.department,
      justification: pr.justification,
    });
    pr.items.forEach((item) => {
      allItems.push(item);
      totalBudget += item.estimatedSubtotal;
    });
  });

  const nowIso = new Date(Date.now()).toISOString();
  const packageNumber = `PKG-${nowIso.slice(0, 10).replace(/-/g, '')}-${Math.floor(
    100 + Math.random() * 900
  )}`;

  // 1) 경쟁 입찰 검증
  if (params.contractType === 'bidding') {
    if (!params.biddingQuotes || params.biddingQuotes.length < 2) {
      return {
        package: null,
        error: '경쟁 입찰 방식은 최소 2곳 이상의 공급사 견적 비교가 필수입니다.',
      };
    }

    // 최저가 우선 및 추천 산출
    const evaluatedQuotes = [...params.biddingQuotes]
      .sort((a, b) => a.totalQuotedAmount - b.totalQuotedAmount)
      .map((q, idx) => ({
        ...q,
        isRecommendedWinner: idx === 0,
      }));

    const selected = evaluatedQuotes.find((q) => q.isSelectedWinner) || evaluatedQuotes[0];

    return {
      package: {
        id: `pkg-${Date.now()}`,
        packageNumber,
        packageTitle: params.packageTitle.trim(),
        contractType: 'bidding',
        items: allItems,
        totalBudget,
        biddingQuotes: evaluatedQuotes,
        winningVendor: selected.vendorName,
        status: 'draft',
        auditEvidence: {
          prNumbers: approvedPrs.map((p) => p.prNumber),
          justifications,
          contractMethodJustification: `복수 공급사(${evaluatedQuotes.length}개사) 경쟁 견적 입찰을 통해 최적 공급사 [${selected.vendorName} - ${selected.totalQuotedAmount.toLocaleString()}원] 선정`,
        },
      },
    };
  }

  // 2) 수의 계약 검증
  if (params.contractType === 'sole_source') {
    if (!params.soleSource) {
      return { package: null, error: '수의계약 정보를 입력해야 합니다.' };
    }
    const { reasonType, reasonDetail, targetVendor, agreedAmount } = params.soleSource;
    if (!targetVendor || !targetVendor.trim()) {
      return { package: null, error: '수의계약 체결 업체를 지정해야 합니다.' };
    }
    if (!reasonType) {
      return { package: null, error: '수의계약 사유 유형(특허/독점, 설비호환성 등)을 선택해야 합니다.' };
    }
    if (!reasonDetail || reasonDetail.trim().length < 10) {
      return {
        package: null,
        error: '수의계약 상세 사유(Justification)는 10자 이상 구체적으로 작성해야 합니다 (감사 및 ISO 심사 필수 증빙).',
      };
    }

    const reasonLabel = SOLE_SOURCE_REASON_LABELS[reasonType] || reasonType;

    return {
      package: {
        id: `pkg-${Date.now()}`,
        packageNumber,
        packageTitle: params.packageTitle.trim(),
        contractType: 'sole_source',
        items: allItems,
        totalBudget: agreedAmount > 0 ? agreedAmount : totalBudget,
        soleSource: params.soleSource,
        winningVendor: targetVendor.trim(),
        status: 'draft',
        auditEvidence: {
          prNumbers: approvedPrs.map((p) => p.prNumber),
          justifications,
          contractMethodJustification: `[수의계약 사유서] 유형: ${reasonLabel} | 상세: ${reasonDetail.trim()} | 공급업체: ${targetVendor.trim()}`,
        },
      },
    };
  }

  return { package: null, error: '유효한 계약 방식을 지정해야 합니다.' };
}

/**
 * 6. 전자결재 승인 및 단일 계약 발주서(PO) 일괄 발행
 */
export function issueContractPurchaseOrder(params: {
  contractPackage: ContractPackage;
  approvers: Array<{ name: string; role: string }>;
  deliveryDueDate?: string;
  orderSequence?: number;
}): ContractPurchaseOrder {
  const { contractPackage, approvers } = params;
  const now = new Date(Date.now());
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = params.orderSequence ?? 1;
  const poNumber = `PO-${dateStr}-${String(seq).padStart(3, '0')}`;

  const vendorName = contractPackage.winningVendor || '지정 공급사';
  let totalAmount = 0;

  const poItems = contractPackage.items.map((i) => {
    const subtotal = i.quantity * i.estimatedUnitPrice;
    totalAmount += subtotal;
    return {
      sku: i.sku,
      itemName: i.itemName,
      specification: i.specification,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.estimatedUnitPrice,
      subtotal,
    };
  });

  if (contractPackage.soleSource && contractPackage.soleSource.agreedAmount > 0) {
    totalAmount = contractPackage.soleSource.agreedAmount;
  }

  const requesterDepartments = Array.from(
    new Set(contractPackage.auditEvidence.justifications.map((j) => j.department))
  );

  const justificationSummary = contractPackage.auditEvidence.justifications
    .map((j) => `[${j.department} - ${j.prNumber}] ${j.justification}`)
    .join(' / ');

  const nowIso = now.toISOString();
  const approverSignatures = approvers.map((a) => ({
    name: a.name,
    role: a.role,
    signedAt: nowIso,
  }));

  const dueDate =
    params.deliveryDueDate ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    poNumber,
    packageId: contractPackage.id,
    packageTitle: contractPackage.packageTitle,
    contractType: contractPackage.contractType,
    vendorName,
    totalAmount,
    items: poItems,
    orderDate: nowIso.slice(0, 10),
    deliveryDueDate: dueDate,
    requesterDepartments,
    justificationSummary,
    contractRationaleSummary: contractPackage.auditEvidence.contractMethodJustification,
    approverSignatures,
    status: 'issued',
  };
}

/**
 * 7. 발주서 발행 후 재고 관리(inventory) '입고 대기' 연동
 */
export function syncPurchaseOrderToInventoryReceipt(
  po: ContractPurchaseOrder
): Array<{
  sku: string;
  itemName: string;
  pendingQuantity: number;
  unit: string;
  poNumber: string;
  status: 'pending_receipt';
}> {
  return po.items.map((item) => ({
    sku: item.sku,
    itemName: item.itemName,
    pendingQuantity: item.quantity,
    unit: item.unit,
    poNumber: po.poNumber,
    status: 'pending_receipt' as const,
  }));
}
