import React, { useMemo, useState } from 'react';
import { Ticket } from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
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

export interface PassManagementConfig {
  accent?: string;
  accentHover?: string;
  accentText?: string;
  filterActive?: string;
  title?: string;
  description?: string;
  createLabel?: string;
  emptyTitle?: string;
  customerLabel?: string;
  passName?: string;
  defaultPassLabel?: string;
  defaultTotalSessions?: number;
  preferSessionPassStudents?: boolean;
  billingModeChangeNotice?: string;
}

export interface PassManagementViewProps extends PassManagementConfig {
  config?: PassManagementConfig;
}

const DEFAULT_CONFIG: Required<PassManagementConfig> = {
  accent: 'bg-teal-600',
  accentHover: 'hover:bg-teal-700',
  accentText: 'text-teal-600',
  filterActive: 'bg-teal-600 text-white',
  title: '이용권 관리',
  description:
    '횟수제 이용권을 등록하고 잔여 횟수를 관리합니다. 수업 완료 시 1회 차감됩니다. 이 기기에서만 저장되며 다른 기기와 동기화되지 않습니다.',
  createLabel: '+ 이용권 등록',
  emptyTitle: '이용권이 없습니다',
  customerLabel: '회원',
  passName: '이용권',
  defaultPassLabel: '10회 이용권',
  defaultTotalSessions: 10,
  preferSessionPassStudents: false,
  billingModeChangeNotice: '',
};

export const PassManagementView: React.FC<PassManagementViewProps> = (props) => {
  const { config: explicitConfig, ...directProps } = props;

  const cfg: Required<PassManagementConfig> = useMemo(() => {
    const merged: PassManagementConfig = {
      ...DEFAULT_CONFIG,
      ...explicitConfig,
    };
    for (const [key, value] of Object.entries(directProps)) {
      if (value !== undefined) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
    return merged as Required<PassManagementConfig>;
  }, [explicitConfig, directProps]);

  const refreshKey = useStorageRefresh('sessionPasses');
  const [filter, setFilter] = useState<PassFilter>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [memberId, setMemberId] = useState('');
  const [label, setLabel] = useState(cfg.defaultPassLabel);
  const [totalSessions, setTotalSessions] = useState(cfg.defaultTotalSessions);
  const [expiresAt, setExpiresAt] = useState('');
  const [memo, setMemo] = useState('');

  const members = useMemo(() => {
    const list = StorageService.getStudents().filter((s) => s.status === 'active');
    if (!cfg.preferSessionPassStudents) return list;
    return [...list].sort((a, b) => {
      const aPass = a.billingMode === 'session_pass' ? 0 : 1;
      const bPass = b.billingMode === 'session_pass' ? 0 : 1;
      return aPass - bPass || a.name.localeCompare(b.name, 'ko');
    });
  }, [refreshKey, cfg.preferSessionPassStudents]);

  const passes = useMemo(() => ScheduleService.getSessionPasses(), [refreshKey]);

  const filtered = useMemo(() => {
    const list = [...passes].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
    if (filter === 'active') return list.filter((p) => p.status === 'active' && getPassRemaining(p) > 0);
    return list;
  }, [passes, filter]);

  const openCreate = () => {
    setLabel(cfg.defaultPassLabel);
    setTotalSessions(cfg.defaultTotalSessions);
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
      showToast(`${cfg.customerLabel}을(를) 선택해 주세요.`, 'warning');
      return;
    }
    if (totalSessions < 1) {
      showToast('횟수는 1회 이상이어야 합니다.', 'warning');
      return;
    }

    ScheduleService.saveSessionPass({
      customerId: member.id,
      customerName: member.name,
      label: label.trim() || cfg.defaultPassLabel,
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
        cfg.billingModeChangeNotice || `${cfg.passName}이 등록되었습니다.`,
        'success'
      );
    } else {
      showToast(`${cfg.passName}이 등록되었습니다.`, 'success');
    }

    setIsModalOpen(false);
    setMemberId('');
    setMemo('');
  };

  const cancelPass = (pass: SessionPass) => {
    ScheduleService.saveSessionPass({ ...pass, status: 'cancelled' });
    showToast(`${cfg.passName}을 취소했습니다.`, 'info');
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<Ticket className="w-5 h-5" />}
        iconClassName={cfg.accentText}
        title={cfg.title}
        description={cfg.description}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className={`px-4 py-2.5 ${cfg.accent} ${cfg.accentHover} text-white text-sm font-bold rounded-xl min-h-[44px]`}
          >
            {cfg.createLabel}
          </button>
        }
      />

      <FilterTabs tabs={FILTERS} active={filter} onChange={setFilter} activeClassName={cfg.filterActive} />

      {filtered.length === 0 ? (
        <EmptyState icon={<Ticket className="w-10 h-10" />} title={cfg.emptyTitle} />
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
                    <p className={`text-xs font-semibold mt-1 ${cfg.accentText}`}>
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
        title={`${cfg.passName} 등록`}
      >
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {cfg.customerLabel} *
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
              {cfg.passName} 이름
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
              placeholder={cfg.defaultPassLabel}
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
            className={`w-full py-3 ${cfg.accent} ${cfg.accentHover} text-white font-bold rounded-xl min-h-[48px]`}
          >
            저장
          </button>
        </form>
      </Modal>
    </div>
  );
};
