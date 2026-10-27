import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Bell,
  Clock,
  CheckCircle2,
  Send,
  AlertTriangle,
  Settings,
  Sparkles,
  Users,
  Calendar,
  MessageSquare,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  scanExpiringPasses,
  scanDueTreatments,
  generateMarketingDispatchQueue,
  type MessageTemplate,
  type MarketingDispatchItem,
  type DispatchHistoryItem,
} from '../domain/retentionMarketingEngine';

const STORAGE_KEY_TEMPLATES = 'moa_retention_templates';
const STORAGE_KEY_HISTORY = 'moa_retention_dispatch_history';

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    triggerType: 'PASS_EXPIRING',
    title: '수강권/회원권 만료 안내',
    body: '[{사업장명}] {고객명}님, 이용 중이신 수강권이 {남은일수}일 후 만료됩니다. ({만료일}까지) 이번 주 내 재등록 시 10% 추가 할인 혜택이 적용됩니다.',
  },
  {
    triggerType: 'TREATMENT_DUE',
    title: '재방문 맞춤 주기 케어 안내',
    body: '[{사업장명}] {고객명}님, 지난 시술 후 최적의 관리 주기({남은일수}일 후)가 다가왔습니다. 건강한 모발/피부 유지를 위해 이번 주 예약을 추천드립니다.',
  },
  {
    triggerType: 'LOCKER_EXPIRING',
    title: '사물함 이용기간 만료 예고',
    body: '[{사업장명}] {고객명}님, 배정된 개인 사물함이 {남은일수}일 후 만료됩니다. 연장을 원하시면 카운터 또는 앱에서 간편 신청해 주세요.',
  },
  {
    triggerType: 'LONG_TIME_ABSENT',
    title: '장기 미방문 회원 안부 알림',
    body: '[{사업장명}] {고객명}님, 한동안 뵙지 못해 안부 전합니다. 언제든 편한 시간에 방문해 주시면 1:1 컨디션 체크를 도와드리겠습니다.',
  },
];

// 샘플 회원/수강권 데이터
const SAMPLE_PASSES = [
  { id: 'p-1', customerId: 'c-1', customerName: '김민준', customerPhone: '010-3841-2918', endDate: '2026-10-22', status: 'active' }, // D-7
  { id: 'p-2', customerId: 'c-2', customerName: '이서연', customerPhone: '010-9923-4819', endDate: '2026-10-18', status: 'active' }, // D-3
  { id: 'p-3', customerId: 'c-3', customerName: '박도현', customerPhone: '010-4491-1029', endDate: '2026-10-16', status: 'active' }, // D-1
  { id: 'p-4', customerId: 'c-4', customerName: '정예은', customerPhone: '010-7712-3490', endDate: '2026-10-15', status: 'active' }, // D-Day
  { id: 'p-5', customerId: 'c-5', customerName: '최우진', customerPhone: '010-5521-8832', endDate: '2026-11-20', status: 'active' },
];

const SAMPLE_TREATMENTS = [
  { id: 't-1', customerId: 'c-6', customerName: '한지민', customerPhone: '010-8821-4921', lastPerformedDate: '2026-09-17', cycleWeeks: 4 }, // 28일 후 = 10-15(D-Day)
  { id: 't-2', customerId: 'c-7', customerName: '강태양', customerPhone: '010-1192-3382', lastPerformedDate: '2026-09-19', cycleWeeks: 4 }, // 28일 후 = 10-17(D-2)
];

