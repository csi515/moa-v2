import { useMemo, useState, type FormEvent } from 'react';
import { StorageService } from '@/services/storage';
import { useStorageRefresh } from '@/hooks';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import type { Student } from '@/types';
import type { IndustryType } from '@/core/industry/types';
import { CheckCircle2, AlertCircle, Award, Plus } from 'lucide-react';
import { Section } from './shared';
import { StudentStampBoard } from '@/industries/piano/components/songProgress';

export function ParentProgressView({
  student,
  organizationId,
  industryType = 'piano',
  readOnly = false,
  showToast,
  onRefresh,
}: {
  student: Student;
  organizationId?: string;
  industryType?: IndustryType;
  readOnly?: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onRefresh?: () => void;
}) {
  const { currentUser } = useApp();
  const refreshKey = useStorageRefresh();
  const levels = StorageService.getCurriculumLevels();
  const items = StorageService.getCurriculumItems();
  const progress = StorageService.getCurriculumProgress(student.id);
  const achievements = StorageService.getAchievements(student.id);
  const practiceRecords = useMemo(
    () =>
      StorageService.getPracticeRecords()
        .filter((p) => p.studentId === student.id)
        .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')),
    [student.id, refreshKey]
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    minutes: 30,
    songTitle: '',
    homework: '',
    note: '',
  });

  const studentLevel = levels.find((l) => l.name === student.level) || levels[0];
  const levelItems = studentLevel ? items.filter((i) => i.levelId === studentLevel.id) : [];
  const showSongStamps = industryType === 'piano' && Boolean(organizationId);

  const openCreate = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      minutes: 30,
      songTitle: '',
      homework: '',
      note: '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!form.songTitle.trim()) {
      showToast?.('연습한 곡·교재를 입력해 주세요.', 'error');
      return;
    }
    StorageService.savePracticeRecord({
      studentId: student.id,
      studentName: student.name,
      date: form.date,
      minutes: Math.max(5, Number(form.minutes) || 30),
      songTitle: form.songTitle.trim(),
      homework: form.homework.trim() || undefined,
      difficultyPart: form.note.trim() || undefined,
      source: 'parent',
      staffReviewed: false,
    });
    showToast?.(
      `${currentUser.name || '학부모'}님, 연습 일지를 등록했습니다. 선생님이 확인합니다.`,
      'success'
    );
    setIsModalOpen(false);
    onRefresh?.();
  };

  return (
    <div className="space-y-4">
      {showSongStamps && organizationId && (
        <StudentStampBoard
          organizationId={organizationId}
          customerId={student.id}
          studentName={student.name}
          boardSize={20}
          canRequest={!readOnly}
          onToast={showToast}
        />
      )}

      <Section title={`커리큘럼 진도 (${student.level || '미설정'})`}>
        {levelItems.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">등록된 커리큘럼이 없습니다.</p>
        ) : (
          levelItems.map((item) => {
            const prog = progress.find((p) => p.curriculumItemId === item.id);
            const status = prog?.status || 'not_started';
            return (
              <div key={item.id} className="flex items-center gap-2 py-2 border-b border-slate-50 text-sm">
                {status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : status === 'in_progress' ? (
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <span className={status === 'completed' ? 'line-through text-slate-400' : ''}>
                  {item.title}
                </span>
              </div>
            );
          })
        )}
      </Section>

      <Section title="시험·콩쿠르·등급">
        {achievements.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">기록이 없습니다.</p>
        ) : (
          achievements.map((a) => (
            <div key={a.id} className="py-2 border-b border-slate-50">
              <div className="flex items-start gap-2">
                <Award className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-sm">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    {a.eventDate} · {a.result || a.type}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </Section>

      <Section title="연습 일지">
        {!readOnly && (
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              연습 기록
            </button>
          </div>
        )}
        {practiceRecords.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">연습 기록이 없습니다.</p>
        ) : (
          practiceRecords.slice(0, 12).map((p) => (
            <div key={p.id} className="py-2.5 border-b border-slate-50 text-sm space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-400 font-mono">
                  {p.date} · {p.minutes}분
                  {p.source === 'parent' ? ' · 가정' : ''}
                </p>
                {p.source === 'parent' && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      p.staffReviewed
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {p.staffReviewed ? '선생님 확인' : '확인 대기'}
                  </span>
                )}
              </div>
              <p className="font-semibold text-slate-800">{p.songTitle || p.homework || '연습'}</p>
              {p.staffReviewNote && (
                <p className="text-xs text-indigo-700">피드백: {p.staffReviewNote}</p>
              )}
              {p.teacherEvaluation && p.staffReviewed && (
                <p className="text-xs text-amber-600">{p.teacherEvaluation}</p>
              )}
            </div>
          ))
        )}
      </Section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="가정 연습 일지">
        <form onSubmit={handleSave} className="space-y-4 p-5">
          <FormField label="연습일" required>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <FormField label="연습 시간(분)" required>
            <input
              type="number"
              min={5}
              max={300}
              step={5}
              required
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <FormField label="연습 곡·교재" required>
            <input
              required
              value={form.songTitle}
              onChange={(e) => setForm({ ...form, songTitle: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="예: 하농 1번, 체르니 30번"
            />
          </FormField>
          <FormField label="과제 연계">
            <input
              value={form.homework}
              onChange={(e) => setForm({ ...form, homework: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="이번 주 과제와 연결"
            />
          </FormField>
          <FormField label="메모">
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={FORM_CONTROL_CLASS}
              placeholder="어려웠던 부분 등"
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
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              등록
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
