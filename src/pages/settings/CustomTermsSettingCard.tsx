import React, { useState, useEffect } from 'react';
import { BookOpen, RotateCcw, Save, CheckCircle2 } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  STANDARD_TERM_KEYS,
  DEFAULT_TERMS,
  PRESET_DEFAULT_TERMS,
  getResolvedTerm,
  type StandardTermKey,
} from '@/core/i18n/termEngine';
import { resolveIndustryId } from '@/core/industry/resolveIndustry';

const TERM_META: Record<StandardTermKey, { label: string; placeholder: string; helper: string }> = {
  'term.customer': {
    label: '고객 호칭',
    placeholder: '예: 원생, 회원, 수강생, 고객/차주',
    helper: '매장을 이용하는 대상을 부르는 공식 명칭입니다.',
  },
  'term.space': {
    label: '공간·좌석 호칭',
    placeholder: '예: 연습실, 타석, 시술대, 룸/좌석',
    helper: '예약이나 입실 대상이 되는 시설/공간 명칭입니다.',
  },
  'term.pass': {
    label: '이용권·수강권 호칭',
    placeholder: '예: 수강권, 회원권, 회수권, 선불권',
    helper: '고객이 구매하고 차감하는 권종 명칭입니다.',
  },
  'term.instructor': {
    label: '담당자·강사 호칭',
    placeholder: '예: 선생님, 사범님, 트레이너, 디자이너',
    helper: '수업이나 시술을 지도하는 전문가 호칭입니다.',
  },
  'term.lesson': {
    label: '수업·서비스 호칭',
    placeholder: '예: 레슨, 수련, PT, 시술, 클래스',
    helper: '제공되는 핵심 교육/서비스의 명칭입니다.',
  },
  'term.tenant': {
    label: '사업장·모임 호칭',
    placeholder: '예: 우리 품앗이 모임, 학원, 매장',
    helper: '테넌트(사업장/모임)를 부르는 명칭입니다.',
  },
  'term.owner': {
    label: '대표·모임장 호칭',
    placeholder: '예: 모임장 (이번 달 방장), 원장, 대표',
    helper: '사업장 또는 모임을 운영하는 책임자 호칭입니다.',
  },
  'term.staff': {
    label: '직원·당번 호칭',
    placeholder: '예: 공동 당번 (요리 조), 직원, 스태프',
    helper: '운영을 돕는 실무 인력 호칭입니다.',
  },
  'term.billing': {
    label: '청구·정산 호칭',
    placeholder: '예: 재료비 1/N 정산, 수강료, 청구',
    helper: '비용 청구와 정산을 부르는 명칭입니다.',
  },
};

export const CustomTermsSettingCard: React.FC = () => {
  const { currentOrganization, customTerms, updateCustomTerms } = useOrganization();
  const industryType = resolveIndustryId(currentOrganization?.industry_type) ?? '';

  const [formTerms, setFormTerms] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setFormTerms(customTerms || {});
  }, [customTerms]);

  const handleChange = (key: StandardTermKey, value: string) => {
    setFormTerms((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetToPreset = () => {
    const presetDefaults = PRESET_DEFAULT_TERMS[industryType] || {};
    setFormTerms(presetDefaults as Record<string, string>);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanedTerms: Record<string, string> = {};
      for (const [k, v] of Object.entries(formTerms)) {
        const trimmed = (v || '').trim();
        if (trimmed) {
          cleanedTerms[k] = trimmed;
        }
      }
      await updateCustomTerms(cleanedTerms);
      setFormTerms(cleanedTerms);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // 실시간 미리보기용 단어 추출
  const sampleCustomer = getResolvedTerm('term.customer', formTerms, industryType);
  const sampleSpace = getResolvedTerm('term.space', formTerms, industryType);
  const samplePass = getResolvedTerm('term.pass', formTerms, industryType);
  const sampleInstructor = getResolvedTerm('term.instructor', formTerms, industryType);
  const sampleLesson = getResolvedTerm('term.lesson', formTerms, industryType);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-800" />
            <h3 className="text-lg font-bold text-slate-900">매장 맞춤 용어 사전 (Terminology)</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            사업주 매장 성격에 맞게 고객, 공간, 이용권 등의 화면 레이블을 실시간 치환합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToPreset}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>업종 기본값 복원</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>저장 완료!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>용어 설정 저장</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 실시간 문장 미리보기 */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1.5">
          <BookOpen className="w-4 h-4 text-slate-600" />
          <span>실시간 화면 문구 미리보기</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed font-medium">
          &quot;<span className="text-slate-900 font-bold underline underline-offset-2">{sampleCustomer}</span>님이{' '}
          <span className="text-slate-900 font-bold underline underline-offset-2">{sampleSpace}</span>에서{' '}
          <span className="text-slate-900 font-bold underline underline-offset-2">{samplePass}</span>(으)로{' '}
          <span className="text-slate-900 font-bold underline underline-offset-2">{sampleInstructor}</span>의{' '}
          <span className="text-slate-900 font-bold underline underline-offset-2">{sampleLesson}</span>을(를) 예약했습니다.&quot;
        </p>
      </div>

      {/* 5대 용어 인풋 필드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {STANDARD_TERM_KEYS.map((key) => {
          const meta = TERM_META[key];
          const currentVal = formTerms[key] ?? '';
          const placeholderVal = getResolvedTerm(key, undefined, industryType);

          return (
            <div key={key} className="space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>{meta.label}</span>
                <span className="text-[10px] text-slate-400 font-mono">기본: {placeholderVal}</span>
              </label>
              <input
                type="text"
                value={currentVal}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholderVal}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all placeholder:text-slate-300"
              />
              <p className="text-[11px] text-slate-400">{meta.helper}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
