import type { Textbook, TextbookInventoryTransaction } from '../../types';
import { STORAGE_KEYS } from '../adapters';
import { generateEntityId, getItem, setItem, type StorageApi } from './helpers';
import { textbookCoreStock } from '@/industries/piano/services/textbookCoreStock';
import {
  commitLocalThenRemote,
  resolveTextbookCatalogMode,
} from '@/industries/piano/services/textbookCatalogPersist';

function cloneTextbooks(list: Textbook[]): Textbook[] {
  return list.map((t) => ({ ...t }));
}

/** 교재 목록·재고·입출고 이력 (재고 source = Core Inventory) */
export function createTextbookCatalogStorage(api: StorageApi) {
  return {
    getTextbooks(): Textbook[] {
      return getItem<Textbook[]>(STORAGE_KEYS.TEXTBOOKS, []);
    },

    getTextbookById(id: string): Textbook | undefined {
      return (api.getTextbooks as () => Textbook[])().find((t) => t.id === id);
    },

    /**
     * 교재 신규/수정.
     * - core 모드: Core Product/재고 성공 후에만 local mirror 유지(실패 시 롤백)
     * - local_demo: Supabase/사업장 없음 — 명시적 로컬 폴백(온보딩·데모)
     */
    async saveTextbook(tb: Partial<Textbook> & { title: string }): Promise<Textbook> {
      const list = (api.getTextbooks as () => Textbook[])();
      const snapshot = cloneTextbooks(list);
      const nowStr = new Date().toISOString();
      const price = Number(tb.salePrice ?? tb.price ?? 15000);
      const cost = Number(tb.costPrice ?? Math.round(price * 0.6));
      const requestedStock = Number(tb.stock ?? 0);
      const minStock = Number(tb.minStock ?? 5);

      let saved: Textbook;
      let isNew = false;
      let previousStock = 0;
      let replaceIdx = -1;

      if (tb.id) {
        const idx = list.findIndex((t) => t.id === tb.id);
        if (idx >= 0) {
          const prev = list[idx];
          previousStock = prev.stock;
          replaceIdx = idx;
          saved = {
            ...prev,
            ...tb,
            price,
            salePrice: price,
            costPrice: cost,
            // stock은 Core 반영 후 미러 — 일단 기존값 유지
            stock: previousStock,
            currentStock: previousStock,
            minStock,
            isForSale: tb.isForSale !== undefined ? tb.isForSale : prev.isForSale !== false,
            productId: prev.productId || prev.id,
            updatedAt: nowStr,
          };
        } else {
          isNew = true;
          saved = {
            id: tb.id,
            title: tb.title,
            publisher: tb.publisher || '기타출판',
            author: tb.author || '',
            isbn: tb.isbn || '',
            level: tb.level || '기초',
            price,
            salePrice: price,
            costPrice: cost,
            stock: 0,
            currentStock: 0,
            minStock,
            isForSale: tb.isForSale !== undefined ? tb.isForSale : true,
            memo: tb.memo || '',
            productId: tb.id,
            createdAt: nowStr,
            updatedAt: nowStr,
          };
        }
      } else {
        isNew = true;
        // piano.textbooks / core.products PK = UUID — tb-* 는 FK·Core 판매 불가
        const newId = generateEntityId('tb');
        saved = {
          id: newId,
          title: tb.title,
          publisher: tb.publisher || '기타출판',
          author: tb.author || '',
          isbn: tb.isbn || '',
          level: tb.level || '기초',
          price,
          salePrice: price,
          costPrice: cost,
          stock: 0,
          currentStock: 0,
          minStock,
          isForSale: tb.isForSale !== undefined ? tb.isForSale : true,
          memo: tb.memo || '',
          productId: newId,
          createdAt: nowStr,
          updatedAt: nowStr,
        };
      }

      const mode = resolveTextbookCatalogMode(textbookCoreStock.isAvailable());

      if (mode === 'core') {
        return commitLocalThenRemote({
          commitLocal: () => {
            const next = cloneTextbooks(snapshot);
            if (replaceIdx >= 0) {
              next[replaceIdx] = saved;
            } else {
              next.push(saved);
            }
            setItem(STORAGE_KEYS.TEXTBOOKS, next);
          },
          rollbackLocal: () => {
            setItem(STORAGE_KEYS.TEXTBOOKS, snapshot);
          },
          runRemote: async () => {
            let linked = await textbookCoreStock.ensureProductLinked(saved);
            const coreQty = await textbookCoreStock.syncStockMirror(linked.id);
            const delta = requestedStock - coreQty;
            if (delta !== 0) {
              const res = await textbookCoreStock.applyDelta({
                textbookId: linked.id,
                quantityDelta: delta,
                transactionType: delta > 0 ? 'inbound' : 'adjust',
                memo: isNew
                  ? '신규 교재 등록 시 초기 재고 설정'
                  : '교재 수정 시 재고 반영',
              });
              linked = res.textbook;
            } else {
              linked =
                (api.getTextbookById as (id: string) => Textbook | undefined)(linked.id) ||
                linked;
            }
            return linked;
          },
        });
      }

      // local_demo: 명시적 로컬 폴백 (Supabase 미설정·사업장 미선택)
      if (replaceIdx >= 0) {
        list[replaceIdx] = {
          ...saved,
          stock: requestedStock,
          currentStock: requestedStock,
        };
      } else {
        list.push({
          ...saved,
          stock: requestedStock,
          currentStock: requestedStock,
        });
      }
      saved = list[replaceIdx >= 0 ? replaceIdx : list.length - 1];
      setItem(STORAGE_KEYS.TEXTBOOKS, list);

      if (isNew && requestedStock > 0) {
        (api.recordInventoryTransaction as (
          tx: Omit<TextbookInventoryTransaction, 'id' | 'createdAt'>
        ) => TextbookInventoryTransaction)({
          textbookId: saved.id,
          textbookTitle: saved.title,
          transactionType: 'inbound',
          quantity: requestedStock,
          previousStock: 0,
          currentStock: requestedStock,
          transactionDate: new Date().toISOString().slice(0, 10),
          memo: '신규 교재 등록 시 초기 재고 설정',
        });
      }

      return saved;
    },

    getActiveTextbooks(): Textbook[] {
      return (api.getTextbooks as () => Textbook[])().filter((t) => t.isForSale !== false);
    },

    /**
     * 판매 중지(소프트).
     * - core: Core Product isActive 동기화 성공 후에만 local 유지
     * - local_demo: local only (piano sync 키면 기존 outbox 경로)
     */
    async deleteTextbook(id: string): Promise<boolean> {
      return (api.setTextbookForSale as (id: string, forSale: boolean) => Promise<boolean>)(
        id,
        false
      );
    },

    /**
     * 판매 여부 변경.
     * - core: Core Product 반영 실패 시 local 롤백 후 throw
     * - local_demo / piano.textbooks: setItem → 기존 adapter outbox·retry
     */
    async setTextbookForSale(id: string, forSale: boolean): Promise<boolean> {
      const list = (api.getTextbooks as () => Textbook[])();
      const idx = list.findIndex((t) => t.id === id);
      if (idx < 0) return false;

      const snapshot = cloneTextbooks(list);
      const updated: Textbook = {
        ...list[idx],
        isForSale: forSale,
        updatedAt: new Date().toISOString(),
      };

      const mode = resolveTextbookCatalogMode(textbookCoreStock.isAvailable());

      if (mode === 'core') {
        await commitLocalThenRemote({
          commitLocal: () => {
            const next = cloneTextbooks(snapshot);
            next[idx] = updated;
            setItem(STORAGE_KEYS.TEXTBOOKS, next);
          },
          rollbackLocal: () => {
            setItem(STORAGE_KEYS.TEXTBOOKS, snapshot);
          },
          runRemote: async () => {
            await textbookCoreStock.ensureProductLinked(updated);
            return true;
          },
        });
        return true;
      }

      list[idx] = updated;
      setItem(STORAGE_KEYS.TEXTBOOKS, list);
      return true;
    },

    /**
     * 재고 조정.
     * - core: Core atomic movement SoT — 실패 시 throw, local-only 성공 없음
     * - local_demo: 명시적 로컬 폴백
     */
    async adjustStock(
      textbookId: string,
      quantityDelta: number,
      transactionType: 'inbound' | 'adjust' | 'return' = 'inbound',
      memo?: string
    ): Promise<{ textbook: Textbook; transaction: TextbookInventoryTransaction } | null> {
      const mode = resolveTextbookCatalogMode(textbookCoreStock.isAvailable());

      if (mode === 'core') {
        const res = await textbookCoreStock.applyDelta({
          textbookId,
          quantityDelta,
          transactionType,
          memo,
        });
        const tx: TextbookInventoryTransaction = {
          id: res.movement.id,
          textbookId: res.textbook.id,
          textbookTitle: res.textbook.title,
          // Core 기준: UI "반품 입고"(판매 문서 없음) → inbound movement
          transactionType:
            transactionType === 'return'
              ? 'inbound'
              : transactionType === 'adjust'
                ? 'adjust'
                : 'inbound',
          quantity: res.movement.quantity,
          previousStock: res.previousStock,
          currentStock: res.quantityAfter,
          referenceId: res.movement.referenceId || undefined,
          transactionDate: new Date().toISOString().slice(0, 10),
          memo:
            memo ||
            `${transactionType === 'inbound' ? '교재 입고' : transactionType === 'return' ? '반품 입고' : '재고 수동 조정'}`,
          createdAt: res.movement.createdAt,
        };
        return { textbook: res.textbook, transaction: tx };
      }

      // local_demo 폴백
      const list = (api.getTextbooks as () => Textbook[])();
      const idx = list.findIndex((t) => t.id === textbookId);
      if (idx === -1) return null;

      const tb = list[idx];
      const prevStock = tb.stock;
      const newStock = Math.max(0, prevStock + quantityDelta);
      const updatedTb: Textbook = {
        ...tb,
        stock: newStock,
        currentStock: newStock,
        updatedAt: new Date().toISOString(),
      };
      list[idx] = updatedTb;
      setItem(STORAGE_KEYS.TEXTBOOKS, list);

      const tx = (api.recordInventoryTransaction as (
        tx: Omit<TextbookInventoryTransaction, 'id' | 'createdAt'>
      ) => TextbookInventoryTransaction)({
        textbookId: tb.id,
        textbookTitle: tb.title,
        transactionType,
        quantity: quantityDelta,
        previousStock: prevStock,
        currentStock: newStock,
        transactionDate: new Date().toISOString().slice(0, 10),
        memo:
          memo ||
          `${transactionType === 'inbound' ? '교재 입고' : transactionType === 'return' ? '반품 입고' : '재고 수동 조정'}`,
      });

      return { textbook: updatedTb, transaction: tx };
    },

    getTextbookInventoryTransactions(): TextbookInventoryTransaction[] {
      return getItem<TextbookInventoryTransaction[]>(STORAGE_KEYS.TEXTBOOK_INVENTORY_TRANSACTIONS, []);
    },

    async listTextbookStockHistory(): Promise<TextbookInventoryTransaction[]> {
      if (textbookCoreStock.isAvailable()) {
        return textbookCoreStock.listHistory();
      }
      return (api.getTextbookInventoryTransactions as () => TextbookInventoryTransaction[])();
    },

    getTransactionsByTextbookId(textbookId: string): TextbookInventoryTransaction[] {
      return (api.getTextbookInventoryTransactions as () => TextbookInventoryTransaction[])().filter(
        (t) => t.textbookId === textbookId
      );
    },

    recordInventoryTransaction(
      tx: Omit<TextbookInventoryTransaction, 'id' | 'createdAt'>
    ): TextbookInventoryTransaction {
      const list = (api.getTextbookInventoryTransactions as () => TextbookInventoryTransaction[])();
      const newTx: TextbookInventoryTransaction = {
        ...tx,
        id: generateEntityId('tit'),
        createdAt: new Date().toISOString(),
      };
      list.unshift(newTx);
      setItem(STORAGE_KEYS.TEXTBOOK_INVENTORY_TRANSACTIONS, list);
      return newTx;
    },

    getLowStockTextbooks(): Textbook[] {
      return (api.getTextbooks as () => Textbook[])().filter((t) => t.stock <= t.minStock);
    },
  };
}
