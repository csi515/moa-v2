import { useMemo, useState, type FC, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { EmptyState, Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { ClipboardCheck, Plus, Printer, Save } from 'lucide-react';
import type { SafetyCheckKind, SafetyChecklistItem, SafetyInspectionLog } from './types';
import { SAFETY_CHECK_KIND_LABEL } from './types';
import { defaultSafetyItems } from './complianceUtils';

function formatDate(value: string): string {
  return value.slice(0, 10);
}

export const SafetyInspectionView: FC = () => {
  const { showToast, currentUser } = useApp();
  const refreshKey = useStorageRefresh();
  const logs = useMemo(
    () =>
      StorageService.getSafetyInspectionLogs().sort((a, b) => b.logDate.localeCompare(a.logDate)),
    [refreshKey]
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<SafetyInspectionLog | null>(null);
  const [form, setForm] = useState({
    logDate: new Date().toISOString().slice(0, 10),
    kind: 'fire_drill' as SafetyCheckKind,
    items: defaultSafetyItems('fire_drill'),
    note: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      logDate: new Date().toISOString().slice(0, 10),
      kind: 'fire_drill',
      items: defaultSafetyItems('fire_drill'),
      note: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (log: SafetyInspectionLog) => {
    setEditing(log);
    setForm({
      logDate: formatDate(log.logDate),
      kind: log.kind,
      items: log.items,
      note: log.note || '',
    });
    setIsModalOpen(true);
  };

  const toggleItem = (key: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? { ...item, checked: !item.checked } : item)),
    }));
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!form.items.some((item) => item.checked)) {
      showToast('확인한 항목을 하나 이상 선택해 주세요.', 'error');
      return;
    }
    StorageService.saveSafetyInspectionLog({
      id: editing?.id,
      logDate: form.logDate,
      kind: form.kind,
      items: form.items,
      note: form.note.trim() || undefined,
      teacherId: currentUser.staffId || undefined,
      teacherName: currentUser.name,
    });
    showToast('안전 일지가 저장되었습니다.', 'success');
    setIsModalOpen(false);
  };

  const printLog = (log: SafetyInspectionLog) => {
    openEdit(log);
    window.setTimeout(() => window.print(), 200);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          일지 작성
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {logs.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="w-10 h-10" />}
            title="안전 일지가 없습니다"
            description="대피훈련·안전점검 체크 후 인쇄할 수 있습니다."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((log) => (
              <li key={log.id} className="px-4 py-3">
                <button type="button" onClick={() => openEdit(log)} className="w-full text-left min-h-[44px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{SAFETY_CHECK_KIND_LABEL[log.kind]}</span>
                    <span className="text-[11px] font-mono text-slate-500">{formatDate(log.logDate)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {log.items.filter((item) => item.checked).map((item) => item.label).join(' · ') || '미체크'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => printLog(log)}
                  className="inline-flex items-center gap-1 min-h-[44px] text-xs font-bold text-sky-700"
                >
                  <Printer className="w-4 h-4" />
                  인쇄
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="안전 일지">
        <form onSubmit={handleSave} className="space-y-3" id="safety-print">
          <FormField label="날짜">
            <input
              type="date"
              value={form.logDate}
              onChange={(e) => setForm((prev) => ({ ...prev, logDate: e.target.value }))}
              className={FORM_CONTROL_CLASS}
              required
            />
          </FormField>
          <FormField label="종류">
            <select
              value={form.kind}
              onChange={(e) => {
                const kind = e.target.value as SafetyCheckKind;
                setForm((prev) => ({
                  ...prev,
                  kind,
                  items: editing?.kind === kind ? prev.items : defaultSafetyItems(kind),
                }));
              }}
              className={FORM_CONTROL_CLASS}
            >
              {(Object.keys(SAFETY_CHECK_KIND_LABEL) as SafetyCheckKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {SAFETY_CHECK_KIND_LABEL[kind]}
                </option>
              ))}
            </select>
          </FormField>
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-slate-700">체크</legend>
            {form.items.map((item: SafetyChecklistItem) => (
              <label key={item.key} className="flex items-center gap-2 min-h-[44px] text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(item.key)}
                  className="w-4 h-4"
                />
                {item.label}
              </label>
            ))}
          </fieldset>
          <FormField label="특이사항">
            <textarea
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              rows={3}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
            >
              <Save className="w-4 h-4" />
              저장
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold"
            >
              <Printer className="w-4 h-4" />
              인쇄
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
