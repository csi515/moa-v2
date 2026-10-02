import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { PageHeader, EmptyState, Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS, SegmentedControl } from '@/shared/components/ui';
import {
  BookOpen,
  Plus,
  Trash2,
  Save,
} from 'lucide-react';
import type { CareJournal, CareJournalMood } from './types';
import { CARE_JOURNAL_MOOD_LABEL } from './types';
import { CARE_JOURNAL_DEFAULTS } from './careDefaults';
import { CareDateSearchBar } from './components/CareDateSearchBar';
import { useModuleLabels } from '@/core/labels';
import { notifyBookingChange } from '@/capabilities/booking';
import { buildTodayCareClose } from './dailyClose';
import { peekCareFocus, requestCareFocus, subscribeCareFocus, takeCareFocus } from './careFocus';
import { DailyCloseList } from './components/DailyCloseList';

const MOOD_OPTIONS: CareJournalMood[] = ['good', 'normal', 'tired', 'sick'];

export const CareJournalView: FC = () => {
  const { showToast, openConfirmDialog, currentUser, setActiveTab } = useApp();
  const { scopeStudents } = useStaffScope();
  const refreshKey = useStorageRefresh();
  const labels = useModuleLabels();

  const students = useMemo(
    () => scopeStudents(StorageService.getStudents()).filter((s) => s.status === 'active'),
    [scopeStudents, refreshKey]
  );
  const journals = useMemo(() => StorageService.getCareJournals(), [refreshKey]);
  const today = new Date().toISOString().slice(0, 10);
  const close = useMemo(() => buildTodayCareClose(students, today), [students, today, refreshKey]);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CareJournal | null>(null);
  const [form, setForm] = useState({
    studentId: '',
    mood: 'good' as CareJournalMood,
    meals: '',
    nap: '',
    activities: '',
    bowel: '',
    healthNote: '',
    teacherNote: '',
  });

  const studentIds = useMemo(() => new Set(students.map((student) => student.id)), [students]);

  const dayJournals = useMemo(() => {
    return journals
      .filter((j) => j.journalDate === selectedDate && studentIds.has(j.studentId))
      .filter((j) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          j.studentName.toLowerCase().includes(q) ||
          j.teacherNote.toLowerCase().includes(q) ||
          j.activities.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'));
  }, [journals, selectedDate, searchQuery, studentIds]);

  const missingStudents = useMemo(() => {
    const written = new Set(
      journals
        .filter((journal) => journal.journalDate === selectedDate && studentIds.has(journal.studentId))
        .map((journal) => journal.studentId)
    );
    const q = searchQuery.trim().toLowerCase();
    return students
      .filter((student) => !written.has(student.id))
      .filter((student) => !q || student.name.toLowerCase().includes(q));
  }, [students, journals, selectedDate, studentIds, searchQuery]);

  const openCreate = (studentId?: string) => {
    const existing = studentId
      ? journals.find((journal) => journal.studentId === studentId && journal.journalDate === selectedDate)
      : undefined;
    if (existing) {
      openEdit(existing);
      return;
    }
    setEditing(null);
    setForm({
      studentId: studentId || students[0]?.id || '',
      mood: 'good',
      meals: CARE_JOURNAL_DEFAULTS.meals,
      nap: CARE_JOURNAL_DEFAULTS.nap,
      activities: CARE_JOURNAL_DEFAULTS.activities,
      bowel: '',
      healthNote: '',
      teacherNote: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (journal: CareJournal) => {
    setEditing(journal);
    setForm({
      studentId: journal.studentId,
      mood: journal.mood,
      meals: journal.meals,
      nap: journal.nap,
      activities: journal.activities,
      bowel: journal.bowel || '',
      healthNote: journal.healthNote || '',
      teacherNote: journal.teacherNote,
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
    if (!form.teacherNote.trim()) {
      showToast('선생님 한마디를 입력해 주세요.', 'error');
      return;
    }

    StorageService.saveCareJournal({
      id: editing?.id,
      studentId: student.id,
      studentName: student.name,
      journalDate: selectedDate,
      mood: form.mood,
      meals: form.meals,
      nap: form.nap,
      activities: form.activities,
      bowel: form.bowel || undefined,
      healthNote: form.healthNote || undefined,
      teacherNote: form.teacherNote.trim(),
      teacherId: currentUser.staffId || undefined,
      teacherName: currentUser.name,
    });
    notifyBookingChange({
      studentId: student.id,
      studentName: student.name,
      parentPhone: student.parentPhone || student.phone,
      title: '알림장',
      message: `${selectedDate} ${student.name} 알림장이 ${editing ? '수정' : '등록'}되었습니다.`,
      date: selectedDate,
      portalTab: 'journals',
    });
    showToast(editing ? '알림장이 수정되었습니다.' : '알림장이 등록되었습니다.', 'success');
    setIsModalOpen(false);
  };

  const [focusStudentId, setFocusStudentId] = useState<string | null>(null);

  useEffect(() => {
    const apply = () => {
      const pending = peekCareFocus();
      if (pending?.kind !== 'journal') return;
      takeCareFocus('journal');
      setSelectedDate(today);
      setFocusStudentId(pending.studentId);
    };
    apply();
    return subscribeCareFocus(apply);
  }, [today]);

  useEffect(() => {
    if (!focusStudentId || selectedDate !== today) return;
    openCreate(focusStudentId);
    setFocusStudentId(null);
  }, [focusStudentId, selectedDate, today]);

  const handleDelete = (journal: CareJournal) => {
    openConfirmDialog({
      title: '알림장 삭제',
      message: `${journal.studentName}의 ${journal.journalDate} 알림장을 삭제할까요?`,
      isDestructive: true,
      confirmText: '삭제',
      onConfirm: () => {
        StorageService.deleteCareJournal(journal.id);
        showToast('알림장이 삭제되었습니다.', 'info');
      },
    });
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<BookOpen className="w-6 h-6" />}
        iconClassName="text-sky-600"
        title="알림장"
        description="원아별 하루 생활·건강·활동을 보호자에게 전합니다"
        actions={
          <button
            type="button"
            onClick={() => openCreate()}
            disabled={students.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            알림장 작성
          </button>
        }
      />

      <DailyCloseList
        close={close}
        onWriteJournal={(studentId) => {
          setSelectedDate(today);
          openCreate(studentId);
        }}
        onOpenMedications={() => setActiveTab('medications')}
        onOpenMeals={() => requestCareFocus({ kind: 'records', ops: 'meals' })}
      />

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CareDateSearchBar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={`${labels.customer.singular}·내용 검색`}
        />

        {missingStudents.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/60">
            <p className="text-xs font-bold text-amber-800 mb-2">
              알림장 없는 {labels.customer.singular} {missingStudents.length}명
            </p>
            <div className="flex flex-wrap gap-2">
              {missingStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => openCreate(student.id)}
                  className="px-3 py-2 min-h-[44px] rounded-xl bg-white border border-amber-200 text-xs font-bold text-slate-800"
                >
                  {student.name} 작성
                </button>
              ))}
            </div>
          </div>
        )}

        {dayJournals.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-10 h-10" />}
            title="작성된 알림장이 없습니다"
            description="오늘 등원한 원아의 하루 생활을 남겨 보세요."
            action={
              students.length > 0 ? (
                <button
                  type="button"
                  onClick={() => openCreate()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  알림장 작성
                </button>
              ) : undefined
            }
            className="border-0 shadow-none rounded-none"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {dayJournals.map((journal) => (
              <div key={journal.id} className="p-4 sm:p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{journal.studentName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      기분 {CARE_JOURNAL_MOOD_LABEL[journal.mood]}
                      {journal.teacherName ? ` · ${journal.teacherName}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(journal)}
                      className="px-3 py-2 min-h-[44px] text-xs font-bold text-sky-700 hover:bg-sky-50 rounded-xl"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(journal)}
                      className="px-3 py-2 min-h-[44px] text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
                      aria-label="알림장 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{journal.teacherNote}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-500">
                  <p>
                    <span className="font-semibold text-slate-600">식사</span> {journal.meals || '-'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-600">낮잠</span> {journal.nap || '-'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-600">활동</span>{' '}
                    {journal.activities || '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? '알림장 수정' : '알림장 작성'}
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

          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">기분</p>
            <SegmentedControl
              value={form.mood}
              options={MOOD_OPTIONS.map((m) => ({ value: m, label: CARE_JOURNAL_MOOD_LABEL[m] }))}
              onChange={(mood) => setForm({ ...form, mood })}
              activeClassName="bg-sky-600 text-white"
              fullWidth
              aria-label="원아 기분"
            />
          </div>

          <FormField label="식사">
            <input
              value={form.meals}
              onChange={(e) => setForm({ ...form, meals: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="예: 점심 잘 먹음, 간식 일부"
            />
          </FormField>
          <FormField label="낮잠">
            <input
              value={form.nap}
              onChange={(e) => setForm({ ...form, nap: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="예: 40분 낮잠"
            />
          </FormField>
          <FormField label="활동">
            <input
              value={form.activities}
              onChange={(e) => setForm({ ...form, activities: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="예: 미술, 산책"
            />
          </FormField>
          <FormField label="배변 (선택)">
            <input
              value={form.bowel}
              onChange={(e) => setForm({ ...form, bowel: e.target.value })}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <FormField label="건강 메모 (선택)">
            <input
              value={form.healthNote}
              onChange={(e) => setForm({ ...form, healthNote: e.target.value })}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <FormField label="선생님 한마디" required>
            <textarea
              required
              rows={3}
              value={form.teacherNote}
              onChange={(e) => setForm({ ...form, teacherNote: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="보호자에게 전할 하루 요약"
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
