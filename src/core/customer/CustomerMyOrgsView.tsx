import { useState, type FC } from 'react';
import { Building2, ChevronRight, Coins } from 'lucide-react';
import { getIndustryLabel, normalizeIndustryType } from '@/core/industry/types';
import { CUSTOMER_MY_ORGS_COPY as COPY } from './customerMyOrgsCopy';
import { CustomerRetailPointsView } from './CustomerRetailPointsView';
import {
  getCustomerStatusLabel,
  type MyLinkedCustomerOrg,
} from './services/myLinkedCustomerOrgsService';

interface Props {
  organizations: MyLinkedCustomerOrg[];
  /** 카드 하단 여백 등 — 셸에서 감쌀 때 false */
  showHeader?: boolean;
  /** 포인트 상세 진입/이탈 시 (부모가 부가 UI 숨김용) */
  onPointsActiveChange?: (active: boolean) => void;
}

function isRetailOrg(industryType: string): boolean {
  return normalizeIndustryType(industryType) === 'retail';
}

/**
 * 일반 사용자 — Customer로 연결된 사업장 목록.
 * Retail이면 사업장별 포인트 조회로 진입(합산 없음).
 */
export const CustomerMyOrgsView: FC<Props> = ({
  organizations,
  showHeader = true,
  onPointsActiveChange,
}) => {
  const [pointsOrg, setPointsOrg] = useState<MyLinkedCustomerOrg | null>(null);

  const openPoints = (org: MyLinkedCustomerOrg) => {
    setPointsOrg(org);
    onPointsActiveChange?.(true);
  };

  const closePoints = () => {
    setPointsOrg(null);
    onPointsActiveChange?.(false);
  };

  if (pointsOrg) {
    return (
      <CustomerRetailPointsView organization={pointsOrg} onBack={closePoints} />
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div>
          <h2 className="text-base font-black text-slate-900">{COPY.title}</h2>
          <p className="text-xs text-slate-500 mt-1">{COPY.description}</p>
        </div>
      )}

      {organizations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto" aria-hidden />
          <p className="mt-3 text-sm font-bold text-slate-800">{COPY.emptyTitle}</p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            {COPY.emptyDescription}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {organizations.map((org) => {
            const status = getCustomerStatusLabel(org.customerStatus);
            const retail = isRetailOrg(org.industryType);
            return (
              <li
                key={org.customerId}
                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">
                      {org.organizationName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {COPY.industry} · {getIndustryLabel(org.industryType)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500">
                        {COPY.customerStatus}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>

                {retail && (
                  <button
                    type="button"
                    onClick={() => openPoints(org)}
                    className="w-full min-h-[48px] rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 flex items-center justify-between gap-2 text-left"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Coins className="w-4 h-4 text-teal-700 shrink-0" aria-hidden />
                      <span>
                        <span className="block text-sm font-bold text-teal-900">
                          {COPY.retailPoints}
                        </span>
                        <span className="block text-[11px] text-teal-700/80">
                          {COPY.retailPointsHint}
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-teal-600 shrink-0" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
