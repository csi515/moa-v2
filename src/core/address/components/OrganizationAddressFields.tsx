import { useState, type FC } from 'react';
import { Search } from 'lucide-react';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { AddressSearchModal } from './AddressSearchModal';
import type { AddressSearchResult, OrganizationAddressValue } from '../types';

interface OrganizationAddressFieldsProps {
  value: OrganizationAddressValue;
  onChange: (next: OrganizationAddressValue) => void;
  required?: boolean;
  label?: string;
}

export const OrganizationAddressFields: FC<OrganizationAddressFieldsProps> = ({
  value,
  onChange,
  required = false,
  label = '사업장 주소',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasAddress = value.roadAddress.trim().length > 0;

  const handleSelect = (result: AddressSearchResult) => {
    onChange({
      roadAddress: result.roadAddress,
      addressDetail: value.addressDetail,
      postal: result.postal,
      sido: result.sido,
      sigungu: result.sigungu,
      dong: result.dong,
      jibun: result.jibun,
    });
  };

  const handleRoadChange = (roadAddress: string) => {
    onChange({
      ...value,
      roadAddress,
      // 직접 수정 시 이전 검색 지역 정보는 더 이상 맞지 않을 수 있음
      postal: null,
      sido: null,
      sigungu: null,
      dong: null,
      jibun: null,
    });
  };

  return (
    <div className="space-y-3">
      <FormField label={label} required={required}>
        <div className="flex gap-2">
          <input
            type="text"
            value={value.roadAddress}
            onChange={(e) => handleRoadChange(e.target.value)}
            placeholder="주소 입력 또는 검색"
            className={`${FORM_CONTROL_CLASS} flex-1`}
            aria-label="소재지 주소"
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl min-h-[44px] min-w-[44px] shrink-0"
          >
            <Search className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline">검색</span>
          </button>
        </div>
        {value.postal ? (
          <p className="mt-1.5 text-xs text-slate-500">
            우편번호{' '}
            <span className="font-semibold text-slate-700 tabular-nums">{value.postal}</span>
          </p>
        ) : null}
      </FormField>

      <FormField label="상세주소 (선택)">
        <input
          type="text"
          value={value.addressDetail}
          onChange={(e) => onChange({ ...value, addressDetail: e.target.value })}
          disabled={!hasAddress}
          placeholder={hasAddress ? '예: 3층 301호' : '주소를 먼저 입력해 주세요'}
          className={`${FORM_CONTROL_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="상세주소"
        />
      </FormField>

      <AddressSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelect}
      />
    </div>
  );
};
