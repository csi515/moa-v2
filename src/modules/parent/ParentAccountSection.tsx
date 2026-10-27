import { useEffect, useState, type FC, type FormEvent } from 'react';
import { AccountDeletionCard } from '@/core/account';
import { LegalLinks } from '@/core/legal';
import { useParentPortal } from '@/core/parent/context/ParentPortalContext';
import { updateMyParentPhone } from '@/core/parent/services/parentPortalService';
import { useApp } from '@/context/AppContext';
import { getCustomerLabel, getOwnerLabel, getPlaceLabel } from '@/core/industry/industryUi';
import type { IndustryType } from '@/core/industry/types';

/** 학부모 포털 공통 계정·법적 고지 영역 */
export const ParentAccountSection: FC<{ industryType?: IndustryType | string }> = ({
  industryType,
}) => {
  const placeLabel = getPlaceLabel(industryType);
  const ownerLabel = getOwnerLabel(industryType);
  const customerLabel = getCustomerLabel(industryType);
  const accountDescription = `계정을 삭제하면 로그인 정보와 포털 연결이 제거됩니다. ${placeLabel}에 등록된 ${customerLabel} 정보는 ${placeLabel} 데이터로 남을 수 있습니다.`;
  const { portalTree, refreshPortalTree } = useParentPortal();
  const { showToast } = useApp();
  const [phone, setPhone] = useState(portalTree?.parent?.phone ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPhone(portalTree?.parent?.phone ?? '');
  }, [portalTree?.parent?.phone]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMyParentPhone(phone);
      await refreshPortalTree();
      showToast('연락처를 저장했습니다', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '연락처 저장에 실패했습니다', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pt-6 border-t border-slate-200">
      <form onSubmit={(e) => void handleSave(e)} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div>
          <p className="text-sm font-bold text-slate-900">보호자 연락처</p>
          <p className="text-xs text-slate-500 mt-1">
            {placeLabel} 등록 요청 시 {ownerLabel}이(가) 이 번호로 연락합니다.
          </p>
        </div>
        <label className="block text-xs font-semibold text-slate-700" htmlFor="parent-phone">
          연락처
        </label>
        <input
          id="parent-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl min-h-[44px]"
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] disabled:opacity-50"
        >
          {saving ? '저장 중...' : '연락처 저장'}
        </button>
      </form>
      <AccountDeletionCard description={accountDescription} />
      <LegalLinks />
    </div>
  );
};
