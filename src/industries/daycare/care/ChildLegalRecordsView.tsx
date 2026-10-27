import { useMemo, useState, type FC, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { careStorage } from './careStorage';
import { EmptyState, Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { ClipboardList, Save } from 'lucide-react';
import { useModuleLabels } from '@/core/labels';
import type { AuthorizedPickup } from './types';
import { CHILD_RECORD_GAP_LABEL } from './types';
import { getChildRecordGaps } from './childRecordGaps';

const EMPTY_PICKUP: AuthorizedPickup = { name: '', relation: '', phone: '' };

function toDateInput(value?: string): string {
  return value?.slice(0, 10) || '';
}

export const ChildLegalRecordsView: FC = () => {
  const { showToast } = useApp();
  const { scopeStudents } = useStaffScope();
  const refreshKey = useStorageRefresh();
  const labels = useModuleLabels();

  const students = useMemo(
    () => scopeStudents(StorageService.getStudents()).filter((student) => student.status === 'active'),
    [scopeStudents, refreshKey]
  );
  const records = useMemo(() => careStorage.getChildLegalRecords(), [refreshKey]);
  const recordByStudent = useMemo(
    () => new Map<string, any>(records.map((record) => [record.studentId, record])),
    [records]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [form, setForm] = useState({
    vaccinationCheckedAt: '',
    healthCheckDate: '',
    allergyNote: '',
    pickups: [EMPTY_PICKUP] as AuthorizedPickup[],
  });

  const year = new Date().getFullYear();
  const q = searchQuery.trim().toLowerCase();
  const visibleStudents = useMemo(
    () => students.filter((student) => !q || student.name.toLowerCase().includes(q)),
    [students, q]
  );
  const missingStudents = useMemo(
    () =>
      visibleStudents.filter(
        (student) => getChildRecordGaps(recordByStudent.get(student.id), year).length > 0
      ),
    [visibleStudents, recordByStudent, year]
  );

  const openEdit = (nextStudentId: string) => {
    const record = recordByStudent.get(nextStudentId);
    setStudentId(nextStudentId);
    setForm({
      vaccinationCheckedAt: toDateInput(record?.vaccinationCheckedAt),
      healthCheckDate: toDateInput(record?.healthCheckDate),
      allergyNote: record?.allergyNote || '',
      pickups: record?.authorizedPickups.length ? record.authorizedPickups : [EMPTY_PICKUP],
    });
    setIsModalOpen(true);
  };

  const updatePickup = (index: number, patch: Partial<AuthorizedPickup>) => {
    setForm((prev) => ({
      ...prev,
      pickups: prev.pickups.map((person, i) => (i === index ? { ...person, ...patch } : person)),
    }));
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const student = students.find((item) => item.id === studentId);
    if (!student) {
      showToast(`${labels.customer.singular}을(를) 선택해 주세요.`, 'error');
      return;
    }
    const existing = recordByStudent.get(student.id);
    careStorage.saveChildLegalRecord({
      id: existing?.id,
      studentId: student.id,
      studentName: student.name,
      vaccinationCheckedAt: form.vaccinationCheckedAt || undefined,
      healthCheckDate: form.healthCheckDate || undefined,
      allergyNote: form.allergyNote.trim() || undefined,
      authorizedPickups: form.pickups,
    });
    showToast('아동 기록이 저장되었습니다.', 'success');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`${labels.customer.singular} 검색`}
            className={`${FORM_CONTROL_CLASS} w-full`}
            aria-label={`${labels.customer.singular} 검색`}
          />
        </div>

        {missingStudents.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/60">
            <p className="text-xs font-bold text-amber-800 mb-2">
              확인이 없는 {labels.customer.singular} {missingStudents.length}명
            </p>
            <div className="flex flex-wrap gap-2">
              {missingStudents.map((student) => {
                const gaps = getChildRecordGaps(recordByStudent.get(student.id), year);
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => openEdit(student.id)}
                    className="px-3 py-2 min-h-[44px] rounded-xl bg-white border border-amber-200 text-left"
                  >
                    <span className="block text-xs font-bold text-slate-800">{student.name}</span>
                    <span className="block text-[10px] text-amber-800">
                      {gaps.map((gap) => CHILD_RECORD_GAP_LABEL[gap]).join(' · ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {visibleStudents.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-10 h-10" />}
            title="표시할 원아가 없습니다"
            description="담당 원아가 있으면 예방접종·검진·귀가 동의를 남길 수 있습니다."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibleStudents.map((student) => {
              const record = recordByStudent.get(student.id);
              const gaps = getChildRecordGaps(record, year);
              return (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(student.id)}
                    className="w-full px-4 py-3 min-h-[44px] text-left hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">{student.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          gaps.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {gaps.length ? '확인 필요' : '확인 완료'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      예방접종 {toDateInput(record?.vaccinationCheckedAt) || '미확인'} · 검진{' '}
                      {toDateInput(record?.healthCheckDate) || '미확인'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      알레르기 {record?.allergyNote?.trim() || '미기재'} · 귀가{' '}
                      {record?.authorizedPickups.map((person) => person.name).join(', ') || '미등록'}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="아동 기록"
      >
        <form onSubmit={handleSave} className="space-y-3">
          <FormField label="예방접종 확인일">
            <input
              type="date"
              value={form.vaccinationCheckedAt}
              onChange={(e) => setForm((prev) => ({ ...prev, vaccinationCheckedAt: e.target.value }))}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <FormField label={`${year}년 건강검진일`}>
            <input
              type="date"
              value={form.healthCheckDate}
              onChange={(e) => setForm((prev) => ({ ...prev, healthCheckDate: e.target.value }))}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <FormField label="알레르기·특이질환">
            <textarea
              value={form.allergyNote}
              onChange={(e) => setForm((prev) => ({ ...prev, allergyNote: e.target.value }))}
              placeholder="없으면 없음"
              rows={3}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">데려갈 수 있는 보호자</p>
            {form.pickups.map((person, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={person.name}
                  onChange={(e) => updatePickup(index, { name: e.target.value })}
                  placeholder="이름"
                  className={FORM_CONTROL_CLASS}
                  aria-label={`보호자 ${index + 1} 이름`}
                />
                <input
                  value={person.relation}
                  onChange={(e) => updatePickup(index, { relation: e.target.value })}
                  placeholder="관계"
                  className={FORM_CONTROL_CLASS}
                  aria-label={`보호자 ${index + 1} 관계`}
                />
                <input
                  value={person.phone}
                  onChange={(e) => updatePickup(index, { phone: e.target.value })}
                  placeholder="전화"
                  inputMode="tel"
                  className={FORM_CONTROL_CLASS}
                  aria-label={`보호자 ${index + 1} 전화`}
                />
              </div>
            ))}
            {form.pickups.length < 3 && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, pickups: [...prev.pickups, EMPTY_PICKUP] }))}
                className="text-xs font-bold text-sky-700 min-h-[44px]"
              >
                보호자 추가
              </button>
            )}
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </form>
      </Modal>
    </div>
  );
};
