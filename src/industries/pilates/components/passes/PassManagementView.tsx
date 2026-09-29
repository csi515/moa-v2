import React, { useMemo, useState } from 'react';
import { Ticket } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useStorageRefresh } from '@/hooks';
import { ScheduleService } from '@/core/services/scheduleService';
import { StorageService } from '@/services/storage';
import type { SessionPass, SessionPassStatus } from '@/core/types/schedule';
import { getPassRemaining } from '@/core/schedules/sessionPassUtils';
import { EmptyState, FilterTabs, Modal, PageHeader, type FilterTabItem } from '@/shared/components';

type PassFilter = 'active' | 'all';

const FILTERS: FilterTabItem<PassFilter>[] = [
  { id: 'active', label: '사용 중' },
  { id: 'all', label: '전체' },
];

const STATUS_LABEL: Record<SessionPassStatus, string> = {
  active: '사용 중',
  exhausted: '소진',
  cancelled: '취소',
};

export type PassManagementVariant = 'pilates' | 'piano' | 'skin';

const VARIANT: Record<
  PassManagementVariant,
  {
    accent: string;
    accentHover: string;
    accentText: string;
    filterActive: string;
    title: string;
    description: string;
    createLabel: string;
    emptyTitle: string;
    customerLabel: string;
    defaultPassLabel: string;
    preferSessionPassStudents: boolean;
  }
> = {
  pilates: {
    accent: 'bg-teal-600',
    accentHover: 'hover:bg-teal-700',
    accentText: 'text-teal-600',
    filterActive: 'bg-teal-600 text-white',
    title: '이용권 관리',
    description: '횟수제 이용권을 등록하고 잔여 횟수를 관리합니다. 수업 완료 시 1회 차감됩니다. 이 기기에서만 저장되며 다른 기기와 동기화되지 않습니다.',
    createLabel: '+ 이용권 등록',
    emptyTitle: '이용권이 없습니다',
    customerLabel: '회원',
    defaultPassLabel: '10회 이용권',
    preferSessionPassStudents: false,
  },
  skin: {
    accent: 'bg-rose-600',
    accentHover: 'hover:bg-rose-700',
    accentText: 'text-rose-600',
    filterActive: 'bg-rose-600 text-white',
    title: '관리권 관리',
    description: '횟수제 관리권을 등록하고 잔여 횟수를 관리합니다. 시술 완료 시 1회 차감됩니다. 이 기기에서만 저장되며 다른 기기와 동기화되지 않습니다.',
    createLabel: '+ 관리권 등록',
    emptyTitle: '관리권이 없습니다',
    customerLabel: '고객',
    defaultPassLabel: '10회 관리권',
    preferSessionPassStudents: false,
  },
  piano: {
    accent: 'bg-indigo-600',
    accentHover: 'hover:bg-indigo-700',
    accentText: 'text-indigo-600',
    filterActive: 'bg-indigo-600 text-white',
    title: '회차권 관리',
    description:
      '레슨 회차권을 등록·관리합니다. 수강 형태가 회차권인 원생은 출석(레슨) 시 1회 차감됩니다. 이 기기에서만 저장되며 다른 기기·재무 모듈과 동기화되지 않습니다.',
    createLabel: '+ 회차권 등록',
    emptyTitle: '회차권이 없습니다',
    customerLabel: '원생',
    defaultPassLabel: '8회 레슨권',
    preferSessionPassStudents: true,
  },
};

