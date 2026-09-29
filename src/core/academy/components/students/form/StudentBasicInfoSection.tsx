import React from 'react';
import { User } from 'lucide-react';
import type { StudentFormData } from './studentFormTypes';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { showSchoolFields } from '@/core/students/levelOptions';
import { BirthDateInput, FormField, FORM_CONTROL_CLASS, FORM_CONTROL_ERROR_CLASS } from '@/shared/components/ui';
import { STUDENT_FORM_FIELD_IDS } from './studentFormValidation';

interface Props {
  formData: StudentFormData;
  onChange: (patch: Partial<StudentFormData>) => void;
  nameError?: string;
}

export const StudentBasicInfoSection: React.FC<Props> = ({ formData, onChange, nameError }) => {
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular;
  const showSchool = showSchoolFields(industry);

  return (
    <section>
      <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <User className="w-3.5 h-3.5" /> {customerLabel} 기본정보
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField
          label={`${customerLabel} 이름`}
          htmlFor={STUDENT_FORM_FIELD_IDS.name}
          required
          error={nameError}
        >
          <input
            id={STUDENT_FORM_FIELD_IDS.name}
            type="text"
            required
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            autoComplete="name"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? `${STUDENT_FORM_FIELD_IDS.name}-error` : undefined}
            className={`${FORM_CONTROL_CLASS} min-h-[44px] ${nameError ? FORM_CONTROL_ERROR_CLASS : ''}`}
          />
        </FormField>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">성별</label>
          <select
            value={formData.gender}
            onChange={(e) => onChange({ gender: e.target.value as StudentFormData['gender'] })}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
          >
            <option value="">선택 안 함</option>
            <option value="M">남</option>
            <option value="F">여</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">생년월일</label>
          <BirthDateInput
            value={formData.birthDate}
            onChange={(birthDate) => onChange({ birthDate })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">연락처</label>
          <input
            type="tel"
            inputMode="tel"
            value={formData.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="선택"
            autoComplete="tel"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
          />
        </div>
        {showSchool && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">학교</label>
              <input
                type="text"
                placeholder="예: ○○초등학교"
                value={formData.school}
                onChange={(e) => onChange({ school: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">학년</label>
              <input
                type="text"
                placeholder="예: 3학년"
                value={formData.grade}
                onChange={(e) => onChange({ grade: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
              />
            </div>
          </>
        )}
        <div className={showSchool ? 'sm:col-span-2' : undefined}>
          <label className="block text-xs font-semibold text-slate-700 mb-1">등록일</label>
          <input
            type="date"
            value={formData.joinDate}
            onChange={(e) => onChange({ joinDate: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
          />
        </div>
      </div>
    </section>
  );
};
