import React from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { usePermissions } from '@/core/auth/usePermissions';
import { useModuleLabels } from '@/core/labels';
import { getStudentLevelLabel, getStudentLevelOptions } from '@/core/students/levelOptions';
import type { ClassItem, Teacher } from '@/types';
import {
  rosterAdvancedSectionTitle,
  rosterClassAssignHelper,
  rosterFeeInfoHeading,
  rosterRegularFeeLabel,
} from './rosterFormCopy';
import type { StudentFormData } from './studentFormTypes';
import { enrollmentModeLabel } from './enrollmentFormCopy';
import { StudentTimetableSlotPicker } from './StudentTimetableSlotPicker';

interface Props {
  formData: StudentFormData;
  teachers: Teacher[];
  classes: ClassItem[];
  students?: any[];
  showAdvanced: boolean;
  isEdit?: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<StudentFormData>) => void;
  currentStudentId?: string;
}

export const StudentAdvancedSection: React.FC<Props> = ({
  formData,
  teachers,
  classes,
  students,
  showAdvanced,
  isEdit = false,
  onToggle,
  onChange,
  currentStudentId,
}) => {
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const serviceLabel = labels.service.singular;
  const levelLabel = getStudentLevelLabel(industry);
  const levelOptions = getStudentLevelOptions(industry);

  const sectionTitle = rosterAdvancedSectionTitle(industry);
  const feeInfoHeading = rosterFeeInfoHeading(industry);
  const regularFeeLabel = rosterRegularFeeLabel(industry);
  const classAssignHelper = rosterClassAssignHelper(industry, serviceLabel);

  const handleClassChange = (newClassIds: string[]) => {
    onChange({ classIds: newClassIds });
  };

  return (
    <section className="border border-slate-200/80 rounded-2xl bg-white overflow-hidden shadow-2xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        aria-expanded={showAdvanced}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-bold text-slate-800">{sectionTitle}</span>
          <span className="text-[11px] text-slate-400">
            · {levelLabel}, 담당 {labels.staff.singular}, 시간표, {regularFeeLabel}
          </span>
        </div>
        {showAdvanced ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {showAdvanced && (
        <div className="p-4 pt-0 border-t border-slate-100 space-y-4">
          <div className="pt-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              학습 및 수업 배치
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  {levelLabel}
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => onChange({ level: e.target.value as StudentFormData['level'] })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                >
                  {levelOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  담당 {labels.staff.singular}
                </label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => onChange({ teacherId: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                >
                  <option value="">선택</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 수업 시간표(반) 스마트 배정 */}
              <div className="sm:col-span-2 space-y-2 pt-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  {serviceLabel} 시간표 바로 배정
                </label>
                <p className="text-[10px] text-slate-400 -mt-1 mb-1">
                  {classAssignHelper}
                </p>
                <StudentTimetableSlotPicker
                  classes={classes}
                  selectedClassIds={formData.classIds}
                  onChange={handleClassChange}
                  students={students}
                  serviceLabel={serviceLabel}
                  staffLabel={labels.staff.singular}
                  currentStudentId={currentStudentId}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              {feeInfoHeading}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  {enrollmentModeLabel(industry)}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: 'monthly' as const, label: '일반', hint: '매월 청구' },
                      { value: 'session_pass' as const, label: '회차권', hint: '출석 시 차감' },
                    ] as const
                  ).map((opt) => {
                    const active = formData.billingMode === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange({ billingMode: opt.value })}
                        className={`min-h-[52px] rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <span className="block text-sm font-bold">{opt.label}</span>
                        <span
                          className={`block text-[10px] mt-0.5 ${
                            active ? 'text-indigo-100' : 'text-slate-400'
                          }`}
                        >
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {formData.billingMode === 'monthly' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {regularFeeLabel}
                    </label>
                    <CurrencyInput
                      value={formData.tuitionFee}
                      onChange={(val) => onChange({ tuitionFee: val })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      납부일
                    </label>
                    <select
                      value={formData.paymentDay}
                      onChange={(e) => onChange({ paymentDay: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                    >
                      {[1, 5, 10, 15, 20, 25, 28].map((d) => (
                        <option key={d} value={d}>
                          매월 {d}일 납부
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 신규 등록 시 첫 달 수강료 청구서 자동 생성 체크박스 */}
                  {!isEdit && (
                    <div className="sm:col-span-2 pt-1">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/70 cursor-pointer hover:bg-indigo-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.autoCreateInvoice ?? true}
                          onChange={(e) => onChange({ autoCreateInvoice: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 shrink-0"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-indigo-950">
                            첫 달 {regularFeeLabel} 청구서 자동 발행하기
                          </span>
                          <span className="block text-[11px] text-indigo-800/80 mt-0.5">
                            원생 등록 완료 시 당월 청구서({Number(formData.tuitionFee || 0).toLocaleString()}원)를 즉시 생성하여 바로 현장 결제할 수 있습니다.
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <p className="sm:col-span-2 text-xs text-slate-500 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
                  회차권 {labels.customer.singular}은 월 청구서가 자동 생성되지 않습니다. 출석 시 1회 차감됩니다.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
