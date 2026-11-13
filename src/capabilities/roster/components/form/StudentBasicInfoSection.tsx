import React from 'react';
import { User, Calendar, GraduationCap } from 'lucide-react';
import type { StudentFormData } from './studentFormTypes';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { showSchoolFields } from '@/core/students/levelOptions';
import { BirthDateInput, FormField, FORM_CONTROL_CLASS, FORM_CONTROL_ERROR_CLASS } from '@/shared/components/ui';
import { STUDENT_FORM_FIELD_IDS } from './studentFormValidation';
import { formatSmartPhoneInput } from './studentSmartInputHelpers';

interface Props {
  formData: StudentFormData;
  onChange: (patch: Partial<StudentFormData>) => void;
  nameError?: string;
  showSchoolFields?: boolean;
  /**
   * 렌더링 모드:
   * - 'all' (기본): 이름 + 상세 신상정보 전체
   * - 'name-only': 필수 성명만 렌더링 (점진적 공개의 상단 필수 영역)
   * - 'details-only': 등록일, 생년월일, 성별, 학교, 학년 등 상세 영역만 렌더링
   */
  mode?: 'all' | 'name-only' | 'details-only';
}

export const StudentBasicInfoSection: React.FC<Props> = ({
  formData,
  onChange,
  nameError,
  showSchoolFields: _showSchoolProp,
  mode = 'all',
}) => {
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular;
  const showSchool = showSchoolFields(industry);

  // 1. 이름만 렌더링 (컴팩트 필수 모드)
  if (mode === 'name-only') {
    return (
      <section>
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
            placeholder={`${customerLabel} 이름 입력 (예: 김하은)`}
            className={`${FORM_CONTROL_CLASS} text-base font-semibold min-h-[46px] ${nameError ? FORM_CONTROL_ERROR_CLASS : ''}`}
          />
        </FormField>
      </section>
    );
  }

  // 2. 상세 신상 정보만 렌더링 (점진적 공개 토글 내부)
  if (mode === 'details-only') {
    return (
      <section className="space-y-3">
        <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" /> 학적 및 신상 정보
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">등록일</label>
            <input
              type="date"
              value={formData.joinDate}
              onChange={(e) => onChange({ joinDate: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">생년월일</label>
            <BirthDateInput
              value={formData.birthDate}
              onChange={(birthDate) => onChange({ birthDate })}
            />
          </div>
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
          {showSchool && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">학교</label>
                <input
                  type="text"
                  placeholder="예: 서울초등학교"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              본인 연락처 <span className="text-slate-400 font-normal text-[11px]">휴대폰이 있는 경우만 입력</span>
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={formData.phone}
              onChange={(e) => onChange({ phone: formatSmartPhoneInput(e.target.value) })}
              placeholder="010-0000-0000"
              autoComplete="tel"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
            />
          </div>
        </div>
      </section>
    );
  }

  // 3. 전체 렌더링 ('all' - 레거시 호환 및 단일 폼 모드)
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
            placeholder={`${customerLabel} 이름 입력`}
            className={`${FORM_CONTROL_CLASS} min-h-[44px] ${nameError ? FORM_CONTROL_ERROR_CLASS : ''}`}
          />
        </FormField>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">등록일</label>
          <input
            type="date"
            value={formData.joinDate}
            onChange={(e) => onChange({ joinDate: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">생년월일</label>
          <BirthDateInput
            value={formData.birthDate}
            onChange={(birthDate) => onChange({ birthDate })}
          />
        </div>
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
        {showSchool && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">학교</label>
              <input
                type="text"
                placeholder="예: 서울초등학교"
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
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            본인 연락처 <span className="text-slate-400 font-normal text-[11px]">휴대폰이 있는 경우만 입력</span>
          </label>
          <input
            type="tel"
            inputMode="tel"
            value={formData.phone}
            onChange={(e) => onChange({ phone: formatSmartPhoneInput(e.target.value) })}
            placeholder="010-0000-0000"
            autoComplete="tel"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
          />
        </div>
      </div>
    </section>
  );
};
