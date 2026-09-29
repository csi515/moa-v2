import { useMemo, useState, type FC, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { Modal } from '@/shared/components';
import { notifyBookingChange } from '@/core/academy/services/academyAlertService';
import { PICKUP_OUTSIDE_LABEL, type AuthorizedPickup } from '../types';
import type { TodayCareClose } from '../dailyClose';

const COPY = {
  title: '하원 인수',
  empty: '오늘 하원 대기 원아가 없습니다.',
  handoff: '인수',
  done: '하원 완료',
  picker: '인수자',
  relation: '관계',
  outside: PICKUP_OUTSIDE_LABEL,
  save: '하원 기록',
  saved: '하원을 기록했습니다.',
  needName: '인수자 이름을 입력해 주세요.',
} as const;

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export const PickupHandoffPanel: FC<{ close: TodayCareClose }> = ({ close }) => {
  const { showToast, currentUser } = useApp();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [pickerName, setPickerName] = useState('');
  const [relation, setRelation] = useState('');
  const [outsideConsent, setOutsideConsent] = useState(false);

  const student = close.awaitingPickup.find((item) => item.id === studentId) || null;
  const allowed = useMemo(() => {
    if (!student) return [] as AuthorizedPickup[];
    return (
      StorageService.getChildLegalRecords().find((record) => record.studentId === student.id)
        ?.authorizedPickups.filter((person) => person.name.trim()) || []
    );
  }, [student]);

  const doneToday = useMemo(
    () =>
      StorageService.getCarePickupLogs().filter((log) => log.pickupDate === close.today),
    [close.today, close.awaitingPickup.length]
  );

  const open = (id: string) => {
    setStudentId(id);
    setPickerName('');
    setRelation('');
    setOutsideConsent(false);
  };

  const chooseAllowed = (person: AuthorizedPickup) => {
    setPickerName(person.name);
    setRelation(person.relation);
    setOutsideConsent(false);
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!student) return;
    if (!pickerName.trim()) {
      showToast(COPY.needName, 'error');
      return;
    }
    const pickedUpAt = new Date().toISOString();
    const name = pickerName.trim();
    const relationText = relation.trim();
    StorageService.saveCarePickupLog({
      studentId: student.id,
      studentName: student.name,
      pickupDate: close.today,
      pickedUpAt,
      pickerName: name,
      relation: relationText,
      outsideConsent,
      teacherId: currentUser.staffId || undefined,
      teacherName: currentUser.name,
    });
    notifyBookingChange({
      studentId: student.id,
      studentName: student.name,
      parentPhone: student.parentPhone || student.phone,
      title: '하원',
      message: `${student.name} 하원. 인수 ${name}${relationText ? `(${relationText})` : ''}${outsideConsent ? ` · ${COPY.outside}` : ''}.`,
      date: close.today,
      portalTab: 'home',
    });
    showToast(COPY.saved, 'success');
    setStudentId(null);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <p className="text-xs font-bold text-slate-500">{COPY.title}</p>
      {close.awaitingPickup.length === 0 ? (
        <p className="text-sm text-slate-400">{COPY.empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {close.awaitingPickup.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => open(item.id)}
              className="px-3 py-2 min-h-[44px] rounded-xl border border-sky-200 text-xs font-bold text-sky-800"
            >
              {item.name} {COPY.handoff}
            </button>
          ))}
        </div>
      )}
      {doneToday.length > 0 && (
        <ul className="space-y-1">
          {doneToday.map((log) => (
            <li key={log.id} className="text-[11px] text-slate-500">
              {COPY.done} · {log.studentName} {formatTime(log.pickedUpAt)} {log.pickerName}
              {log.outsideConsent ? ` · ${COPY.outside}` : ''}
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={Boolean(student)}
        onClose={() => setStudentId(null)}
        title={student ? `${student.name} ${COPY.title}` : COPY.title}
      >
        <form onSubmit={handleSave} className="space-y-3">
          {allowed.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allowed.map((person) => (
                <button
                  key={`${person.name}-${person.phone}`}
                  type="button"
                  onClick={() => chooseAllowed(person)}
                  className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold"
                >
                  {person.name}
                  {person.relation ? ` · ${person.relation}` : ''}
                </button>
              ))}
            </div>
          )}
          <FormField label={COPY.picker}>
            <input
              className={FORM_CONTROL_CLASS}
              value={pickerName}
              onChange={(event) => setPickerName(event.target.value)}
              required
            />
          </FormField>
          <FormField label={COPY.relation}>
            <input
              className={FORM_CONTROL_CLASS}
              value={relation}
              onChange={(event) => setRelation(event.target.value)}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-slate-700 min-h-[44px]">
            <input
              type="checkbox"
              checked={outsideConsent}
              onChange={(event) => setOutsideConsent(event.target.checked)}
            />
            {COPY.outside}
          </label>
          <button
            type="submit"
            className="w-full min-h-[44px] rounded-xl bg-sky-600 text-white text-sm font-bold"
          >
            {COPY.save}
          </button>
        </form>
      </Modal>
    </div>
  );
};
