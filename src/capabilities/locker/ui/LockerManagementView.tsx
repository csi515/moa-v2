import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Lock,
  Unlock,
  Plus,
  User,
  Calendar,
  RotateCcw,
  X,
  Filter,
} from 'lucide-react';
import { EmptyStateHero } from '@/shared/components/ui/EmptyStateHero';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  fetchLockers,
  assignLockerRecord,
  extendLockerRecord,
  releaseLockerRecord,
  addLockerRecord,
  resolveLockerGridStatus,
  type LockerRecord,
  type LockerGridStatus,
} from '../services/lockerService';
import { invalidateTenantQueries } from '@/core/query/tenantQueryKeys';
import { notifyStorageFromRefineResource } from '@/core/query/crossCacheBridge';

export interface LockerManagementViewProps {
  title?: string;
  description?: string;
}

export const LockerManagementView: React.FC<LockerManagementViewProps> = ({
  title = '사물함 관리',
  description = '터치하여 회원을 배정하거나 기간을 연장합니다.',
}) => {
  const { currentOrganization } = useOrganization();
  const [lockers, setLockers] = useState<LockerRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 모달 상태: 배정 모달
  const [assignTargetLocker, setAssignTargetLocker] = useState<LockerRecord | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [assignDurationDays, setAssignDurationDays] = useState(30);
  const [depositAmount, setDepositAmount] = useState(10000);
  const [monthlyFee, setMonthlyFee] = useState(10000);
  const [isAssigning, setIsAssigning] = useState(false);
  const isAssigningRef = useRef(false);

  // 모달 상태: 점유 관리 모달 (연장/반납)
  const [manageTargetLocker, setManageTargetLocker] = useState<LockerRecord | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [isManaging, setIsManaging] = useState(false);
  const isManagingRef = useRef(false);

  // 신규 사물함 추가 모달
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLockerNumber, setNewLockerNumber] = useState('');
  const [newSection, setNewSection] = useState('공용');
  const [isAdding, setIsAdding] = useState(false);
  const isAddingRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // 목록 조회 (AbortSignal로 언마운트 시 안전 처리)
  const loadLockers = useCallback(
    async (signal?: AbortSignal) => {
      if (!currentOrganization) return;
      setLoading(true);
      try {
        const data = await fetchLockers(currentOrganization.id, signal);
        if (signal?.aborted) return;
        setLockers(data);
      } catch {
        if (signal?.aborted) return;
        // 실패 시 이전 상태 유지
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [currentOrganization]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadLockers(controller.signal);
    return () => controller.abort();
  }, [loadLockers]);

  // 구역 목록
  const sections = useMemo(() => {
    const set = new Set(lockers.map((l) => l.section));
    return ['ALL', ...Array.from(set)];
  }, [lockers]);

  // 필터링된 사물함
  const filteredLockers = useMemo(() => {
    if (selectedSection === 'ALL') return lockers;
    return lockers.filter((l) => l.section === selectedSection);
  }, [lockers, selectedSection]);

  // 회원 배정 제출
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetLocker || !customerName.trim() || !currentOrganization) return;
    if (isAssigningRef.current) return;
    isAssigningRef.current = true;
    setIsAssigning(true);
    try {
      await assignLockerRecord({
        tenantId: currentOrganization.id,
        lockerId: assignTargetLocker.id,
        lockerNumber: assignTargetLocker.locker_number,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        durationDays: assignDurationDays,
        depositAmount,
        monthlyFee,
      });

      invalidateTenantQueries('lockers', currentOrganization.id);
      notifyStorageFromRefineResource('lockers');
      showToast(`사물함 ${assignTargetLocker.locker_number}번이 ${customerName} 회원에게 배정되었습니다.`);
      setAssignTargetLocker(null);
      void loadLockers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '배정 실패');
    } finally {
      isAssigningRef.current = false;
      setIsAssigning(false);
    }
  };

  // 기간 연장 처리
  const handleExtend = async () => {
    if (!manageTargetLocker) return;
    if (isManagingRef.current) return;
    if (!currentOrganization) return;
    isManagingRef.current = true;
    setIsManaging(true);
    try {
      await extendLockerRecord(manageTargetLocker.id, manageTargetLocker.expires_at, extendDays);
      invalidateTenantQueries('lockers', currentOrganization.id);
      notifyStorageFromRefineResource('lockers');
      showToast(`사물함 ${manageTargetLocker.locker_number}번이 ${extendDays}일 연장되었습니다.`);
      setManageTargetLocker(null);
      void loadLockers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '연장 실패');
    } finally {
      isManagingRef.current = false;
      setIsManaging(false);
    }
  };

  // 반납 처리
  const handleRelease = async () => {
    if (!manageTargetLocker) return;
    if (isManagingRef.current) return;
    if (!currentOrganization) return;
    isManagingRef.current = true;
    setIsManaging(true);
    try {
      await releaseLockerRecord(manageTargetLocker.id);
      invalidateTenantQueries('lockers', currentOrganization.id);
      notifyStorageFromRefineResource('lockers');
      showToast(`사물함 ${manageTargetLocker.locker_number}번이 정상 반납되었습니다.`);
      setManageTargetLocker(null);
      void loadLockers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '반납 실패');
    } finally {
      isManagingRef.current = false;
      setIsManaging(false);
    }
  };

  // 신규 사물함 등록
  const handleAddLocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLockerNumber.trim() || !currentOrganization) return;
    if (isAddingRef.current) return;
    isAddingRef.current = true;
    setIsAdding(true);

    try {
      await addLockerRecord(currentOrganization.id, newLockerNumber, newSection);
      invalidateTenantQueries('lockers', currentOrganization.id);
      notifyStorageFromRefineResource('lockers');
      showToast(`사물함 ${newLockerNumber}번이 추가되었습니다.`);
      setIsAddModalOpen(false);
      setNewLockerNumber('');
      void loadLockers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '등록 실패');
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur transition-all">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-600">
            <Lock className="h-6 w-6" />
            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">{title}</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex min-h-[44px] h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          + 사물함 추가
        </button>
      </div>

      {/* Status Legend & Section Filter */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Status Badges Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 font-bold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            빈자리
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            사용중
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-bold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            만료 임박
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 font-bold text-rose-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            초과
          </span>
        </div>

        {/* Section Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="min-h-[44px] h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {sections.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 'ALL' ? '전체 구역' : sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Tiles */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-2 text-xs text-slate-500">사물함 목록을 불러오는 중...</p>
        </div>
      ) : filteredLockers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8">
          <EmptyStateHero
            icon={<Lock className="w-8 h-8 text-indigo-600" />}
            title="등록된 사물함이 없습니다"
            description="사물함을 등록하고 회원 배정 현황을 관리하세요."
            action={{
              label: '+ 사물함 등록',
              onClick: () => setIsAddModalOpen(true),
              icon: <Plus className="w-4 h-4 mr-1" />,
            }}
            guide={{
              badge: '사물함 운영 가이드',
              title: '3단계로 끝내는 사물함·락커 관리',
              steps: [
                { stepNumber: 1, title: '사물함 구역 및 번호 등록', detail: '사우나, 헬스장, 독서실 등 구역별 번호 사물함 추가' },
                { stepNumber: 2, title: '빈 사물함 클릭 후 회원 배정', detail: '타일을 터치해 회원 정보와 대여 기간을 즉시 입력' },
                { stepNumber: 3, title: '만료 알림 및 원클릭 반납', detail: '만료 7일 전 경고 표시 및 원터치 반납/연장 처리' },
              ],
              tip: '💡 회색은 빈 사물함, 초록색은 사용 중, 노란색은 7일 내 만료 임박을 나타냅니다.',
            }}
            defaultGuideOpen={false}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredLockers.map((locker) => {
            const status = resolveLockerGridStatus(locker);

            let cardClass = 'border-slate-300 bg-slate-100 hover:border-slate-400';
            let statusText = '비어 있음';
            let badgeClass = 'text-slate-600 bg-white/80';

            if (status === 'OCCUPIED') {
              cardClass = 'border-emerald-300 bg-emerald-50 hover:border-emerald-400';
              statusText = '사용 중';
              badgeClass = 'text-emerald-700 bg-emerald-100';
            } else if (status === 'EXPIRING_SOON') {
              cardClass = 'border-amber-300 bg-amber-50 hover:border-amber-400';
              statusText = '만료 임박';
              badgeClass = 'text-amber-700 bg-amber-100';
            } else if (status === 'OVERDUE') {
              cardClass = 'border-rose-300 bg-rose-50 hover:border-rose-400';
              statusText = '기간 초과';
              badgeClass = 'text-rose-700 bg-rose-100';
            }

            return (
              <div
                key={locker.id}
                onClick={() => {
                  if (status === 'AVAILABLE') {
                    setAssignTargetLocker(locker);
                    setCustomerName('');
                    setCustomerPhone('');
                  } else {
                    setManageTargetLocker(locker);
                  }
                }}
                className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 shadow-sm transition active:scale-[0.98] ${cardClass}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">{locker.section}</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="mt-2 text-2xl font-black text-slate-900">
                    #{locker.locker_number}
                  </div>
                </div>

                <div className="mt-4 border-t border-black/5 pt-2 text-xs">
                  {status === 'AVAILABLE' ? (
                    <div className="flex items-center gap-1 font-medium text-slate-500">
                      <Unlock className="h-3.5 w-3.5" />
                      탭하여 회원 배정
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold text-slate-800">
                        {locker.assigned_customer_name || '회원'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ~{locker.expires_at || '기간 없음'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 회원 배정 모달 */}
      {assignTargetLocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">
                사물함 #{assignTargetLocker.locker_number} 회원 배정
              </h3>
              <button
                onClick={() => setAssignTargetLocker(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">회원 이름 *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">휴대폰 번호</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">이용 기간 (일)</label>
                  <input
                    type="number"
                    min="1"
                    value={assignDurationDays}
                    onChange={(e) => setAssignDurationDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">보증금 (원)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setAssignTargetLocker(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isAssigning ? '배정 중...' : '배정 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 점유 관리 모달 (연장/반납) */}
      {manageTargetLocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  사물함 #{manageTargetLocker.locker_number} 관리
                </h3>
                <p className="text-xs text-slate-500">
                  배정 회원: {manageTargetLocker.assigned_customer_name || '회원'} (~{manageTargetLocker.expires_at})
                </p>
              </div>
              <button
                onClick={() => setManageTargetLocker(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* 기간 연장 */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex items-center gap-2 font-bold text-indigo-900 text-xs">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  기간 연장
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <select
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900"
                  >
                    <option value={7}>7일 연장</option>
                    <option value={15}>15일 연장</option>
                    <option value={30}>30일 연장</option>
                    <option value={60}>60일 연장</option>
                    <option value={90}>90일 연장</option>
                  </select>
                  <button
                    onClick={handleExtend}
                    disabled={isManaging}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    연장 적용
                  </button>
                </div>
              </div>

              {/* 반납 처리 */}
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                <div className="flex items-center gap-2 font-bold text-rose-900 text-xs">
                  <RotateCcw className="h-4 w-4 text-rose-600" />
                  사물함 반납 및 비우기
                </div>
                <p className="mt-1 text-[11px] text-rose-700">
                  보증금 정산 완료 후 사물함을 즉시 비어있는 상태로 전환합니다.
                </p>
                <button
                  onClick={handleRelease}
                  disabled={isManaging}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  반납 확인 및 비우기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 신규 사물함 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">새 사물함 등록</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddLocker} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">사물함 번호 *</label>
                <input
                  type="text"
                  required
                  value={newLockerNumber}
                  onChange={(e) => setNewLockerNumber(e.target.value)}
                  placeholder="예: 105, A-1"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">구역(Section)</label>
                <input
                  type="text"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  placeholder="예: 공용, 남성, 여성, VIP"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isAdding ? '등록 중...' : '등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LockerManagementView;