export const PassManagementView: React.FC<{ variant?: PassManagementVariant }> = ({
  variant = 'pilates',
}) => {
  const ui = VARIANT[variant];
  const { showToast } = useApp();
  const refreshKey = useStorageRefresh('sessionPasses');
  const [filter, setFilter] = useState<PassFilter>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [memberId, setMemberId] = useState('');
  const [label, setLabel] = useState(ui.defaultPassLabel);
  const [totalSessions, setTotalSessions] = useState(variant === 'piano' ? 8 : 10);
  const [expiresAt, setExpiresAt] = useState('');
  const [memo, setMemo] = useState('');

  const members = useMemo(() => {
    const list = StorageService.getStudents().filter((s) => s.status === 'active');
    if (!ui.preferSessionPassStudents) return list;
    return [...list].sort((a, b) => {
      const aPass = a.billingMode === 'session_pass' ? 0 : 1;
      const bPass = b.billingMode === 'session_pass' ? 0 : 1;
      return aPass - bPass || a.name.localeCompare(b.name, 'ko');
    });
  }, [refreshKey, ui.preferSessionPassStudents]);

  const passes = useMemo(() => ScheduleService.getSessionPasses(), [refreshKey]);

  const filtered = useMemo(() => {
    const list = [...passes].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
    if (filter === 'active') return list.filter((p) => p.status === 'active' && getPassRemaining(p) > 0);
    return list;
  }, [passes, filter]);

  const openCreate = () => {
    setLabel(ui.defaultPassLabel);
    setTotalSessions(variant === 'piano' ? 8 : 10);
    const preferred = members.find((m) => m.billingMode === 'session_pass') || members[0];
    setMemberId(preferred?.id || '');
    setExpiresAt('');
    setMemo('');
    setIsModalOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find((m) => m.id === memberId);
    if (!member) {
      showToast(`${ui.customerLabel}을(를) 선택해 주세요.`, 'warning');
      return;
    }
    if (totalSessions < 1) {
      showToast('횟수는 1회 이상이어야 합니다.', 'warning');
      return;
    }

    ScheduleService.saveSessionPass({
      customerId: member.id,
      customerName: member.name,
      label: label.trim() || ui.defaultPassLabel,
      totalSessions,
      usedSessions: 0,
      status: 'active',
      purchasedAt: new Date().toISOString(),
      expiresAt: expiresAt ? `${expiresAt}T23:59:59` : undefined,
      memo: memo.trim() || undefined,
    });

    if (member.billingMode !== 'session_pass') {
      StorageService.saveStudent({
        ...member,
        billingMode: 'session_pass',
      });
      showToast(
        variant === 'piano'
          ? '회차권이 등록되었고, 원생 수강 형태를 회차권으로 맞췄습니다.'
          : `${variant === 'skin' ? '관리권' : '이용권'}이 등록되었습니다.`,
        'success'
      );
    } else {
      showToast(`${variant === 'piano' ? '회차권' : variant === 'skin' ? '관리권' : '이용권'}이 등록되었습니다.`, 'success');
    }

    setIsModalOpen(false);
    setMemberId('');
    setMemo('');
  };

  const cancelPass = (pass: SessionPass) => {
    ScheduleService.saveSessionPass({ ...pass, status: 'cancelled' });
    showToast(`${variant === 'piano' ? '회차권' : variant === 'skin' ? '관리권' : '이용권'}을 취소했습니다.`, 'info');
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<Ticket className="w-5 h-5" />}
        iconClassName={ui.accentText}
        title={ui.title}
        description={ui.description}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className={`px-4 py-2.5 ${ui.accent} ${ui.accentHover} text-white text-sm font-bold rounded-xl min-h-[44px]`}
          >
            {ui.createLabel}
          </button>
        }
      />

      <FilterTabs tabs={FILTERS} active={filter} onChange={setFilter} activeClassName={ui.filterActive} />

      {filtered.length === 0 ? (
        <EmptyState icon={<Ticket className="w-10 h-10" />} title={ui.emptyTitle} />
      ) : (
        <div className="space-y-3">
          {filtered.map((pass) => {
            const remaining = getPassRemaining(pass);
            return (
              <div key={pass.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{pass.customerName}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{pass.label}</p>
                    <p className={`text-xs font-semibold mt-1 ${ui.accentText}`}>
                      잔여 {remaining}회 / 전체 {pass.totalSessions}회
                      {pass.expiresAt ? ` · ~${pass.expiresAt.slice(0, 10)}` : ''}
                    </p>
                    {pass.memo && <p className="text-[11px] text-slate-400 mt-1">{pass.memo}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                      {STATUS_LABEL[pass.status]}
                    </span>
                    {pass.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => cancelPass(pass)}
                        className="px-2 py-1 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg min-h-[44px]"
                      >
                        취소
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={variant === 'piano' ? '회차권 등록' : variant === 'skin' ? '관리권 등록' : '이용권 등록'}
      >
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {ui.customerLabel} *
            </label>
            <select
              required
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
            >
              <option value="">선택</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.billingMode === 'session_pass' ? ' · 회차권' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {variant === 'piano' ? '회차권 이름' : variant === 'skin' ? '관리권 이름' : '이용권 이름'}
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
              placeholder={ui.defaultPassLabel}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">총 횟수 *</label>
              <input
                type="number"
                min={1}
                required
                value={totalSessions}
                onChange={(e) => setTotalSessions(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">만료일</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">메모</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
            />
          </div>
          <button
            type="submit"
            className={`w-full py-3 ${ui.accent} ${ui.accentHover} text-white font-bold rounded-xl min-h-[48px]`}
          >
            저장
          </button>
        </form>
      </Modal>
    </div>
  );
};
