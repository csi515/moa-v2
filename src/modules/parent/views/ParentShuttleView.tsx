import { useMemo, useState, type FormEvent } from 'react';
import { Bus, Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { useStorageRefresh } from '@/hooks';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import type { Student } from '@/types';
import {
  SHUTTLE_DIRECTION_OPTIONS,
  SHUTTLE_RIDE_STATUS_LABEL,
  formatPickupAddressLine,
  formatShuttleDirection,
  getDefaultPickupAddress,
  type ShuttleDirection,
  type ShuttleRideRequest,
} from '@/core/transport';
import { Section } from './shared';

export function ParentShuttleView({
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

  const addresses = student.pickupAddresses || [];
  const defaultAddr = getDefaultPickupAddress(student);

  const [form, setForm] = useState({
    rideDate: new Date().toISOString().slice(0, 10),
    direction: (defaultAddr?.shuttleDirection || 'both') as ShuttleDirection,
    pickupAddressId: defaultAddr?.id || '',
    addressLabel: defaultAddr?.label || '집',
    address: defaultAddr?.address || '',
    addressDetail: defaultAddr?.detail || '',
    note: '',
  });

  const requests = useMemo(
    () =>
      StorageService.getShuttleRideRequests()
        .filter((r) => r.studentId === student.id)
        .sort(
          (a, b) =>
            b.rideDate.localeCompare(a.rideDate) || b.updatedAt.localeCompare(a.updatedAt)
        ),
    [student.id, refreshKey]
  );

  const applyAddressId = (id: string) => {
    const addr = addresses.find((a) => a.id === id);
    if (!addr) {
      setForm((prev) => ({ ...prev, pickupAddressId: id }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      pickupAddressId: id,
      addressLabel: addr.label,
      address: addr.address,
      addressDetail: addr.detail || '',
      direction: addr.shuttleDirection || prev.direction,
    }));
  };

  const openCreate = () => {
    const addr = getDefaultPickupAddress(student);
    setForm({
      rideDate: new Date().toISOString().slice(0, 10),
      direction: addr?.shuttleDirection || 'both',
      pickupAddressId: addr?.id || '',
      addressLabel: addr?.label || '집',
      address: addr?.address || student.address || '',
      addressDetail: addr?.detail || '',
      note: '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!form.address.trim()) {
      showToast('승하차 주소를 입력해 주세요.', 'error');
      return;
    }
    StorageService.saveShuttleRideRequest({
      studentId: student.id,
      studentName: student.name,
      rideDate: form.rideDate,
      direction: form.direction,
      addressLabel: form.addressLabel.trim() || '주소',
      address: form.address.trim(),
      addressDetail: form.addressDetail.trim() || undefined,
      pickupAddressId: form.pickupAddressId || undefined,
      guardianName: currentUser.name,
      note: form.note.trim() || undefined,
      status: 'requested',
    });
    showToast('차량 운행을 신청했습니다. 체육관에서 확인 후 확정합니다.', 'success');
    setIsModalOpen(false);
    onRefresh();
  };

  const cancelRequest = (item: ShuttleRideRequest) => {
    openConfirmDialog({
      title: '차량 운행 신청 취소',
      message: `${item.rideDate} 운행 신청을 취소할까요?`,
      isDestructive: true,
      confirmText: '취소하기',
      onConfirm: () => {
        StorageService.saveShuttleRideRequest({
          ...item,
          status: 'cancelled',
        });
        showToast('차량 운행 신청을 취소했습니다.', 'info');
        onRefresh();
      },
    });
  };

  const statusTone = (status: ShuttleRideRequest['status']) => {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
    if (status === 'confirmed') return 'bg-sky-50 text-sky-700';
    if (status === 'cancelled') return 'bg-slate-100 text-slate-500';
    return 'bg-amber-50 text-amber-800';
  };

  return (
    <>
      <Section title={`${student.name} 차량 운행`}>
        {!student.usesShuttleService && (
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            회원 정보에 셔틀 이용이 등록되어 있지 않아도 신청할 수 있습니다. 주소가 다르면
            아래에서 수정해 주세요.
          </p>
        )}
        {!readOnly && (
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-orange-600 text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              운행 신청
            </button>
          </div>
        )}
        {requests.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Bus className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-400">신청 내역이 없습니다</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.rideDate}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {formatShuttleDirection(item.direction)} · {item.addressLabel}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formatPickupAddressLine({
                        id: item.id,
                        label: item.addressLabel,
                        address: item.address,
                        detail: item.addressDetail,
                        shuttleDirection: item.direction,
                      })}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${statusTone(item.status)}`}
                  >
                    {SHUTTLE_RIDE_STATUS_LABEL[item.status]}
                  </span>
                </div>
                {item.note && <p className="text-xs text-slate-500">메모: {item.note}</p>}
                {!readOnly && item.status === 'requested' && (
                  <button
                    type="button"
                    onClick={() => cancelRequest(item)}
                    className="text-xs font-bold text-rose-600 min-h-[44px] px-2"
                  >
                    신청 취소
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="차량 운행 신청">
        <form onSubmit={handleSave} className="space-y-4 p-5">
          <FormField label="운행일" required>
            <input
              type="date"
              required
              value={form.rideDate}
              onChange={(e) => setForm({ ...form, rideDate: e.target.value })}
              className={FORM_CONTROL_CLASS}
            />
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
          {addresses.length > 0 && (
            <FormField label="등록 주소">
              <select
                value={form.pickupAddressId}
                onChange={(e) => applyAddressId(e.target.value)}
                className={FORM_CONTROL_CLASS}
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} — {a.address}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label="주소 이름" required>
            <input
              required
              value={form.addressLabel}
              onChange={(e) => setForm({ ...form, addressLabel: e.target.value })}
              className={FORM_CONTROL_CLASS}
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
            />
          </FormField>
          <FormField label="메모">
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="예: 오늘은 학교 앞으로 픽업"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              닫기
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-orange-600 text-white text-xs font-bold"
            >
              신청하기
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
