import { useMemo, useState, type FC, type FormEvent } from 'react';
import { Bus, CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { transportStorage } from '@/capabilities/transport/infrastructure/transportStorage';
import { rosterStorage } from '@/capabilities/roster/infrastructure/rosterStorage';
import { FormField, FORM_CONTROL_CLASS, FilterTabs, FilterBar, SearchField } from '@/shared/components/ui';
import { Calendar } from 'lucide-react';
import {
  SHUTTLE_DIRECTION_LABEL,
  SHUTTLE_DIRECTION_OPTIONS,
  SHUTTLE_RIDE_STATUS_LABEL,
  formatPickupAddressLine,
  formatShuttleDirection,
  getDefaultPickupAddress,
  type ShuttleDirection,
  type ShuttleRideRequest,
  type ShuttleRideStatus,
} from '@/capabilities/transport';

type StatusFilter = 'ALL' | ShuttleRideStatus;

export const ShuttleRideRequestView: FC = () => {
  const { showToast, openConfirmDialog, currentUser } = useApp();
  const { scopeStudents } = useStaffScope();
  const refreshKey = useStorageRefresh();
  const labels = useModuleLabels();

  const students = useMemo(
    () => scopeStudents(rosterStorage.getStudents()).filter((s) => s.status === 'active'),
    [scopeStudents, refreshKey]
  );
  const requests = useMemo(() => transportStorage.getShuttleRideRequests(), [refreshKey]);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShuttleRideRequest | null>(null);
  const [form, setForm] = useState({
    studentId: '',
    direction: 'both' as ShuttleDirection,
    addressLabel: '집',
    address: '',
    addressDetail: '',
    guardianName: '',
    note: '',
  });

  const filtered = useMemo(() => {
    return requests
      .filter((r) => r.rideDate === selectedDate)
      .filter((r) => (statusFilter === 'ALL' ? true : r.status === statusFilter))
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          r.studentName.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.addressLabel.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'));
  }, [requests, selectedDate, statusFilter, searchQuery]);

  const applyStudentAddress = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    const addr = student ? getDefaultPickupAddress(student) : undefined;
    setForm((prev) => ({
      ...prev,
      studentId,
      addressLabel: addr?.label || prev.addressLabel || '집',
      address: addr?.address || '',
      addressDetail: addr?.detail || '',
      direction: addr?.shuttleDirection || prev.direction,
    }));
  };

  const openCreate = () => {
    setEditing(null);
    const firstId = students[0]?.id || '';
    const student = students[0];
    const addr = student ? getDefaultPickupAddress(student) : undefined;
    setForm({
      studentId: firstId,
      direction: addr?.shuttleDirection || 'both',
      addressLabel: addr?.label || '집',
      address: addr?.address || '',
      addressDetail: addr?.detail || '',
      guardianName: '',
      note: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: ShuttleRideRequest) => {
    setEditing(item);
    setForm({
      studentId: item.studentId,
      direction: item.direction,
      addressLabel: item.addressLabel,
      address: item.address,
      addressDetail: item.addressDetail || '',
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
    if (!form.address.trim()) {
      showToast('승하차 주소를 입력해 주세요.', 'error');
      return;
    }

    transportStorage.saveShuttleRideRequest({
      id: editing?.id,
      studentId: student.id,
      studentName: student.name,
      rideDate: selectedDate,
      direction: form.direction,
      addressLabel: form.addressLabel.trim() || '주소',
      address: form.address.trim(),
      addressDetail: form.addressDetail.trim() || undefined,
      pickupAddressId: editing?.pickupAddressId,
      guardianName: form.guardianName.trim() || undefined,
      note: form.note.trim() || undefined,
      status: editing?.status || 'requested',
      confirmedAt: editing?.confirmedAt,
      confirmedBy: editing?.confirmedBy,
      completedAt: editing?.completedAt,
      completedBy: editing?.completedBy,
    });
    showToast(editing ? '차량 운행 신청을 수정했습니다.' : '차량 운행 신청을 등록했습니다.', 'success');
    setIsModalOpen(false);
  };

  const confirmRide = (item: ShuttleRideRequest) => {
    transportStorage.saveShuttleRideRequest({
      ...item,
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      confirmedBy: currentUser.name,
    });
    showToast(`${item.studentName} 운행을 확정했습니다.`, 'success');
  };

  const completeRide = (item: ShuttleRideRequest) => {
    transportStorage.saveShuttleRideRequest({
      ...item,
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedBy: currentUser.name,
    });
    showToast(`${item.studentName} 운행을 완료로 표시했습니다.`, 'success');
  };

  const handleDelete = (item: ShuttleRideRequest) => {
    openConfirmDialog({
      title: '차량 운행 신청 삭제',
      message: `${item.studentName}의 ${item.rideDate} 운행 신청을 삭제할까요?`,
      isDestructive: true,
      confirmText: '삭제',
      onConfirm: () => {
        transportStorage.deleteShuttleRideRequest(item.id);
        showToast('차량 운행 신청을 삭제했습니다.', 'info');
      },
    });
  };

  const statusTone = (status: ShuttleRideStatus) => {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
    if (status === 'confirmed') return 'bg-sky-50 text-sky-700';
    if (status === 'cancelled') return 'bg-slate-100 text-slate-500';
    return 'bg-amber-50 text-amber-800';
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<Bus className="w-6 h-6" />}
        iconClassName="text-orange-600"
        title="차량 운행"
        description="학부모 차량 운행 신청을 확인하고 운행을 확정·완료합니다"
        actions={
          <button
            type="button"
            onClick={openCreate}
            disabled={students.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            운행 등록
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <FilterBar className="border-0 shadow-none rounded-none border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 min-h-[44px] text-sm font-bold border border-slate-200 rounded-xl"
            />
          </div>
          <FilterTabs
            tabs={[
              { id: 'ALL', label: '전체' },
              { id: 'requested', label: SHUTTLE_RIDE_STATUS_LABEL.requested },
              { id: 'confirmed', label: SHUTTLE_RIDE_STATUS_LABEL.confirmed },
              { id: 'completed', label: SHUTTLE_RIDE_STATUS_LABEL.completed },
              { id: 'cancelled', label: SHUTTLE_RIDE_STATUS_LABEL.cancelled },
            ]}
            active={statusFilter}
            onChange={(id) => setStatusFilter(id)}
            activeClassName="bg-orange-600 text-white"
          />
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={`${labels.customer.singular}·주소 검색`}
            className="w-full sm:flex-1 sm:max-w-xs"
          />
        </FilterBar>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Bus className="w-10 h-10" />}
            title="차량 운행 신청이 없습니다"
            description="학부모가 앱에서 신청하거나, 여기서 직접 등록할 수 있습니다."
            action={
              students.length > 0 ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  운행 등록
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
                    <p className="text-xs text-slate-700 mt-1 font-semibold">
                      {formatShuttleDirection(item.direction)} · {item.addressLabel}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formatPickupAddressLine({
                        id: item.pickupAddressId || item.id,
                        label: item.addressLabel,
                        address: item.address,
                        detail: item.addressDetail,
                        shuttleDirection: item.direction,
                      })}
                      {item.guardianName ? ` · 신청 ${item.guardianName}` : ''}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${statusTone(item.status)}`}
                  >
                    {SHUTTLE_RIDE_STATUS_LABEL[item.status]}
                  </span>
                </div>
                {item.note && (
                  <p className="text-xs text-slate-600 leading-relaxed">메모: {item.note}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {item.status === 'requested' && (
                    <button
                      type="button"
                      onClick={() => confirmRide(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-sky-50 text-sky-700 text-xs font-bold hover:bg-sky-100"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      운행 확정
                    </button>
                  )}
                  {(item.status === 'requested' || item.status === 'confirmed') && (
                    <button
                      type="button"
                      onClick={() => completeRide(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      운행 완료
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold text-orange-700 hover:bg-orange-50"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                    aria-label="차량 운행 신청 삭제"
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
        title={editing ? '차량 운행 수정' : '차량 운행 등록'}
      >
        <form onSubmit={handleSave} className="space-y-4 p-5">
          <FormField label={labels.customer.singular} required>
            <select
              required
              value={form.studentId}
              onChange={(e) => applyStudentAddress(e.target.value)}
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
          <FormField label="운행 구분" required>
            <select
              required
              value={form.direction}
              onChange={(e) =>
                setForm({ ...form, direction: e.target.value as ShuttleDirection })
              }
              className={FORM_CONTROL_CLASS}
            >
              {SHUTTLE_DIRECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="주소 이름" required>
            <input
              required
              value={form.addressLabel}
              onChange={(e) => setForm({ ...form, addressLabel: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="예: 집"
            />
          </FormField>
          <FormField label="승하차 주소" required>
            <input
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="도로명 주소"
            />
          </FormField>
          <FormField label="상세 주소">
            <input
              value={form.addressDetail}
              onChange={(e) => setForm({ ...form, addressDetail: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="동·호수 등"
            />
          </FormField>
          <FormField label="신청 보호자">
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
              placeholder="예: 오늘만 할머니댁으로 하원"
            />
          </FormField>
          <p className="text-[11px] text-slate-400">
            선택한 날짜: {selectedDate} · {SHUTTLE_DIRECTION_LABEL[form.direction]}
          </p>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold"
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
