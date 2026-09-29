import { useMemo, useState, type FC, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { Modal } from '@/shared/components/ui/Modal';
import { FormField, FORM_CONTROL_CLASS, FORM_CONTROL_ERROR_CLASS } from '@/shared/components/ui/FormField';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { coreScheduleService } from '../services/coreScheduleService';

interface CreateConsultationScheduleModalProps {
  defaultTitle?: string;
  defaultDurationMinutes?: number;
  onClose: () => void;
  onCreated?: () => void;
}

/** 단건 상담 bookable 일정 생성 */
export const CreateConsultationScheduleModal: FC<CreateConsultationScheduleModalProps> = ({
  defaultTitle = '상담',
  defaultDurationMinutes = 30,
  onClose,
  onCreated,
}) => {
  const { showToast, openConfirmDialog } = useApp();
  const { currentOrganization } = useOrganization();
  const today = useMemo(() => todayIsoLocal(), []);
  const [title, setTitle] = useState(defaultTitle);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('14:00');
  const [duration, setDuration] = useState(defaultDurationMinutes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dateError, setDateError] = useState('');

  const isDirty =
    !saved &&
    (title !== defaultTitle ||
      date !== today ||
      startTime !== '14:00' ||
      duration !== defaultDurationMinutes);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;
    if (!date || !startTime) {
      setDateError('날짜와 시작 시간을 입력하세요.');
      return;
    }
    setDateError('');

    const [h, m] = startTime.split(':').map(Number);
    const starts = new Date(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)),
      h,
      m,
      0,
      0
    );
    const ends = new Date(starts.getTime() + duration * 60 * 1000);

    setSaving(true);
    try {
      await coreScheduleService.createSchedule(currentOrganization.id, {
        title: title.trim() || defaultTitle,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        is_bookable: true,
        max_capacity: 1,
      });
      showToast('상담 일정을 등록했습니다.', 'success');
      setSaved(true);
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : '일정 등록에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="상담 일정 추가"
      intent="form"
      dirty={isDirty}
      confirmClose={(proceed) => {
        openConfirmDialog({
          title: '작성 중인 내용이 있습니다',
          message: '저장하지 않은 내용은 사라집니다. 닫을까요?',
          confirmText: '닫기',
          cancelText: '계속 작성',
          isDestructive: true,
          onConfirm: proceed,
        });
      }}
    >
        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">제목</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] text-sm rounded-xl border border-slate-200 bg-slate-50"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="날짜" htmlFor="consultation-date" required error={!date ? dateError : undefined}>
              <input
                id="consultation-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setDateError('');
                }}
                className={`${FORM_CONTROL_CLASS} min-h-[44px] ${!date && dateError ? FORM_CONTROL_ERROR_CLASS : ''}`}
                required
              />
            </FormField>
            <FormField label="시작" htmlFor="consultation-start" required error={!startTime ? dateError : undefined}>
              <input
                id="consultation-start"
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setDateError('');
                }}
                className={`${FORM_CONTROL_CLASS} min-h-[44px] ${!startTime && dateError ? FORM_CONTROL_ERROR_CLASS : ''}`}
                required
              />
            </FormField>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">상담 시간</span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2.5 min-h-[44px] text-sm rounded-xl border border-slate-200 bg-slate-50"
            >
              {[15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[44px] mt-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold inline-flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            등록
          </button>
        </form>
    </Modal>
  );
};
