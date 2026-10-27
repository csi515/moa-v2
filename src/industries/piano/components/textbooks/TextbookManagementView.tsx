import React, { useState, useEffect } from 'react';
import {
  Textbook,
  TextbookSale,
  TextbookPayment,
  TextbookInventoryTransaction
} from '@/types';
import { StorageService } from '@/services/storage';
import { useApp } from '@/context/AppContext';
import { BookOpen, ShoppingBag, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { textbookCoreStock } from '@/industries/piano/services/textbookCoreStock';
import { useStorageRefresh } from '@/hooks/useStorageRefresh';
import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import { yearMonthLocal } from '@/shared/utils/localDate';

import { TextbookFormModal } from './TextbookFormModal';
import { NewSaleModal } from './NewSaleModal';
import { TextbookPaymentModal } from './TextbookPaymentModal';
import { StockAdjustModal } from './StockAdjustModal';
import { TextbookReceiptModal } from './TextbookReceiptModal';
import { SubTab } from './textbookViewTypes';
import { TextbookSummaryCards } from './tabs/TextbookSummaryCards';
import { TextbookSubTabNav } from './tabs/TextbookSubTabNav';
import { TextbookInventoryTab } from './tabs/TextbookInventoryTab';
import { TextbookSalesTab } from './tabs/TextbookSalesTab';
import { TextbookPaymentsTab } from './tabs/TextbookPaymentsTab';
import { TextbookHistoryTab } from './tabs/TextbookHistoryTab';

export const TextbookManagementView: React.FC = () => {
  const { openConfirmDialog, showToast, triggerRefresh } = useApp();
  // 교재 domain만 — 학생/예약 변경으로 loadData 재실행 금지
  const refreshKey = useStorageRefresh('textbooks');

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('inventory');
  const [focusLowStock, setFocusLowStock] = useState(false);

  // Data states
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [sales, setSales] = useState<TextbookSale[]>([]);
  const [payments, setPayments] = useState<TextbookPayment[]>([]);
  const [transactions, setTransactions] = useState<TextbookInventoryTransaction[]>([]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTextbook, setEditingTextbook] = useState<Textbook | null>(null);

  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleStudentId, setSaleStudentId] = useState<string | undefined>();
  const [saleTextbookId, setSaleTextbookId] = useState<string | undefined>();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<TextbookSale | null>(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedTextbookForStock, setSelectedTextbookForStock] = useState<Textbook | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<TextbookSale | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<TextbookPayment | undefined>();

  const loadData = async () => {
    if (typeof StorageService.listTextbookStockHistory === 'function') {
      try {
        if (textbookCoreStock.isAvailable()) {
          await textbookCoreStock.syncAllStockMirrors();
        }
      } catch {
        // 미러 실패 시 로컬 값으로 표시
      }
    }
    try {
      if (typeof StorageService.refreshTextbookCommerceFromDb === 'function') {
        await StorageService.refreshTextbookCommerceFromDb();
      }
    } catch {
      // DB 조회 실패 시 캐시/legacy로 표시
    }
    setTextbooks(StorageService.getTextbooks());
    setSales(StorageService.getTextbookSales());
    setPayments(StorageService.getTextbookPayments());
    try {
      const history = await StorageService.listTextbookStockHistory();
      setTransactions(history);
    } catch {
      setTransactions(StorageService.getTextbookInventoryTransactions());
    }
  };

  useEffect(() => {
    void loadData();
    const unsubscribe = StorageService.subscribe((changedKey) => {
      if (
        changedKey === '*' ||
        changedKey === STORAGE_KEYS.TEXTBOOKS ||
        changedKey === STORAGE_KEYS.TEXTBOOK_SALES ||
        changedKey === STORAGE_KEYS.TEXTBOOK_PAYMENTS ||
        changedKey === STORAGE_KEYS.TEXTBOOK_INVENTORY_TRANSACTIONS
      ) {
        void loadData();
      }
    });
    return () => unsubscribe();
  }, [refreshKey]);

  const currentYM = yearMonthLocal();
  const stats = StorageService.getTextbookStats(currentYM);

  const handleDeactivateTextbook = (id: string, title: string) => {
    openConfirmDialog({
      title: '교재 사용 중지',
      message: `"${title}" 교재를 사용 중지할까요?\n신규 수납 목록에서는 제외되며, 과거 구매 이력은 그대로 유지됩니다.`,
      confirmText: '사용 중지',
      isDestructive: true,
      onConfirm: () => {
        void (async () => {
          try {
            const ok = await StorageService.setTextbookForSale(id, false);
            if (ok) {
              showToast('교재를 사용 중지했습니다.', 'info');
              triggerRefresh();
            }
          } catch (err) {
            showToast(
              err instanceof Error ? err.message : '교재 사용 중지에 실패했습니다.',
              'error'
            );
          }
        })();
      },
    });
  };

  const handleReactivateTextbook = (id: string, title: string) => {
    openConfirmDialog({
      title: '교재 다시 사용',
      message: `"${title}" 교재를 다시 판매 목록에 포함할까요?`,
      confirmText: '다시 사용',
      onConfirm: () => {
        void (async () => {
          try {
            const ok = await StorageService.setTextbookForSale(id, true);
            if (ok) {
              showToast('교재를 다시 사용하도록 설정했습니다.', 'success');
              triggerRefresh();
            }
          } catch (err) {
            showToast(
              err instanceof Error ? err.message : '교재 상태 변경에 실패했습니다.',
              'error'
            );
          }
        })();
      },
    });
  };

  const handleCancelSale = (sale: TextbookSale) => {
    openConfirmDialog({
      title: '교재 판매 취소 / 반품',
      message: `${sale.studentName} 학생의 "${sale.textbookTitle}" (${sale.quantity}권) 판매를 취소하시겠습니까?\n차감되었던 재고 ${sale.quantity}권이 자동으로 복구됩니다.`,
      confirmText: '판매 취소 (재고 원복)',
      isDestructive: true,
      onConfirm: () => {
        void (async () => {
          try {
            const ok = await StorageService.cancelSale(sale.id, '사용자 판매 취소/반품');
            if (ok) {
              showToast(`판매가 취소되고 재고가 복구되었습니다.`, 'success');
              triggerRefresh();
            }
          } catch (err) {
            showToast(
              err instanceof Error ? err.message : '교재 판매 취소에 실패했습니다.',
              'error'
            );
          }
        })();
      },
    });
  };

  const openReceiptModal = (sale: TextbookSale, payment?: TextbookPayment) => {
    setReceiptSale(sale);
    setReceiptPayment(payment);
    setIsReceiptModalOpen(true);
  };

  const openSaleModal = (textbookId?: string, studentId?: string) => {
    setSaleTextbookId(textbookId);
    setSaleStudentId(studentId);
    setIsSaleModalOpen(true);
  };

  const openPaymentModal = (sale: TextbookSale) => {
    setSelectedSaleForPayment(sale);
    setIsPaymentModalOpen(true);
  };

  const handleLowStockClick = () => {
    setActiveSubTab('inventory');
    setFocusLowStock(true);
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<BookOpen className="w-6 h-6" />}
        title="교재 관리"
        description="학원별 교재 마스터·재고·판매/수납을 관리합니다. 설정에서 「월 청구에 교재·연주회비 합산」을 켜면 미납 교재를 월회비 청구서에 함께 넣을 수 있습니다."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openSaleModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              교재 판매 등록
            </button>
            <button
              onClick={() => {
                setEditingTextbook(null);
                setIsFormModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              새 교재 등록
            </button>
          </div>
        }
      />

      <TextbookSummaryCards
        stats={stats}
        currentYM={currentYM}
        onLowStockClick={handleLowStockClick}
      />

      <TextbookSubTabNav
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
        textbooksCount={textbooks.length}
        salesCount={sales.length}
        transactionsCount={transactions.length}
      />

      {activeSubTab === 'inventory' && (
        <TextbookInventoryTab
          textbooks={textbooks}
          focusLowStock={focusLowStock}
          onFocusLowStockHandled={() => setFocusLowStock(false)}
          onDeactivateTextbook={handleDeactivateTextbook}
          onReactivateTextbook={handleReactivateTextbook}
          onOpenStockModal={(tb) => {
            setSelectedTextbookForStock(tb);
            setIsStockModalOpen(true);
          }}
          onEditTextbook={(tb) => {
            setEditingTextbook(tb);
            setIsFormModalOpen(true);
          }}
          onOpenSaleModal={(textbookId) => openSaleModal(textbookId)}
        />
      )}

      {activeSubTab === 'sales' && (
        <TextbookSalesTab
          sales={sales}
          onOpenPaymentModal={openPaymentModal}
          onOpenReceiptModal={(sale) => openReceiptModal(sale)}
          onCancelSale={handleCancelSale}
        />
      )}

      {activeSubTab === 'payments' && (
        <TextbookPaymentsTab
          sales={sales}
          payments={payments}
          onOpenPaymentModal={openPaymentModal}
          onOpenReceiptModal={openReceiptModal}
        />
      )}

      {activeSubTab === 'history' && (
        <TextbookHistoryTab transactions={transactions} />
      )}

      {isFormModalOpen && (
        <TextbookFormModal
          textbook={editingTextbook}
          onSave={(data) => {
            void (async () => {
              try {
                await StorageService.saveTextbook(data);
                showToast(
                  editingTextbook ? '교재가 수정되었습니다.' : '신규 교재가 등록되었습니다.',
                  'success'
                );
                setIsFormModalOpen(false);
                triggerRefresh();
              } catch (err) {
                showToast(
                  err instanceof Error ? err.message : '교재 저장에 실패했습니다.',
                  'error'
                );
              }
            })();
          }}
          onClose={() => setIsFormModalOpen(false)}
        />
      )}

      {isSaleModalOpen && (
        <NewSaleModal
          initialStudentId={saleStudentId}
          initialTextbookId={saleTextbookId}
          onSuccess={(saleId) => {
            setIsSaleModalOpen(false);
            triggerRefresh();
            const created = StorageService.getTextbookSaleById(saleId);
            if (created && created.paidAmount > 0) {
              const payment = StorageService.getPaymentsBySaleId(saleId)[0];
              openReceiptModal(created, payment);
            }
          }}
          onClose={() => setIsSaleModalOpen(false)}
          onRegisterTextbooks={() => {
            setIsSaleModalOpen(false);
            setActiveSubTab('inventory');
            setEditingTextbook(null);
            setIsFormModalOpen(true);
          }}
        />
      )}

      {isPaymentModalOpen && selectedSaleForPayment && (
        <TextbookPaymentModal
          sale={selectedSaleForPayment}
          onSuccess={(paymentId) => {
            setIsPaymentModalOpen(false);
            triggerRefresh();
            const p = StorageService.getTextbookPayments().find((item) => item.id === paymentId);
            if (p && selectedSaleForPayment) {
              openReceiptModal(selectedSaleForPayment, p);
            }
          }}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {isStockModalOpen && selectedTextbookForStock && (
        <StockAdjustModal
          textbook={selectedTextbookForStock}
          onSuccess={() => {
            setIsStockModalOpen(false);
            triggerRefresh();
          }}
          onClose={() => setIsStockModalOpen(false)}
        />
      )}

      {isReceiptModalOpen && receiptSale && (
        <TextbookReceiptModal
          sale={receiptSale}
          payment={receiptPayment}
          onClose={() => setIsReceiptModalOpen(false)}
        />
      )}
    </div>
  );
};
