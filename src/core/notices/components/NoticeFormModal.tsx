import type { Dispatch, FC, FormEvent, SetStateAction } from 'react';
import { Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS, SegmentedControl } from '@/shared/components/ui';
import { FileText, Save, CheckCircle2 } from 'lucide-react';
import type { ClassItem, Student } from '@/types';
import type { ModuleLabels } from '@/core/labels';
import type { IndustryAccent } from '@/core/industry/pluginTypes';
import type { NoticeTemplate } from '../noticeTemplates';
import type { NoticeTargetMode, ParentNoticeKind } from '../types';

interface NoticeFormState {
  kind: ParentNoticeKind;
  title: string;
  message: string;
  targetMode: NoticeTargetMode;
  classId: string;
  studentId: string;
}

interface NoticeFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  form: NoticeFormState;
  setForm: Dispatch<SetStateAction<NoticeFormState>>;
  labels: ModuleLabels;
  accent: IndustryAccent;
  activeClassName: string;
  softHoverClass: string;
  templates: NoticeTemplate[];
  students: Student[];
  classes: ClassItem[];
  targetModeOptions: { value: NoticeTargetMode; label: string }[];
  recipientCount: number;
  onClose: () => void;
  onApplyTemplate: (id: string) => void;
  onSaveDraft: (e: FormEvent) => void;
  onPublish: (e?: FormEvent) => void | Promise<void>;
}

export const NoticeFormModal: FC<NoticeFormModalProps> = ({
  isOpen,
  isEditing,
  form,
  setForm,
  labels,
  accent,
  activeClassName,
  softHoverClass,
  templates,
  students,
  classes,
  targetModeOptions,
  recipientCount,
  onClose,
  onApplyTemplate,
  onSaveDraft,
  onPublish,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={isEditing ? '안내 수정' : '안내장 · 가정통신문 작성'}
    maxWidth="lg"
  >
    <form onSubmit={onPublish} className="space-y-4 p-5">
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2">유형</p>
        <SegmentedControl
          value={form.kind}
          options={[
            { value: 'announcement', label: '안내장' },
            { value: 'notice', label: '가정통신문' },
          ]}
          onChange={(kind) => setForm({ ...form, kind })}
          activeClassName={activeClassName}
          fullWidth
          aria-label="안내 유형"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2">빠른 템플릿</p>
        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onApplyTemplate(t.id)}
              className={`text-left p-3 min-h-[44px] rounded-xl border border-slate-200 transition-colors ${softHoverClass}`}
            >
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <FileText className={`w-3.5 h-3.5 ${accent.icon}`} />
                {t.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2">대상</p>
        <SegmentedControl
          value={form.targetMode}
          options={targetModeOptions}
          onChange={(targetMode) => setForm({ ...form, targetMode })}
          activeClassName={activeClassName}
          fullWidth
          aria-label="발송 대상"
        />
      </div>

      {form.targetMode === 'class' && (
        <FormField label={labels.service.singular} required>
          <select
            required
            value={form.classId}
            onChange={(e) => setForm({ ...form, classId: e.target.value })}
            className={FORM_CONTROL_CLASS}
          >
            {classes.length === 0 && (
              <option value="">등록된 {labels.service.singular} 없음</option>
            )}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
      )}

      {form.targetMode === 'student' && (
        <FormField label={labels.customer.singular} required>
          <select
            required
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            className={FORM_CONTROL_CLASS}
          >
            {students.length === 0 && (
              <option value="">등록된 {labels.customer.singular} 없음</option>
            )}
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <p className="text-[11px] text-slate-500">
        예상 대상 {recipientCount}명 · {labels.contact.singular} 포털에만 표시됩니다 (문자 발송
        없음)
      </p>

      <FormField label="제목" required>
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={FORM_CONTROL_CLASS}
          placeholder="예: 봄 행사 준비물 안내"
        />
      </FormField>

      <FormField label="내용" required>
        <textarea
          required
          rows={6}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={FORM_CONTROL_CLASS}
          placeholder={`${labels.contact.singular}에게 전할 내용을 입력하세요`}
        />
      </FormField>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
        >
          <Save className="w-4 h-4" />
          임시저장
        </button>
        <button
          type="submit"
          className={`inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl ${accent.btn} ${accent.btnHover} text-white text-xs font-bold`}
        >
          <CheckCircle2 className="w-4 h-4" />
          포털에 게시
        </button>
      </div>
    </form>
  </Modal>
);
