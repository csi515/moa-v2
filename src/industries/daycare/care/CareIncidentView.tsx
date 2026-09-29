import { useMemo, useState, type FC, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { EmptyState, Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { AlertTriangle, Plus, Save, Trash2 } from 'lucide-react';
import { useModuleLabels } from '@/core/labels';
import { notifyBookingChange } from '@/core/academy/services/academyAlertService';
import type { CareIncident } from './types';

function toLocalInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatWhen(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

export const CareIncidentView: FC = () => {
  const { showToast, openConfirmDialog, currentUser } = useApp();
  const { scopeStudents } = useStaffScope();
  const refreshKey = useStorageRefresh();
  const labels = useModuleLabels();

  const students = useMemo(
    () => scopeStudents(StorageService.getStudents()).filter((student) => student.status === 'active'),
    [scopeStudents, refreshKey]
  );
  const incidents = useMemo(() => StorageService.getCareIncidents(), [refreshKey]);
  const studentIds = useMemo(() => new Set(students.map((student) => student.id)), [students]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CareIncident | null>(null);
  const [form, setForm] = useState({
    studentId: '',
    occurredAt: '',
    content: '',
    actionTaken: '',
  });

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return incidents
      .filter((item) => studentIds.has(item.studentId))
      .filter((item) => {
        if (!q) return true;
        return (
          item.studentName.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.actionTaken.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [incidents, studentIds, searchQuery]);

  const openCreate = () => {
    const now = new Date();
    setEditing(null);
    setForm({
      studentId: students[0]?.id || '',
      occurredAt: toLocalInput(now.toISOString()),
      content: '',
      actionTaken: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: CareIncident) => {
    setEditing(item);
    setForm({
      studentId: item.studentId,
      occurredAt: toLocalInput(item.occurredAt),
      content: item.content,
      actionTaken: item.actionTaken,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const student = students.find((item) => item.id === form.studentId);
    if (!student) {
      showToast(`${labels.customer.singular}을(를) 선택해 주세요.`, 'error');
      return;
    }
    if (!form.occurredAt || !form.content.trim() || !form.actionTaken.trim()) {
      showToast('사고 시각, 내용, 조치를 입력해 주세요.', 'error');
      return;
    }

    const occurred = new Date(form.occurredAt);
    if (Number.isNaN(occurred.getTime())) {
      showToast('사고 시각을 확인해 주세요.', 'error');
      return;
    }
    const notifiedAt = new Date().toISOString();
    const occurredAt = occurred.toISOString();
    StorageService.saveCareIncident({
      id: editing?.id,
      studentId: student.id,
      studentName: student.name,
      occurredAt,
      content: form.content.trim(),
      actionTaken: form.actionTaken.trim(),
      parentNotifiedAt: notifiedAt,
      teacherId: currentUser.staffId || undefined,
      teacherName: currentUser.name,
    });
    notifyBookingChange({
      studentId: student.id,
      studentName: student.name,
      parentPhone: student.parentPhone || student.phone,
      title: '사고 안내',
      message: `${student.name} 사고 기록이 ${editing ? '수정' : '등록'}되었습니다. ${form.content.trim()}`,
      date: occurredAt.slice(0, 10),
      portalTab: 'incidents',
    });
    showToast('사고 기록을 저장하고 보호자에게 알렸습니다.', 'success');
    setIsModalOpen(false);
  };

  const handleDelete = (item: CareIncident) => {
    openConfirmDialog({
      title: '사고 기록 삭제',
      message: `${item.studentName}의 사고 기록을 삭제할까요?`,
      isDestructive: true,
      confirmText: '삭제',
      onConfirm: () => {
        StorageService.deleteCareIncident(item.id);
        showToast('사고 기록이 삭제되었습니다.', 'info');
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          disabled={students.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          사고 기록
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`${labels.customer.singular}·내용 검색`}
            className={`${FORM_CONTROL_CLASS} w-full`}
            aria-label="사고 기록 검색"
          />
        </div>
        {visible.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="w-10 h-10" />}
            title="사고 기록이 없습니다"
            description="사고 시각·내용·조치를 남기면 보호자에게 알립니다."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <button type="button" onClick={() => openEdit(item)} className="w-full text-left min-h-[44px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{item.studentName}</span>
                    <span className="text-[11px] font-mono text-slate-500">{formatWhen(item.occurredAt)}</span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 line-clamp-2">{item.content}</p>
                  <p className="text-[11px] text-slate-500 mt-1">조치 {item.actionTaken}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    보호자 알림 {formatWhen(item.parentNotifiedAt)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="inline-flex items-center gap-1 mt-1 min-h-[44px] text-xs font-bold text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="사고 기록">
        <form onSubmit={handleSave} className="space-y-3">
          <FormField label={labels.customer.singular}>
            <select
              value={form.studentId}
              onChange={(e) => setForm((prev) => ({ ...prev, studentId: e.target.value }))}
              className={FORM_CONTROL_CLASS}
              disabled={!!editing}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="사고 시각">
            <input
              type="datetime-local"
              value={form.occurredAt}
              onChange={(e) => setForm((prev) => ({ ...prev, occurredAt: e.target.value }))}
              className={FORM_CONTROL_CLASS}
              required
            />
          </FormField>
          <FormField label="내용">
            <textarea
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              rows={3}
              className={FORM_CONTROL_CLASS}
              required
            />
          </FormField>
          <FormField label="조치">
            <textarea
              value={form.actionTaken}
              onChange={(e) => setForm((prev) => ({ ...prev, actionTaken: e.target.value }))}
              rows={3}
              className={FORM_CONTROL_CLASS}
              required
            />
          </FormField>
          <p className="text-[11px] text-slate-500">저장하면 보호자에게 알립니다. 관청 보고는 전송하지 않습니다.</p>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
          >
            <Save className="w-4 h-4" />
            저장하고 알림
          </button>
        </form>
      </Modal>
    </div>
  );
};
