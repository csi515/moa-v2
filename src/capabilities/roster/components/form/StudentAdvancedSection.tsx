import React from 'react';
import { BookOpen, ChevronDown, ChevronUp, Music2 } from 'lucide-react';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import {
  PIANO_GENRE_PRESETS,
  toggleGenreSelection,
} from '../../helpers/studentWishlistHelpers';
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
import {
  TUITION_STEP_AMOUNTS,
  TUITION_DISCOUNT_PRESETS,
  applyTuitionStep,
  applyTuitionDiscount,
  PAYMENT_DAY_PRESETS,
} from './studentSmartInputHelpers';
import { MicroGuideTooltip } from '@/shared/components/ui';

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

              {/* 피아노 맞춤: 관심 음악 장르 & 배우고 싶은 곡 (위시리스트) */}
              <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>관심 음악 장르 & 배우고 싶은 곡 (레슨 맞춤)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">다중 선택 가능</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PIANO_GENRE_PRESETS.map((genre) => {
                    const isSelected = (formData.preferredGenres || []).includes(genre.label);
                    return (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => {
                          const nextGenres = toggleGenreSelection(formData.preferredGenres || [], genre.label);
                          onChange({ preferredGenres: nextGenres });
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {genre.emoji} {genre.label}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.wishlistSongs || ''}
                    onChange={(e) => onChange({ wishlistSongs: e.target.value })}
                    placeholder="배우고 싶은 곡명 입력 (예: 인생의 회전목마, 작은 별 변주곡)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[40px] placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              {feeInfoHeading}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center">
                  <span>{enrollmentModeLabel(industry)}</span>
                  <MicroGuideTooltip guideKey="session_pass" />
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
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center">
                      <span>{regularFeeLabel}</span>
                      <MicroGuideTooltip guideKey="regular_tuition" />
                    </label>
                    <CurrencyInput
                      value={formData.tuitionFee}
                      onChange={(val) => onChange({ tuitionFee: val })}
                    />
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold">간편 금액:</span>
                      {TUITION_STEP_AMOUNTS.map((step) => (
                        <button
                          key={step.value}
                          type="button"
                          onClick={() => {
                            const nextFee = applyTuitionStep(formData.tuitionFee, step.value);
                            onChange({ tuitionFee: nextFee });
                          }}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          {step.label}
                        </button>
                      ))}
                      <span className="text-[10px] text-slate-400 font-bold ml-1">형제 할인:</span>
                      {TUITION_DISCOUNT_PRESETS.map((discount) => (
                        <button
                          key={discount.value}
                          type="button"
                          onClick={() => {
                            const nextFee = applyTuitionDiscount(formData.tuitionFee, discount.value);
                            onChange({ tuitionFee: nextFee });
                          }}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-pointer"
                        >
                          {discount.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => onChange({ tuitionFee: 0 })}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-slate-200 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        초기화
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center">
                      <span>납부일</span>
                      <MicroGuideTooltip guideKey="payment_day" />
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
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold">자주 쓰는 일자:</span>
                      {PAYMENT_DAY_PRESETS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => onChange({ paymentDay: day })}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border transition-colors cursor-pointer ${
                            formData.paymentDay === day
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {day}일
                        </button>
                      ))}
                    </div>
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
                          <span className="font-bold text-indigo-950 inline-flex items-center">
                            <span>첫 달 {regularFeeLabel} 청구서 자동 발행하기</span>
                            <MicroGuideTooltip guideKey="auto_invoice" />
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
