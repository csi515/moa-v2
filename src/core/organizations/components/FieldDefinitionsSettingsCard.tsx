import { useCallback, useEffect, useState, type FC, type FormEvent } from 'react';
import { ListPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  Button,
  FORM_CONTROL_CLASS,
  FormField,
  Modal,
  SettingsCard,
} from '@/shared/components/ui';
import { EmptyState, SegmentedControl } from '@/shared/components';
import type { EntityType } from '@/core/fields/dynamicFieldEngine';
import {
  createFieldDefinition,
  listFieldDefinitions,
  seedFieldDefinitionsFromIndustry,
  softDeleteFieldDefinition,
  updateFieldDefinition,
  type FieldDataType,
  type FieldDefinitionRow,
} from '@/core/fields/fieldDefinitionService';
import {
  FIELD_DATA_TYPE_OPTIONS,
  FIELD_DEFINITIONS_COPY as COPY,
} from './fieldDefinitionsCopy';

type EntityTab = 'customer' | 'product';

function parseOptionsText(raw: string): string[] | null {
  const lines = raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

function optionsToText(options: unknown): string {
  if (!Array.isArray(options)) return '';
  return options
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'value' in item) {
        const o = item as { label?: string; value: string };
        return o.label ?? String(o.value);
      }
      return String(item);
    })
    .join('\n');
}

interface EditorState {
  id?: string;
  key: string;
  label: string;
  dataType: FieldDataType;
  required: boolean;
  placeholder: string;
  optionsText: string;
}

const EMPTY_EDITOR: EditorState = {
  key: '',
  label: '',
  dataType: 'text',
  required: false,
  placeholder: '',
  optionsText: '',
};

