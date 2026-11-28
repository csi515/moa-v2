import { useCallback, useEffect, useState, type FormEvent, type FC } from 'react';
import { FolderOpen, Pencil, Plus } from 'lucide-react';
import { EmptyState, Modal } from '@/shared/components';
import { Button, FORM_ACTION_BUTTON_CLASS, FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { productService } from '../../services/productService';
import type { ProductCategory } from '../../types/product';
import { PRODUCT_LIST_COPY as COPY } from './productListCopy';

interface EditorProps {
  organizationId: string;
  active?: boolean;
  onChanged?: () => void;
  onError: (message: string) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ProductCategoryEditor: FC<EditorProps> = ({
  organizationId,
  active = true,
  onChanged,
  onError,
  onToast,
}) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const rootCategories = categories.filter((c) => !c.parentId);

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
    if (!active) return;
    setNewName('');
    setNewParentId('');
    setEditingId(null);
    setEditName('');
    setEditParentId('');
    void load();
  }, [active, load]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || busyId) return;
    setBusyId('new');
    try {
      await productService.createCategory(organizationId, newName, {
        parentId: newParentId || null,
      });
      setNewName('');
      setNewParentId('');
      onToast(COPY.categoryAdded, 'success');
      await load();
      onChanged?.();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.categorySaveError);
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditParentId(cat.parentId ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditParentId('');
  };

  const saveEdit = async (categoryId: string) => {
    if (!editName.trim() || busyId) return;
    setBusyId(categoryId);
    try {
      await productService.renameCategory(organizationId, categoryId, editName);
      await productService.setCategoryParent(
        organizationId,
        categoryId,
        editParentId || null
      );
      cancelEdit();
      onToast(COPY.categoryRenamed, 'success');
      await load();
      onChanged?.();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.categorySaveError);
    } finally {
      setBusyId(null);
    }
  };

  const parentName = (parentId: string | null) => {
    if (!parentId) return null;
    return categories.find((c) => c.id === parentId)?.name ?? null;
  };

  const toggleActive = async (cat: ProductCategory) => {
    if (busyId) return;
    setBusyId(cat.id);
    try {
      await productService.setCategoryActive(organizationId, cat.id, !cat.isActive);
      onToast(cat.isActive ? COPY.categoryDeactivated : COPY.categoryActivated, 'success');
      await load();
      onChanged?.();
    } catch (err) {
      onError(err instanceof Error ? err.message : COPY.categorySaveError);
    } finally {
      setBusyId(null);
    }
  };

  return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500">{COPY.categoryManageHint}</p>

        <form onSubmit={handleAdd} className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <FormField label={COPY.categoryNameLabel} className="flex-1">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={COPY.categoryNamePlaceholder}
                className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
              />
            </FormField>
            <FormField label={COPY.categoryParentLabel} className="sm:w-48">
              <select
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
              >
                <option value="">{COPY.categoryParentNone}</option>
                {rootCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <Button
              type="submit"
              variant="primary"
              size="default"
              className="sm:self-end"
              disabled={!newName.trim() || busyId === 'new'}
              isLoading={busyId === 'new'}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {COPY.categoryAdd}
            </Button>
          </div>
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
                  <div className="flex flex-col gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
                      autoFocus
                    />
                    <select
                      value={editParentId}
                      onChange={(e) => setEditParentId(e.target.value)}
                      className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
                    >
                      <option value="">{COPY.categoryParentNone}</option>
                      {rootCategories
                        .filter((c) => c.id !== cat.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="default" onClick={cancelEdit}>
                        {COPY.cancel}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="default"
                        onClick={() => void saveEdit(cat.id)}
                        disabled={busyId === cat.id}
                        isLoading={busyId === cat.id}
                      >
                        {COPY.save}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {cat.parentId ? `↳ ${cat.name}` : cat.name}
                      </p>
                      {parentName(cat.parentId) && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {parentName(cat.parentId)}
                        </p>
                      )}
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
                    <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="default"
                        onClick={() => startEdit(cat)}
                        leftIcon={<Pencil className="w-3.5 h-3.5" />}
                      >
                        {COPY.categoryRename}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="default"
                        onClick={() => void toggleActive(cat)}
                        disabled={busyId === cat.id}
                      >
                        {cat.isActive ? COPY.categoryDeactivate : COPY.categoryActivate}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
  );
};

interface ModalProps extends EditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProductCategoryManageModal: FC<ModalProps> = ({
  isOpen,
  onClose,
  ...editorProps
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={COPY.categoryManageTitle} maxWidth="md">
    <div className="p-4 sm:p-6 space-y-4">
      {isOpen ? <ProductCategoryEditor {...editorProps} active={isOpen} /> : null}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="default"
          className={FORM_ACTION_BUTTON_CLASS}
          onClick={onClose}
        >
          {COPY.cancel}
        </Button>
      </div>
    </div>
  </Modal>
);