export function RetentionMarketingView() {
  const [activeTab, setActiveTab] = useState<'queue' | 'templates' | 'history'>('queue');
  const currentDate = '2026-10-15';
  const workplaceName = '모아 파트너스';

  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_TEMPLATES));
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_TEMPLATES;
  });

  const [history, setHistory] = useState<DispatchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_HISTORY));
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { customerId: 'c-old', triggerType: 'PASS_EXPIRING', sentAt: '2026-10-10T09:00:00Z' },
    ];
  });

  // 오늘 감지된 후보자 목록 스캔
  const candidates = useMemo(() => {
    const expiringPasses = scanExpiringPasses({
      passes: SAMPLE_PASSES,
      currentDate,
      targetDaysWindow: [7, 3, 1, 0],
    });

    const dueTreatments = scanDueTreatments({
      treatments: SAMPLE_TREATMENTS,
      currentDate,
    });

    return [...expiringPasses, ...dueTreatments];
  }, [currentDate]);

  // 발송 큐 생성 (쿨다운 필터링 적용)
  const initialQueue = useMemo(() => {
    return generateMarketingDispatchQueue({
      candidates,
      templates,
      history,
      currentDate,
      workplaceName,
      cooldownDays: 7,
    });
  }, [candidates, templates, history, currentDate, workplaceName]);

  const [queue, setQueue] = useState<MarketingDispatchItem[]>(initialQueue);

  useEffect(() => {
    setQueue(initialQueue);
  }, [initialQueue]);

  useEffect(() => {
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY_TEMPLATES), JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY_HISTORY), JSON.stringify(history));
  }, [history]);

  // 개별 메시지 발송 핸들러
  const handleSendSingle = (item: MarketingDispatchItem) => {
    setQueue((prev) => prev.filter((q) => q.id !== item.id));
    const newHistoryItem: DispatchHistoryItem = {
      customerId: item.customerId,
      triggerType: item.triggerType,
      sentAt: new Date().toISOString(),
    };
    setHistory((prev) => [newHistoryItem, ...prev]);
    showToast(`${item.customerName}님께 알림톡/문자가 발송되었습니다.`, 'success');
  };

  // 전체 일괄 발송 핸들러
  const handleSendAll = () => {
    if (queue.length === 0) return;
    const nowIso = new Date().toISOString();
    const newItems: DispatchHistoryItem[] = queue.map((q) => ({
      customerId: q.customerId,
      triggerType: q.triggerType,
      sentAt: nowIso,
    }));
    setHistory((prev) => [...newItems, ...prev]);
    setQueue([]);
    showToast(`총 ${queue.length}건의 리텐션 알림톡이 일괄 발송되었습니다.`, 'success');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2 pb-12">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">자동화 리텐션 & 이탈 방지 마케팅</h1>
            <p className="text-sm text-slate-500">
              수강권 만료 D-Day 알림 및 시술 주기 맞춤 예약 알림톡을 자동 발송하여 재등록률을 극대화합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'queue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            발송 대기 큐 ({queue.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'templates'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            템플릿 설정
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            발송 이력 ({history.length})
          </button>
        </div>
      </div>

      {/* 핵심 리텐션 지표 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase">오늘 발송 대기</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{queue.length}건</p>
          <p className="text-xs text-slate-500 mt-1">D-Day 임박 및 주기 도래</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase">이번 달 발송 성공</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{history.length}건</p>
          <p className="text-xs text-emerald-600 mt-1">도달률 99.4%</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase">재등록 전환율</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">42.8%</p>
          <p className="text-xs text-slate-500 mt-1">알림톡 수신 후 7일 이내</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase">이탈 방지 예상 매출</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">+380만원</p>
          <p className="text-xs text-slate-500 mt-1">월 환산 가치</p>
        </div>
      </div>

      {/* 탭 본문 영역 */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">오늘의 알림톡 발송 대기 목록</h2>
              <p className="text-xs text-slate-500">
                수강권 만료일(D-7, D-3, D-1, 당일) 및 시술 주기에 도래한 고객을 시스템이 자동 선별하였습니다.
              </p>
            </div>
            {queue.length > 0 && (
              <button
                onClick={handleSendAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{queue.length}건 일괄 발송하기</span>
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500 opacity-60" />
              <p className="font-semibold text-slate-700">오늘 발송 대기 중인 리텐션 알림이 없습니다.</p>
              <p className="text-xs">모든 대상 고객에게 발송이 완료되었거나 쿨다운 기간(7일) 중입니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => {
                const isPass = item.triggerType === 'PASS_EXPIRING';
                const badgeLabel = isPass ? '수강권 만료 D-Day' : '시술 주기 맞춤 케어';
                const badgeColor = isPass
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200';

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{item.customerName}</span>
                        <span className="text-xs text-slate-400">({item.customerPhone})</span>
                      </div>
                      <button
                        onClick={() => handleSendSingle(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 rounded-lg text-xs font-semibold text-slate-700 shadow-xs transition-all"
                      >
                        <Send className="w-3 h-3" />
                        <span>개별 발송</span>
                      </button>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                      {item.messageText}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">알림톡 및 SMS 템플릿 설정</h2>
            <p className="text-xs text-slate-500">
              트리거별 메시지 본문을 수정할 수 있습니다. {'{고객명}'}, {'{사업장명}'}, {'{남은일수}'}, {'{만료일}'} 변수가 자동 치환됩니다.
            </p>
          </div>

          <div className="space-y-4">
            {templates.map((tpl, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">{tpl.triggerType}</span>
                  <span className="text-xs font-semibold text-slate-800">{tpl.title}</span>
                </div>
                <textarea
                  rows={3}
                  value={tpl.body}
                  onChange={(e) => {
                    const next = [...templates];
                    next[idx] = { ...next[idx], body: e.target.value };
                    setTemplates(next);
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">최근 알림톡 발송 완료 이력</h2>
            <p className="text-xs text-slate-500">쿨다운 방지 및 발송 성공 기록입니다.</p>
          </div>

          <div className="space-y-2">
            {history.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-slate-800">회원 ID: {h.customerId}</span>
                  <span className="text-slate-400">({h.triggerType})</span>
                </div>
                <span className="text-slate-400">{h.sentAt.replace('T', ' ').slice(0, 19)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RetentionMarketingView;
