import { useMemo, useState, type FormEvent } from 'react';
import { StorageService } from '@/services/storage';
import { useStorageRefresh } from '@/hooks';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import type { Student } from '@/types';
import type { AuthorizedPickup } from '@/industries/daycare/care';
import { Section } from './shared';

const EMPTY_PICKUP: AuthorizedPickup = { name: '', relation: '', phone: '' };

const COPY = {
  title: '귀가 명단',
  allergy: '알레르기·특이질환',
  name: '이름',
  relation: '관계',
  phone: '연락처',
  add: '사람 추가',
  save: '저장',
  saved: '귀가 명단을 저장했습니다.',
  hint: '사진을 받지 않습니다. 원에서 하원 인수할 때 이 명단을 봅니다.',
} as const;

export function ParentPickupListView({
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
  const refreshKey = useStorageRefresh();
  const existing = useMemo(
    () => StorageService.getChildLegalRecords().find((record) => record.studentId === student.id),
    [student.id, refreshKey]
  );
  const [allergyNote, setAllergyNote] = useState(existing?.allergyNote || '');
  const [pickups, setPickups] = useState<AuthorizedPickup[]>(
    existing?.authorizedPickups.length ? existing.authorizedPickups : [EMPTY_PICKUP]
  );

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    StorageService.saveChildLegalRecord({
      id: existing?.id,
      studentId: student.id,
      studentName: student.name,
      vaccinationCheckedAt: existing?.vaccinationCheckedAt,
      healthCheckDate: existing?.healthCheckDate,
      allergyNote: allergyNote.trim() || undefined,
      authorizedPickups: pickups,
    });
    showToast(COPY.saved, 'success');
    onRefresh();
  };

  return (
    <Section title={`${student.name} ${COPY.title}`}>
      <p className="text-xs text-slate-500 mb-3">{COPY.hint}</p>
      <form onSubmit={handleSave} className="space-y-3">
        <FormField label={COPY.allergy}>
          <input
            className={FORM_CONTROL_CLASS}
            value={allergyNote}
            onChange={(event) => setAllergyNote(event.target.value)}
            disabled={readOnly}
          />
        </FormField>
        {pickups.map((person, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <FormField label={COPY.name}>
              <input
                className={FORM_CONTROL_CLASS}
                value={person.name}
                onChange={(event) =>
                  setPickups((prev) =>
                    prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item))
                  )
                }
                disabled={readOnly}
              />
            </FormField>
            <FormField label={COPY.relation}>
              <input
                className={FORM_CONTROL_CLASS}
                value={person.relation}
                onChange={(event) =>
                  setPickups((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, relation: event.target.value } : item
                    )
                  )
                }
                disabled={readOnly}
              />
            </FormField>
            <FormField label={COPY.phone}>
              <input
                className={FORM_CONTROL_CLASS}
                value={person.phone}
                onChange={(event) =>
                  setPickups((prev) =>
                    prev.map((item, i) => (i === index ? { ...item, phone: event.target.value } : item))
                  )
                }
                disabled={readOnly}
              />
            </FormField>
          </div>
        ))}
        {!readOnly && pickups.length < 3 && (
          <button
            type="button"
            onClick={() => setPickups((prev) => [...prev, EMPTY_PICKUP])}
            className="w-full min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
          >
            {COPY.add}
          </button>
        )}
        {!readOnly && (
          <button
            type="submit"
            className="w-full min-h-[44px] rounded-xl bg-sky-600 text-white text-sm font-bold"
          >
            {COPY.save}
          </button>
        )}
      </form>
    </Section>
  );
}
