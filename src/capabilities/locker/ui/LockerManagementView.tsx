import React, { useMemo, useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Plus,
  User,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  type LockerItem,
  type LockerStatus,
  assignLocker,
  evaluateLockerExpiry,
  releaseLocker,
} from '../domain/lockerEngine';

const STORAGE_KEY = 'moa_lockers_registry_v1';

function getInitialLockers(): LockerItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }

  // 기본 12개 사물함 생성
  return Array.from({ length: 12 }, (_, i) => ({
    id: `locker-${i + 1}`,
    lockerNumber: String(i + 1).padStart(2, '0'),
    section: i < 6 ? 'A구역' : 'B구역',
    status: 'AVAILABLE' as LockerStatus,
    depositAmount: 10000,
  }));
}

function saveLockers(lockers: LockerItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lockers));
  } catch {
    // ignore
  }
}

type FilterTab = 'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'EXPIRED';

export interface LockerCustomer {
  id: string;
  name: string;
  phone?: string;
}

export interface LockerManagementViewProps {
  title?: string;
  description?: string;
  customers?: LockerCustomer[];
}

export const LockerManagementView: React.FC<LockerManagementViewProps> = ({
  title = '사물함·락커 관리',
  description = '사업장 내 사물함 배정, 보증금 및 이용 기간을 통합 관리합니다.',
  customers = [],
}) => {
  const [lockers, setLockers] = useState<LockerItem[]>(getInitialLockers);
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  // 모달 상태: 락커 배정
  const [assignTarget, setAssignTarget] = useState<LockerItem | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [deposit, setDeposit] = useState<number>(10000);

  // 모달 상태: 락커 추가
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLockerNumber, setNewLockerNumber] = useState('');
  const [newSection, setNewSection] = useState('A구역');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 오늘 날짜 기준 만료 상태 평가
  const evaluatedLockers = useMemo(() => {
    return lockers.map((l) => {
      if (l.status === 'OCCUPIED' || l.status === 'EXPIRED') {
        const result = evaluateLockerExpiry(l, todayStr);
        return result.updatedLocker;
      }
      return l;
    });
  }, [lockers, todayStr]);

  const sections = useMemo(() => {
    const set = new Set<string>();
    evaluatedLockers.forEach((l) => {
      if (l.section) set.add(l.section);
    });
    return Array.from(set);
  }, [evaluatedLockers]);

  const filteredLockers = useMemo(() => {
    return evaluatedLockers.filter((l) => {
      if (filter !== 'ALL' && l.status !== filter) return false;
      if (selectedSection !== 'ALL' && l.section !== selectedSection) return false;
      return true;
    });
  }, [evaluatedLockers, filter, selectedSection]);

  const stats = useMemo(() => {
    const total = evaluatedLockers.length;
    const available = evaluatedLockers.filter((l) => l.status === 'AVAILABLE').length;
    const occupied = evaluatedLockers.filter((l) => l.status === 'OCCUPIED').length;
    const expired = evaluatedLockers.filter((l) => l.status === 'EXPIRED').length;
    return { total, available, occupied, expired };
  }, [evaluatedLockers]);

  const updateAndPersist = (next: LockerItem[]) => {
    setLockers(next);
    saveLockers(next);
  };

  const handleOpenAssign = (locker: LockerItem) => {
    setAssignTarget(locker);
    setSelectedCustomerId(customers[0]?.id || '');
    setCustomCustomerName('');
    setDeposit(locker.depositAmount || 10000);
  };

  const handleConfirmAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget) return;

    let targetName = customCustomerName.trim();
    if (!targetName && selectedCustomerId) {
      const found = customers.find((c) => c.id === selectedCustomerId);
      if (found) targetName = found.name;
    }

    if (!targetName) {
      showToast('배정할 회원 또는 고객명을 입력해 주세요.', 'warning');
      return;
    }

    const res = assignLocker(assignTarget, {
      customerId: targetName,
      startDate,
      endDate,
      depositAmount: deposit,
    });

    if (!res.success) {
      showToast(res.error || '배정에 실패했습니다.', 'error');
      return;
    }

    const next = lockers.map((l) => (l.id === assignTarget.id ? res.updatedLocker : l));
    updateAndPersist(next);
    setAssignTarget(null);
    showToast(`${res.updatedLocker.lockerNumber}번 락커가 ${targetName}님에게 배정되었습니다.`, 'success');
  };

  const handleRelease = (locker: LockerItem) => {
    if (!confirm(`${locker.lockerNumber}번 사물함을 반납 처리하시겠습니까?`)) return;

    const res = releaseLocker(locker);
    const next = lockers.map((l) => (l.id === locker.id ? res.updatedLocker : l));
    updateAndPersist(next);
    showToast(`${locker.lockerNumber}번 사물함 반납 완료 (보증금 반환: ${res.refundDeposit.toLocaleString()}원)`, 'success');
  };

  const handleAddLocker = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLockerNumber.trim();
    if (!trimmed) {
      showToast('사물함 번호를 입력해 주세요.', 'warning');
      return;
    }

    if (lockers.some((l) => l.lockerNumber === trimmed)) {
      showToast('이미 존재하는 사물함 번호입니다.', 'warning');
      return;
    }

    const newLocker: LockerItem = {
      id: `locker-${Date.now()}`,
      lockerNumber: trimmed,
      section: newSection.trim() || undefined,
      status: 'AVAILABLE',
      depositAmount: 10000,
    };

    const next = [...lockers, newLocker];
    updateAndPersist(next);
    setIsAddModalOpen(false);
    setNewLockerNumber('');
    showToast(`${trimmed}번 사물함이 추가되었습니다.`, 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" data-testid="locker-management-view">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Lock className="w-6 h-6 text-indigo-600" />
            {title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          사물함 추가
        </button>
      </div>

      {/* 상태 요약 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400">전체 사물함</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}개</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
          <p className="text-xs font-bold text-emerald-600">이용 가능</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{stats.available}개</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 bg-indigo-50/20 shadow-xs">
          <p className="text-xs font-bold text-indigo-600">사용 중</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">{stats.occupied}개</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-100 bg-rose-50/20 shadow-xs">
          <p className="text-xs font-bold text-rose-600">만료/점검</p>
          <p className="text-2xl font-black text-rose-700 mt-1">{stats.expired}개</p>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { key: 'ALL', label: '전체' },
              { key: 'AVAILABLE', label: '이용 가능' },
              { key: 'OCCUPIED', label: '사용 중' },
              { key: 'EXPIRED', label: '만료됨' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {sections.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              aria-label="구역 필터"
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">전체 구역</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 사물함 그리드 */}
      {filteredLockers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <Lock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">해당 조건의 사물함이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredLockers.map((locker) => {
            const isAvail = locker.status === 'AVAILABLE';
            const isOcc = locker.status === 'OCCUPIED';
            const isExp = locker.status === 'EXPIRED';

            return (
              <div
                key={locker.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[140px] ${
                  isAvail
                    ? 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-xs'
                    : isOcc
                    ? 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                    : 'bg-rose-50/40 border-rose-200 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-slate-900 tracking-tight">
                      #{locker.lockerNumber}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        isAvail
                          ? 'bg-emerald-100 text-emerald-800'
                          : isOcc
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isAvail ? '비어있음' : isOcc ? '사용 중' : '만료'}
                    </span>
                  </div>

                  {locker.section && (
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{locker.section}</p>
                  )}

                  {locker.assignedCustomerId && (
                    <div className="mt-2 text-xs">
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {locker.assignedCustomerId}
                      </p>
                      {locker.endDate && (
                        <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5 text-slate-400" />
                          ~{locker.endDate}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100">
                  {isAvail ? (
                    <button
                      type="button"
                      onClick={() => handleOpenAssign(locker)}
                      className="w-full py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      배정하기
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRelease(locker)}
                      className="w-full py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 rounded-lg transition-colors"
                    >
                      반납
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 사물함 배정 모달 */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              {assignTarget.lockerNumber}번 사물함 배정
            </h3>

            <form onSubmit={handleConfirmAssign} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">배정 회원 / 고객</label>
                {customers.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setCustomCustomerName('');
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- 목록에서 선택 (또는 직접 입력) --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone || '연락처 없음'})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="직접 고객명 입력 시 여기에 입력"
                      value={customCustomerName}
                      onChange={(e) => setCustomCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="회원 또는 고객명 입력"
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">종료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">보증금 (원)</label>
                <input
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAssignTarget(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={customers.length === 0}
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
                >
                  배정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 사물함 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              신규 사물함 등록
            </h3>

            <form onSubmit={handleAddLocker} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">사물함 번호</label>
                <input
                  type="text"
                  placeholder="예: 13 또는 A-01"
                  value={newLockerNumber}
                  onChange={(e) => setNewLockerNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">구역 명칭</label>
                <input
                  type="text"
                  placeholder="예: A구역, 남성락커 등"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
