import { useCallback, useEffect, useState, type FormEvent, type FC } from 'react';
import { FolderOpen, Pencil, Plus } from 'lucide-react';
import { EmptyState, Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { productService } from '../../services/productService';
import type { ProductCategory } from '../../types/product';
import { PRODUCT_LIST_COPY as COPY } from './productListCopy';

interface Props {
  isOpen: boolean;
  organizationId: string;
  onClose: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ProductCategoryManageModal: FC<Props> = ({
  isOpen,
  organizationId,
  onClose,
  onChanged,
  onError,
  onToast,
}) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const list = await productService.listCategories(organizationId, {
        includeInactive: true,
      });
      setCategories(list);
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.categoryLoadError);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, onError]);

  useEffect(() => {
    if (!isOpen) return;
    setNewName('');
    setEditingId(null);
    setEditName('');
    void load();
  }, [isOpen, load]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || busyId) return;
    setBusyId('new');
    try {
      await productService.createCategory(organizationId, newName);
      setNewName('');
      onToast(COPY.categoryAdded, 'success');
      await load();
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.categorySaveError);
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (categoryId: string) => {
    if (!editName.trim() || busyId) return;
    setBusyId(categoryId);
    try {
      await productService.renameCategory(organizationId, categoryId, editName);
      cancelEdit();
      onToast(COPY.categoryRenamed, 'success');
      await load();
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.categorySaveError);
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (cat: ProductCategory) => {
    if (busyId) return;
    setBusyId(cat.id);
    try {
      await productService.setCategoryActive(organizationId, cat.id, !cat.isActive);
      onToast(cat.isActive ? COPY.categoryDeactivated : COPY.categoryActivated, 'success');
      await load();
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.categorySaveError);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={COPY.categoryManageTitle} maxWidth="md">
      <div className="p-4 sm:p-6 space-y-4">
        <p className="text-xs text-slate-500">{COPY.categoryManageHint}</p>

        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
          <FormField label={COPY.categoryNameLabel} className="flex-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={COPY.categoryNamePlaceholder}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            />
          </FormField>
          <button
            type="submit"
            disabled={!newName.trim() || busyId === 'new'}
            className="inline-flex items-center justify-center gap-1 min-h-[44px] px-4 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-60 sm:self-end"
          >
            <Plus className="w-4 h-4" />
            {COPY.categoryAdd}
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">불러오는 중…</p>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="w-10 h-10" />}
            title={COPY.categoryEmptyTitle}
            description={COPY.categoryEmptyDescription}
          />
        ) : (
          <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2"
              >
                {editingId === cat.id ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`${FORM_CONTROL_CLASS} min-h-[44px] flex-1`}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                      >
                        {COPY.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEdit(cat.id)}
                        disabled={busyId === cat.id}
                        className="flex-1 min-h-[44px] px-3 rounded-xl bg-teal-600 text-white text-xs font-bold disabled:opacity-60"
                      >
                        {COPY.save}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{cat.name}</p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cat.isActive
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {cat.isActive ? COPY.categoryActive : COPY.categoryInactive}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        className="inline-flex items-center justify-center gap-1 min-h-[44px] px-2 text-xs font-bold text-teal-700"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {COPY.categoryRename}
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleActive(cat)}
                        disabled={busyId === cat.id}
                        className="min-h-[44px] px-2 text-xs font-bold text-slate-600 disabled:opacity-60"
                      >
                        {cat.isActive ? COPY.categoryDeactivate : COPY.categoryActivate}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
        >
          {COPY.cancel}
        </button>
      </div>
    </Modal>
  );
};