export const FieldDefinitionsSettingsCard: FC = () => {
  const { showToast, openConfirmDialog } = useApp();
  const { industry } = usePermissions();
  const org = useOrganization();
  const organizationId = org.currentOrganization?.id;

  const [entityTab, setEntityTab] = useState<EntityTab>('customer');
  const [rows, setRows] = useState<FieldDefinitionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);

  const load = useCallback(async () => {
    if (!organizationId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const list = await listFieldDefinitions(organizationId, entityTab as EntityType, {
        includeInactive: true,
      });
      setRows(list);
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.loadError, 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, entityTab, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditor(EMPTY_EDITOR);
    setEditorOpen(true);
  };

  const openEdit = (row: FieldDefinitionRow) => {
    setEditor({
      id: row.id,
      key: row.key,
      label: row.label,
      dataType: (row.data_type as FieldDataType) || 'text',
      required: row.required,
      placeholder: row.placeholder ?? '',
      optionsText: optionsToText(row.options),
    });
    setEditorOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationId || busy) return;
    const label = editor.label.trim();
    const key = editor.key.trim();
    if (!label || (!editor.id && !key)) return;

    setBusy(true);
    try {
      const options =
        editor.dataType === 'select' ? parseOptionsText(editor.optionsText) : null;
      if (editor.id) {
        await updateFieldDefinition(organizationId, editor.id, {
          label,
          dataType: editor.dataType,
          required: editor.required,
          placeholder: editor.placeholder.trim() || null,
          options,
        });
        showToast(COPY.saved, 'success');
      } else {
        await createFieldDefinition(organizationId, {
          entityType: entityTab,
          key,
          label,
          dataType: editor.dataType,
          required: editor.required,
          placeholder: editor.placeholder.trim() || null,
          options,
          sortOrder: (rows.length + 1) * 10,
        });
        showToast(COPY.added, 'success');
      }
      setEditorOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.saveError, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (row: FieldDefinitionRow) => {
    if (!organizationId) return;
    openConfirmDialog({
      title: COPY.deleteConfirmTitle,
      message: COPY.deleteConfirmMessage,
      confirmText: COPY.deleteConfirmOk,
      cancelText: COPY.cancel,
      isDestructive: true,
      onConfirm: () => {
        void (async () => {
          setBusy(true);
          try {
            await softDeleteFieldDefinition(organizationId, row.id);
            showToast(COPY.deleted, 'success');
            await load();
          } catch (err) {
            showToast(err instanceof Error ? err.message : COPY.saveError, 'error');
          } finally {
            setBusy(false);
          }
        })();
      },
    });
  };

  const handleSeed = async () => {
    if (!organizationId || busy) return;
    setBusy(true);
    try {
      const count = await seedFieldDefinitionsFromIndustry(organizationId, industry);
      if (count === 0) {
        showToast(COPY.seedEmpty, 'info');
      } else {
        showToast(COPY.seedDone, 'success');
      }
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : COPY.saveError, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SettingsCard
        title={COPY.title}
        icon={<ListPlus className="w-4 h-4 text-slate-600" />}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">{COPY.description}</p>

          {!organizationId ? (
            <p className="text-sm text-slate-500">{COPY.noOrg}</p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <SegmentedControl
                  value={entityTab}
                  options={[
                    { value: 'customer', label: COPY.entityCustomer },
                    { value: 'product', label: COPY.entityProduct },
                  ]}
                  onChange={(next) => setEntityTab(next as EntityTab)}
                  aria-label="커스텀 필드 대상"
                />
                <div className="flex flex-wrap gap-2">
                  {entityTab === 'customer' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={() => void handleSeed()}
                      disabled={busy}
                      isLoading={busy}
                    >
                      {COPY.seedFromIndustry}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    size="default"
                    onClick={openCreate}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    {COPY.add}
                  </Button>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500 py-6 text-center">불러오는 중…</p>
              ) : rows.length === 0 ? (
                <EmptyState
                  icon={<ListPlus className="w-10 h-10" />}
                  title={COPY.emptyTitle}
                  description={COPY.emptyDescription}
                />
              ) : (
                <ul className="space-y-2">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{row.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">
                          {row.key} · {row.data_type}
                          {row.required ? ' · 필수' : ''}
                        </p>
                        <span
                          className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            row.is_active
                              ? 'bg-teal-50 text-teal-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {row.is_active ? COPY.active : COPY.inactive}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="default"
                          onClick={() => openEdit(row)}
                          leftIcon={<Pencil className="w-3.5 h-3.5" />}
                        >
                          {COPY.edit}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="default"
                          onClick={() => handleDelete(row)}
                          disabled={busy}
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        >
                          {COPY.delete}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </SettingsCard>

      <Modal
        isOpen={editorOpen}
        onClose={() => !busy && setEditorOpen(false)}
        title={editor.id ? COPY.edit : COPY.add}
        maxWidth="md"
        intent="form"
      >
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          {!editor.id && (
            <FormField label={COPY.keyLabel} hint={COPY.keyHint}>
              <input
                value={editor.key}
                onChange={(e) =>
                  setEditor((prev) => ({
                    ...prev,
                    key: e.target.value.replace(/[^a-zA-Z0-9_]/g, ''),
                  }))
                }
                placeholder={COPY.keyPlaceholder}
                className={`${FORM_CONTROL_CLASS} min-h-[44px] font-mono`}
                required
              />
            </FormField>
          )}
          <FormField label={COPY.labelLabel}>
            <input
              value={editor.label}
              onChange={(e) => setEditor((prev) => ({ ...prev, label: e.target.value }))}
              placeholder={COPY.labelPlaceholder}
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
              required
            />
          </FormField>
          <FormField label={COPY.typeLabel}>
            <select
              value={editor.dataType}
              onChange={(e) =>
                setEditor((prev) => ({
                  ...prev,
                  dataType: e.target.value as FieldDataType,
                }))
              }
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            >
              {FIELD_DATA_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>
          <label className="flex items-center gap-2 min-h-[44px] text-sm text-slate-700">
            <input
              type="checkbox"
              checked={editor.required}
              onChange={(e) =>
                setEditor((prev) => ({ ...prev, required: e.target.checked }))
              }
              className="w-4 h-4 rounded border-slate-300"
            />
            {COPY.requiredLabel}
          </label>
          <FormField label={COPY.placeholderLabel}>
            <input
              value={editor.placeholder}
              onChange={(e) =>
                setEditor((prev) => ({ ...prev, placeholder: e.target.value }))
              }
              className={`${FORM_CONTROL_CLASS} min-h-[44px]`}
            />
          </FormField>
          {editor.dataType === 'select' && (
            <FormField label={COPY.optionsLabel}>
              <textarea
                value={editor.optionsText}
                onChange={(e) =>
                  setEditor((prev) => ({ ...prev, optionsText: e.target.value }))
                }
                placeholder={COPY.optionsPlaceholder}
                rows={4}
                className={`${FORM_CONTROL_CLASS} min-h-[96px]`}
              />
            </FormField>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(false)}
              disabled={busy}
            >
              {COPY.cancel}
            </Button>
            <Button type="submit" variant="primary" isLoading={busy} disabled={busy}>
              {COPY.save}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default FieldDefinitionsSettingsCard;
