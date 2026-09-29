import { useMemo, useState, type FC, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { PageHeader, EmptyState, Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS, FilterTabs } from '@/shared/components/ui';
import { Pill, Plus, Trash2, Save, CheckCircle2 } from 'lucide-react';
import type { MedicationRequest, MedicationStatus } from './types';
import { MEDICATION_STATUS_LABEL } from './types';
import { MEDICATION_DEFAULTS } from './careDefaults';
import { CareDateSearchBar } from './components/CareDateSearchBar';
import { useModuleLabels } from '@/core/labels';
import { notifyBookingChange } from '@/core/academy/services/academyAlertService';

type StatusFilter = 'ALL' | MedicationStatus;

export const MedicationRequestView: FC = () => {
  const { showToast, openConfirmDialog, currentUser } = useApp();
  const { scopeStudents } = useStaffScope();
  const refreshKey = useStorageRefresh();
  const labels = useModuleLabels();

  const students = useMemo(
    () => scopeStudents(StorageService.getStudents()).filter((s) => s.status === 'active'),
    [scopeStudents, refreshKey]
  );
  const requests = useMemo(() => StorageService.getMedicationRequests(), [refreshKey]);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationRequest | null>(null);
  const [form, setForm] = useState({
    studentId: '',
    medicineName: '',
    dosage: '',
    times: '',
    reason: '',
    guardianName: '',
    note: '',
  });

  const studentIds = useMemo(() => new Set(students.map((student) => student.id)), [students]);

  const filtered = useMemo(() => {
    return requests
      .filter((r) => r.requestDate === selectedDate && studentIds.has(r.studentId))
      .filter((r) => (statusFilter === 'ALL' ? true : r.status === statusFilter))
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          r.studentName.toLowerCase().includes(q) ||
          r.medicineName.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'));
  }, [requests, selectedDate, statusFilter, searchQuery, studentIds]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      studentId: students[0]?.id || '',
      medicineName: '',
      dosage: '',
      times: MEDICATION_DEFAULTS.times,
      reason: '',
      guardianName: '',
      note: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: MedicationRequest) => {
    setEditing(item);
    setForm({
      studentId: item.studentId,
      medicineName: item.medicineName,
      dosage: item.dosage,
      times: item.times,
      reason: item.reason,
      guardianName: item.guardianName || '',
      note: item.note || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === form.studentId);
    if (!student) {
      showToast(`${labels.customer.singular}을(를) 선택해 주세요.`, 'error');
      return;
    }
    if (!form.medicineName.trim() || !form.dosage.trim()) {
      showToast('약 이름과 용량을 입력해 주세요.', 'error');
      return;
    }

    StorageService.saveMedicationRequest({
      id: editing?.id,
      studentId: student.id,
      studentName: student.name,
      requestDate: selectedDate,
      medicineName: form.medicineName.trim(),
      dosage: form.dosage.trim(),
      times: form.times.trim(),
      reason: form.reason.trim(),
      guardianName: form.guardianName.trim() || undefined,
      note: form.note.trim() || undefined,
      status: editing?.status || 'requested',
      administeredAt: editing?.administeredAt,
      administeredBy: editing?.administeredBy,
    });
    showToast(editing ? '투약 의뢰가 수정되었습니다.' : '투약 의뢰가 등록되었습니다.', 'success');
    setIsModalOpen(false);
  };

  const markAdministered = (item: MedicationRequest) => {
    const student = students.find((entry) => entry.id === item.studentId);
    StorageService.saveMedicationRequest({
      ...item,
      status: 'administered',
      administeredAt: new Date().toISOString(),
      administeredBy: currentUser.name,
    });
    notifyBookingChange({
      studentId: item.studentId,
      studentName: item.studentName,
      parentPhone: student?.parentPhone || student?.phone,
      title: '투약 완료',
      message: `${item.requestDate} ${item.studentName} ${item.medicineName} 투약이 완료되었습니다.`,
      date: item.requestDate,
      portalTab: 'medications',
    });
    showToast(`${item.studentName} 투약 완료로 표시했습니다.`, 'success');
  };

  const handleDelete = (item: MedicationRequest) => {
    openConfirmDialog({
      title: '투약 의뢰 삭제',
      message: `${item.studentName}의 ${item.medicineName} 투약 의뢰를 삭제할까요?`,
      isDestructive: true,
      confirmText: '삭제',
      onConfirm: () => {
        StorageService.deleteMedicationRequest(item.id);
        showToast('투약 의뢰가 삭제되었습니다.', 'info');
      },
    });
  };

  const statusTone = (status: MedicationStatus) => {
    if (status === 'administered') return 'bg-emerald-50 text-emerald-700';
    if (status === 'cancelled') return 'bg-slate-100 text-slate-500';
    return 'bg-amber-50 text-amber-800';
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<Pill className="w-6 h-6" />}
        iconClassName="text-sky-600"
        title="투약 관리"
        description="보호자 투약 의뢰를 접수하고 투약 완료를 기록합니다"
        actions={
          <button
            type="button"
            onClick={openCreate}
            disabled={students.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            투약 의뢰 등록
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CareDateSearchBar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={`${labels.customer.singular}·약 이름 검색`}
          leading={
            <FilterTabs
              tabs={[
                { id: 'ALL', label: '전체' },
                { id: 'requested', label: MEDICATION_STATUS_LABEL.requested },
                { id: 'administered', label: MEDICATION_STATUS_LABEL.administered },
                { id: 'cancelled', label: MEDICATION_STATUS_LABEL.cancelled },
              ]}
              active={statusFilter}
              onChange={(id) => setStatusFilter(id)}
              activeClassName="bg-sky-600 text-white"
            />
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Pill className="w-10 h-10" />}
            title="투약 의뢰가 없습니다"
            description="보호자 요청이 있으면 투약 의뢰를 등록하세요."
            action={
              students.length > 0 ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  투약 의뢰 등록
                </button>
              ) : undefined
            }
            className="border-0 shadow-none rounded-none"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.studentName}</p>
                    <p className="text-xs text-slate-700 mt-1 font-semibold">{item.medicineName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.dosage} · {item.times}
                      {item.guardianName ? ` · 의뢰 ${item.guardianName}` : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${statusTone(item.status)}`}>
                    {MEDICATION_STATUS_LABEL[item.status]}
                  </span>
                </div>
                {item.reason && (
                  <p className="text-xs text-slate-600 leading-relaxed">사유: {item.reason}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {item.status === 'requested' && (
                    <button
                      type="button"
                      onClick={() => markAdministered(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      투약 완료
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold text-sky-700 hover:bg-sky-50"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                    aria-label="투약 의뢰 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? '투약 의뢰 수정' : '투약 의뢰 등록'}
      >
        <form onSubmit={handleSave} className="space-y-4 p-5">
          <FormField label={labels.customer.singular} required>
            <select
              required
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className={FORM_CONTROL_CLASS}
              disabled={Boolean(editing)}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="약 이름" required>
            <input
              required
              value={form.medicineName}
              onChange={(e) => setForm({ ...form, medicineName: e.target.value })}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="용량" required>
              <input
                required
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                className={FORM_CONTROL_CLASS}
                placeholder="예: 5ml"
              />
            </FormField>
            <FormField label="투약 시점">
              <input
                value={form.times}
                onChange={(e) => setForm({ ...form, times: e.target.value })}
                className={FORM_CONTROL_CLASS}
                placeholder="예: 점심 후 1회"
              />
            </FormField>
          </div>
          <FormField label="사유">
            <input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="예: 감기 증상"
            />
          </FormField>
          <FormField label="의뢰 보호자">
            <input
              value={form.guardianName}
              onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <FormField label="메모">
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              취소
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
            >
              <Save className="w-4 h-4" />
              저장
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
