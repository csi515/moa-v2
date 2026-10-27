import { useMemo, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { useStorageRefresh } from '@/hooks';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import type { Student } from '@/types';
import { MEDICATION_STATUS_LABEL, MEDICATION_DEFAULTS, type MedicationRequest } from '@/types/care';
import { Section } from './shared';

export function ParentMedicationView({
  student,
  readOnly = false,
  showToast,
  onRefresh,
}: {
  student: Student;
  readOnly?: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onRefresh: () => void;
}) {
  const { currentUser, openConfirmDialog } = useApp();
  const refreshKey = useStorageRefresh();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    requestDate: new Date().toISOString().slice(0, 10),
    medicineName: '',
    dosage: '',
    times: MEDICATION_DEFAULTS.times,
    reason: '',
    note: '',
  });

  const requests = useMemo(
    () =>
      StorageService.getMedicationRequests()
        .filter((r) => r.studentId === student.id)
        .sort(
          (a, b) =>
            b.requestDate.localeCompare(a.requestDate) || b.updatedAt.localeCompare(a.updatedAt)
        ),
    [student.id, refreshKey]
  );

  const openCreate = () => {
    setForm({
      requestDate: new Date().toISOString().slice(0, 10),
      medicineName: '',
      dosage: '',
      times: MEDICATION_DEFAULTS.times,
      reason: '',
      note: '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!form.medicineName.trim() || !form.dosage.trim()) {
      showToast('약 이름과 용량을 입력해 주세요.', 'error');
      return;
    }
    StorageService.saveMedicationRequest({
      studentId: student.id,
      studentName: student.name,
      requestDate: form.requestDate,
      medicineName: form.medicineName.trim(),
      dosage: form.dosage.trim(),
      times: form.times.trim() || MEDICATION_DEFAULTS.times,
      reason: form.reason.trim() || '가정에서 의뢰',
      guardianName: currentUser.name,
      note: form.note.trim() || undefined,
      status: 'requested',
    });
    showToast('투약 의뢰를 보냈습니다. 원에서 확인 후 투약합니다.', 'success');
    setIsModalOpen(false);
    onRefresh();
  };

  const cancelRequest = (item: MedicationRequest) => {
    openConfirmDialog({
      title: '투약 의뢰 취소',
      message: `${item.medicineName} 투약 의뢰를 취소할까요?`,
      isDestructive: true,
      confirmText: '취소하기',
      onConfirm: () => {
        StorageService.saveMedicationRequest({
          ...item,
          status: 'cancelled',
        });
        showToast('투약 의뢰를 취소했습니다.', 'info');
        onRefresh();
      },
    });
  };

  const statusTone = (status: MedicationRequest['status']) => {
    if (status === 'administered') return 'bg-emerald-50 text-emerald-700';
    if (status === 'cancelled') return 'bg-slate-100 text-slate-500';
    return 'bg-amber-50 text-amber-800';
  };

  return (
    <>
      <Section title={`${student.name} 투약`}>
        {!readOnly && (
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              투약 의뢰
            </button>
          </div>
        )}
        {requests.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            {readOnly
              ? '투약 의뢰 기록이 없습니다.'
              : '투약 의뢰 내역이 없습니다. 약이 필요하면 의뢰해 주세요.'}
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <article key={r.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/80">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{r.medicineName}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{r.requestDate}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${statusTone(r.status)}`}>
                    {MEDICATION_STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  {r.dosage} · {r.times}
                </p>
                {r.reason && <p className="text-xs text-slate-500 mt-1">{r.reason}</p>}
                {r.status === 'administered' && r.administeredAt && (
                  <p className="text-[11px] text-emerald-600 mt-2">
                    투약 완료 {r.administeredAt.slice(0, 16).replace('T', ' ')}
                    {r.administeredBy ? ` · ${r.administeredBy}` : ''}
                  </p>
                )}
                {r.status === 'requested' && !readOnly && (
                  <button
                    type="button"
                    onClick={() => cancelRequest(r)}
                    className="mt-3 text-xs font-bold text-rose-600 min-h-[44px]"
                  >
                    의뢰 취소
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </Section>

      <Modal
        isOpen={!readOnly && isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="투약 의뢰"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4 p-5">
          <FormField label="투약일" htmlFor="med-date">
            <input
              id="med-date"
              type="date"
              value={form.requestDate}
              onChange={(e) => setForm((f) => ({ ...f, requestDate: e.target.value }))}
              className={FORM_CONTROL_CLASS}
              required
            />
          </FormField>
          <FormField label="약 이름" htmlFor="med-name" required>
            <input
              id="med-name"
              value={form.medicineName}
              onChange={(e) => setForm((f) => ({ ...f, medicineName: e.target.value }))}
              className={FORM_CONTROL_CLASS}
              placeholder="예: 해열제"
              required
            />
          </FormField>
          <FormField label="용량" htmlFor="med-dosage" required>
            <input
              id="med-dosage"
              value={form.dosage}
              onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
              className={FORM_CONTROL_CLASS}
              placeholder="예: 5ml"
              required
            />
          </FormField>
          <FormField label="투약 시점" htmlFor="med-times">
            <input
              id="med-times"
              value={form.times}
              onChange={(e) => setForm((f) => ({ ...f, times: e.target.value as any }))}
              className={FORM_CONTROL_CLASS}
              placeholder={MEDICATION_DEFAULTS.times}
            />
          </FormField>
          <FormField label="사유" htmlFor="med-reason">
            <input
              id="med-reason"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className={FORM_CONTROL_CLASS}
              placeholder="예: 미열"
            />
          </FormField>
          <FormField label="전달 메모" htmlFor="med-note">
            <textarea
              id="med-note"
              rows={2}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className={`${FORM_CONTROL_CLASS} resize-none`}
              placeholder="선생님께 전할 말"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 min-h-[44px] text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl"
            >
              닫기
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 min-h-[44px] text-sm font-bold text-white bg-sky-600 rounded-xl"
            >
              의뢰 보내기
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
