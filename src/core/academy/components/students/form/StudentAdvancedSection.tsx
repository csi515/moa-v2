import React from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { usePermissions } from '@/core/auth/usePermissions';
import { useModuleLabels } from '@/core/labels';
import { getStudentLevelLabel, getStudentLevelOptions } from '@/core/students/levelOptions';
import type { ClassItem, Teacher } from '@/types';
import type { StudentFormData } from './studentFormTypes';

interface Props {
  formData: StudentFormData;
  teachers: Teacher[];
  classes: ClassItem[];
  showAdvanced: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<StudentFormData>) => void;
}

export const StudentAdvancedSection: React.FC<Props> = ({
  formData,
  teachers,
  classes,
  showAdvanced,
  onToggle,
  onChange,
}) => {
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const levelOptions = getStudentLevelOptions(industry);
  const levelLabel = getStudentLevelLabel(industry);
  const serviceLabel = labels.service.singular;
  const isPiano = industry === 'piano';

  const toggleClass = (classId: string) => {
    const next = formData.classIds.includes(classId)
      ? formData.classIds.filter((id) => id !== classId)
      : [...formData.classIds, classId];
    onChange({ classIds: next });
  };

  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-600 min-h-[44px]"
      >
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          {isPiano ? `수업 · 수강료` : '수업·수강료 (선택)'}
        </span>
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showAdvanced && (
        <div className="mt-3 space-y-4 pt-3 border-t border-slate-100">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              수업 정보
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
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-500">
                  {serviceLabel} 배정
                </label>
                {isPiano && (
                  <p className="text-[10px] text-slate-400 -mt-1 mb-1">
                    선택한 {serviceLabel}이(가) 시간표·일정에 반영됩니다. 나중에 추가해도 됩니다.
                  </p>
                )}
                {classes.length === 0 ? (
                  <p className="text-xs text-slate-400 px-1">
                    등록된 {serviceLabel}이(가) 없습니다. 먼저 {serviceLabel}을(를) 추가하세요.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {classes.map((cls) => {
                      const active = formData.classIds.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleClass(cls.id)}
                          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          {cls.name}
                          <span className="block text-[10px] font-medium opacity-80 mt-0.5">
                            {cls.daysOfWeek.join('')} {cls.startTime}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              수강료 정보
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  수강 형태
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
                        className={`min-h-[52px] rounded-xl border px-3 py-2 text-left transition-colors ${
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
                      정규 수업 수강료
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
                </>
              ) : (
                <p className="sm:col-span-2 text-xs text-slate-500 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
                  회차권 {labels.customer.singular}은 월 청구서가 자동 생성되지 않습니다. 설정 &gt;
                  회차권 관리에서 이용권을 발급하세요. 출석 시 1회 차감됩니다.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
