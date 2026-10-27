import React, { useEffect, useMemo, useState } from 'react';
import {
  calculateSettlement,
  type SettlementResult,
} from '@/domain/babyFood/babyFoodLogic';
import type { BabyProfile } from './BabyProfileCard';
import {
  AlertCircle,
  Calculator,
  CalendarDays,
  CheckCircle,
  Clock,
  Coins,
  Receipt,
  Users,
} from 'lucide-react';

export interface SettlementLedgerEntry extends SettlementResult {
  id: string;
  recordedAt: string; // ISO String
  title: string;
  cycle: string;
  participatingBabyNames: string[];
  status: 'settled' | 'pending';
}

export interface BabySettlementWidgetProps {
  participatingBabies?: BabyProfile[];
  initialExpense?: number;
  onRecordLedger?: (entry: SettlementLedgerEntry) => void;
  onExpenseChange?: (amount: number) => void;
}

export const BabySettlementWidget: React.FC<BabySettlementWidgetProps> = ({
  participatingBabies = [],
  initialExpense = 0,
  onRecordLedger,
  onExpenseChange,
}) => {
  const [totalExpenseInput, setTotalExpenseInput] = useState<string>(
    initialExpense > 0 ? initialExpense.toString() : ''
  );
  const [customBabyCount, setCustomBabyCount] = useState<number>(
    participatingBabies.length > 0 ? participatingBabies.length : 1
  );
  const [settlementCycle, setSettlementCycle] = useState<string>('주 1회 (화요일)');
  const [sessionTitle, setSessionTitle] = useState<string>('초기/중기 이유식 1차 품앗이');
  const [localLedger, setLocalLedger] = useState<SettlementLedgerEntry[]>([]);
  const [justRecordedNotice, setJustRecordedNotice] = useState<string | null>(null);

  // 참여 아기 수가 선택된 목록과 연동되는 경우
  const effectiveBabyCount =
    participatingBabies.length > 0
      ? participatingBabies.length
      : Math.max(1, customBabyCount);

  const numericExpense = useMemo(() => {
    const parsed = parseInt(totalExpenseInput.replace(/[^0-9]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [totalExpenseInput]);

  // 실시간 1/N 정산 계산 (순수 도메인 함수 호출)
  const settlement = useMemo(() => {
    return calculateSettlement(numericExpense, effectiveBabyCount);
  }, [numericExpense, effectiveBabyCount]);

  useEffect(() => {
    onExpenseChange?.(numericExpense);
  }, [numericExpense, onExpenseChange]);

  // 참여 아기들의 알레르기 수합
  const participatingAllergies = useMemo(() => {
    const list: string[] = [];
    participatingBabies.forEach((baby) => {
      if (baby.crm_tags) {
        baby.crm_tags.forEach((tag) => {
          if (
            tag.includes('알레르기') ||
            tag.includes('알러지') ||
            tag.includes('allergy') ||
            tag.includes('계란') ||
            tag.includes('우유')
          ) {
            list.push(`${baby.name}: ${tag}`);
          }
        });
      }
      if (baby.allergies) {
        baby.allergies.forEach((a) => {
          list.push(`${baby.name}: ${a}`);
        });
      }
    });
    return Array.from(new Set(list));
  }, [participatingBabies]);

  const handleExpenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    setTotalExpenseInput(rawVal);
  };

  const handleAddQuickExpense = (amount: number) => {
    const nextVal = numericExpense + amount;
    setTotalExpenseInput(nextVal.toString());
  };

  const handleResetExpense = () => {
    setTotalExpenseInput('0');
  };

  const handleSaveToLedger = () => {
    if (numericExpense <= 0) return;

    const babyNames =
      participatingBabies.length > 0
        ? participatingBabies.map((b) => b.name)
        : [`아기 ${effectiveBabyCount}명`];

    const entry: SettlementLedgerEntry = {
      ...settlement,
      id: `ledger-${Date.now()}`,
      recordedAt: new Date().toISOString(),
      title: sessionTitle.trim() || '이유식 재료비 품앗이 정산',
      cycle: settlementCycle,
      participatingBabyNames: babyNames,
      status: 'settled',
    };

    setLocalLedger((prev) => [entry, ...prev]);
    onRecordLedger?.(entry);

    setJustRecordedNotice(
      `'${entry.title}' 정산이 장부에 기록되었습니다. (1인당 ${entry.formattedPerPerson})`
    );
    setTimeout(() => {
      setJustRecordedNotice(null);
    }, 4000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* 위젯 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              이유식 재료비 1/N 자동 정산기
            </h3>
            <p className="text-xs text-slate-600">
              실시간 상태 연산 기반 품앗이 분담금 계산 및 장부 기록
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
          <Clock className="h-3.5 w-3.5" />
          {settlementCycle}
        </span>
      </div>

      {/* 설정 폼 영역 */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 모임명 및 주기 설정 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            모임명 / 회차
          </label>
          <input
            type="text"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="예: 10월 4주차 초기이유식 품앗이"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            모임 주기 설정
          </label>
          <div className="flex items-center gap-2">
            <select
              value={settlementCycle}
              onChange={(e) => setSettlementCycle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="주 1회 (화요일)">주 1회 (화요일)</option>
              <option value="주 1회 (목요일)">주 1회 (목요일)</option>
              <option value="주 2회 (화/금)">주 2회 (화/금)</option>
              <option value="격주 1회">격주 1회</option>
              <option value="월 1회">월 1회</option>
              <option value="비정기 품앗이">비정기 품앗이</option>
            </select>
          </div>
        </div>

        {/* 총 재료비 입력 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            총 재료비 (원)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-600 text-sm">
              ₩
            </span>
            <input
              type="text"
              value={numericExpense > 0 ? numericExpense.toLocaleString('ko-KR') : ''}
              onChange={handleExpenseChange}
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {[10000, 30000, 50000].map((amt) => (
              <button
                key={`btn-add-${amt}`}
                type="button"
                onClick={() => handleAddQuickExpense(amt)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
              >
                +{amt.toLocaleString('ko-KR')}원
              </button>
            ))}
            <button
              type="button"
              onClick={handleResetExpense}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
            >
              초기화
            </button>
          </div>
        </div>

        {/* 참여 아기 수 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            참여 아기 수
          </label>
          {participatingBabies.length > 0 ? (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-2 text-xs">
              <div className="flex items-center justify-between font-bold text-indigo-900 mb-1">
                <span>선택된 아기: {participatingBabies.length}명</span>
                <span className="text-[11px] text-indigo-600 font-normal">
                  (프로필 카드와 자동 연동)
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {participatingBabies.map((b) => (
                  <span
                    key={`part-${b.id}`}
                    className="inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] text-indigo-700 font-medium"
                  >
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCustomBabyCount((prev) => Math.max(1, prev - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="50"
                value={customBabyCount}
                onChange={(e) =>
                  setCustomBabyCount(
                    Math.max(1, parseInt(e.target.value, 10) || 1)
                  )
                }
                className="w-20 rounded-lg border border-slate-300 py-2 text-center text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCustomBabyCount((prev) => prev + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold"
              >
                +
              </button>
              <span className="text-xs text-slate-600">명</span>
            </div>
          )}
        </div>
      </div>

      {/* 참여 아기 알레르기 안전 가드 안내 */}
      {participatingAllergies.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold">
              주의: 참여 아기 중 알레르기 등록 이력이 있습니다 ({participatingAllergies.length}건)
            </span>
            <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
              {participatingAllergies.map((info, idx) => (
                <span
                  key={`allg-info-${idx}`}
                  className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 font-medium"
                >
                  {info}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 실시간 1/N 정산 결과 박스 */}
      <div className="mt-5 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
              1인당 부담 금액
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-900">
                {settlement.formattedPerPerson}
              </span>
              <span className="text-xs font-medium text-slate-600">
                (총 {effectiveBabyCount}명 분할)
              </span>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-xs text-slate-600 block">
              절사 잔여금 (모임 잔액 적립)
            </span>
            <span className="text-sm font-bold text-slate-700">
              {settlement.formattedRemainder}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-indigo-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-indigo-600" />
            <span>
              검산: {settlement.formattedPerPerson} × {effectiveBabyCount}명 + 잔여{' '}
              {settlement.formattedRemainder} ={' '}
              {settlement.totalExpense.toLocaleString('ko-KR')}원
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveToLedger}
            disabled={numericExpense <= 0}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
              numericExpense > 0
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                : 'bg-slate-200 text-slate-600 cursor-not-allowed'
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            장부 기록 및 정산 확정
          </button>
        </div>
      </div>

      {/* 장부 기록 성공 알림 토스트 */}
      {justRecordedNotice && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-semibold text-emerald-800 animate-fadeIn">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{justRecordedNotice}</span>
        </div>
      )}

      {/* 최근 장부 기록 이력 */}
      {localLedger.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
              최근 품앗이 장부 기록 ({localLedger.length}건)
            </h4>
            <span className="text-[11px] text-slate-600">
              * 외부 API 연동 없는 앱 내 순수 장부
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {localLedger.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {item.cycle} • {item.participatingBabyNames.join(', ')} (
                    {item.babyCount}명)
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-indigo-700">
                    1인당 {item.formattedPerPerson}
                  </span>
                  <div className="text-[11px] text-slate-600">
                    총 {item.totalExpense.toLocaleString('ko-KR')}원 (잔여{' '}
                    {item.formattedRemainder})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
