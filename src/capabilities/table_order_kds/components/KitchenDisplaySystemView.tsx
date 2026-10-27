import { getTenantStorageKey } from '@/shared/utils/tenantStorage';
import React, { useState, useEffect, useMemo } from 'react';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Plus,
  RefreshCw,
  Flame,
  BellRing,
  Coffee,
  Check,
  X,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  createTableOrderTicket,
  advanceTicketStatus,
  calculateElapsedMinutes,
  calculateKitchenMetrics,
  type TableOrderTicket,
  type TableOrderStatus,
} from '../domain/tableOrderKdsEngine';

const STORAGE_KEY_KDS_TICKETS = 'moa_kds_order_tickets';

const SAMPLE_TICKETS: TableOrderTicket[] = [
  {
    id: 'ord-101',
    tableNumber: '테이블 3',
    items: [
      { id: 'm-1', name: '아메리카노 (Ice)', quantity: 2, unitPrice: 4500, options: ['샷 추가', '연하게'] },
      { id: 'm-2', name: '수제 와플 세트', quantity: 1, unitPrice: 8500, options: ['생크림 많이'] },
    ],
    totalQuantity: 3,
    totalAmount: 17500,
    customerNote: '물 1잔 같이 부탁드립니다.',
    status: 'COOKING',
    submittedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    receivedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    cookingStartedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-102',
    tableNumber: '테이블 7',
    items: [
      { id: 'm-3', name: '바닐라 라떼 (Hot)', quantity: 1, unitPrice: 5500 },
      { id: 'm-4', name: '자몽 에이드', quantity: 1, unitPrice: 6000 },
    ],
    totalQuantity: 2,
    totalAmount: 11500,
    status: 'SUBMITTED',
    submittedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-103',
    tableNumber: '테이블 1',
    items: [
      { id: 'm-5', name: '시그니처 파스타', quantity: 2, unitPrice: 15000, options: ['매콤하게'] },
      { id: 'm-6', name: '하우스 샐러드', quantity: 1, unitPrice: 9000 },
    ],
    totalQuantity: 3,
    totalAmount: 39000,
    customerNote: '견과류 알레르기 있습니다.',
    status: 'READY',
    submittedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    receivedAt: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
    cookingStartedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    readyAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
];

export function KitchenDisplaySystemView() {
  const [tickets, setTickets] = useState<TableOrderTicket[]>(() => {
    try {
      const saved = localStorage.getItem(getTenantStorageKey(STORAGE_KEY_KDS_TICKETS));
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return SAMPLE_TICKETS;
  });

  const [currentTimeIso, setCurrentTimeIso] = useState<string>(new Date().toISOString());
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedTableForQr, setSelectedTableForQr] = useState<string>('테이블 1');

  // 10초마다 경과 시간 갱신
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeIso(new Date().toISOString());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY_KDS_TICKETS), JSON.stringify(tickets));
  }, [tickets]);

  // 실시간 주방 통계 지표 산출
  const metrics = useMemo(() => {
    return calculateKitchenMetrics(tickets, currentTimeIso, 15);
  }, [tickets, currentTimeIso]);

  // 상태 전이 핸들러
  const handleAdvanceStatus = (ticket: TableOrderTicket, nextStatus: TableOrderStatus) => {
    try {
      const updated = advanceTicketStatus(ticket, nextStatus);
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? updated : t)));

      let msg = '';
      if (nextStatus === 'RECEIVED') msg = `${ticket.tableNumber} 주문을 접수했습니다.`;
      else if (nextStatus === 'COOKING') msg = `${ticket.tableNumber} 조리를 시작합니다.`;
      else if (nextStatus === 'READY') msg = `${ticket.tableNumber} 조리가 완료되었습니다! (홀 서빙 호출)`;
      else if (nextStatus === 'SERVED') msg = `${ticket.tableNumber} 서빙이 완료되었습니다.`;
      else if (nextStatus === 'CANCELLED') msg = `${ticket.tableNumber} 주문이 취소되었습니다.`;

      showToast(msg, 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // 테스트 신규 주문 생성 (시뮬레이터)
  const handleCreateTestOrder = () => {
    const randomTable = `테이블 ${Math.floor(Math.random() * 8) + 1}`;
    const newTicket = createTableOrderTicket(`ord-${Date.now().toString().slice(-4)}`, {
      tableNumber: randomTable,
      items: [
        { id: `m-${Date.now()}`, name: '핸드드립 스페셜티 커피', quantity: 1, unitPrice: 6500 },
        { id: `m-bakery`, name: '바스크 치즈케이크', quantity: 1, unitPrice: 7000 },
      ],
      customerNote: '포크 2개 부탁드려요',
    });

    setTickets((prev) => [newTicket, ...prev]);
    showToast(`신규 주문이 접수되었습니다! (${randomTable})`, 'info');
  };

  const activeTickets = tickets.filter((t) => t.status !== 'SERVED' && t.status !== 'CANCELLED');

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2 pb-12">
      {/* 상단 KDS 헤더 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight">주방 디스플레이 시스템 (KDS)</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">LIVE</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              테이블 QR 비대면 주문 실시간 접수 및 3단계 조리 공정 관리 보드
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-700"
          >
            <QrCode className="w-4 h-4 text-orange-400" />
            <span>테이블 QR 발급</span>
          </button>
          <button
            onClick={handleCreateTestOrder}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>테스트 주문 접수</span>
          </button>
        </div>
      </div>

      {/* 주방 공정 핵심 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">활성 주문</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{metrics.totalActiveTickets}건</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">접수 대기</p>
          <p className="text-2xl font-black text-blue-600 mt-0.5">{metrics.waitingCount}건</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">조리 중</p>
          <p className="text-2xl font-black text-amber-500 mt-0.5">{metrics.cookingCount}건</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">준비 완료 (서빙대기)</p>
          <p className="text-2xl font-black text-emerald-600 mt-0.5">{metrics.readyCount}건</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase">평균 조리시간</p>
          <p className="text-2xl font-black text-slate-700 mt-0.5">{metrics.averageCookingMinutes}분</p>
        </div>
      </div>

      {/* KDS 티켓 카드 그리드 */}
      {activeTickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400 space-y-2">
          <Coffee className="w-12 h-12 mx-auto text-slate-300" />
          <p className="font-bold text-base text-slate-700">현재 대기 중인 주문이 없습니다.</p>
          <p className="text-xs">테이블에서 고객이 QR 주문을 접수하면 실시간으로 화면에 티켓이 표시됩니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeTickets.map((ticket) => {
            const elapsed = calculateElapsedMinutes(ticket.submittedAt, currentTimeIso);
            const isOverdue = elapsed >= 15;

            let statusBg = 'bg-blue-50 text-blue-700 border-blue-200';
            let statusText = '접수 대기';
            if (ticket.status === 'RECEIVED') {
              statusBg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              statusText = '접수 완료';
            } else if (ticket.status === 'COOKING') {
              statusBg = 'bg-amber-50 text-amber-700 border-amber-200';
              statusText = '🔥 조리 중';
            } else if (ticket.status === 'READY') {
              statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              statusText = '✨ 준비 완료';
            }

            return (
              <div
                key={ticket.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs flex flex-col justify-between overflow-hidden ${
                  isOverdue ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200'
                }`}
              >
                {/* 티켓 상단 바 */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900">{ticket.tableNumber}</span>
                    <span className="text-xs text-slate-400 font-mono">#{ticket.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
                    <span className={isOverdue ? 'text-rose-600 font-extrabold' : ''}>{elapsed}분 경과</span>
                  </div>
                </div>

                {/* 주문 내용 바디 */}
                <div className="p-5 space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBg}`}>
                      {statusText}
                    </span>
                    <span className="text-xs font-bold text-slate-500">총 {ticket.totalQuantity}개 항목</span>
                  </div>

                  <div className="space-y-2 border-t border-b border-slate-100 py-3">
                    {ticket.items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between text-sm">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                              {item.quantity}
                            </span>
                            <span className="font-bold text-slate-800">{item.name}</span>
                          </div>
                          {item.options && item.options.length > 0 && (
                            <p className="text-[11px] text-slate-500 pl-7 mt-0.5">
                              옵션: {item.options.join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-400">
                          {(item.quantity * item.unitPrice).toLocaleString()}원
                        </span>
                      </div>
                    ))}
                  </div>

                  {ticket.customerNote && (
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-medium">
                      <span className="font-bold mr-1">요청사항:</span>
                      {ticket.customerNote}
                    </div>
                  )}
                </div>

                {/* 하단 터치 액션 버튼 */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  {ticket.status === 'SUBMITTED' && (
                    <button
                      onClick={() => handleAdvanceStatus(ticket, 'RECEIVED')}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      주문 접수
                    </button>
                  )}
                  {ticket.status === 'RECEIVED' && (
                    <button
                      onClick={() => handleAdvanceStatus(ticket, 'COOKING')}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      조리 시작
                    </button>
                  )}
                  {ticket.status === 'COOKING' && (
                    <button
                      onClick={() => handleAdvanceStatus(ticket, 'READY')}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      조리 완료 (서빙 호출)
                    </button>
                  )}
                  {ticket.status === 'READY' && (
                    <button
                      onClick={() => handleAdvanceStatus(ticket, 'SERVED')}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      서빙 완료
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 테이블 QR 코드 발급 모달 */}
      {isQrModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-slate-900 text-base">테이블 QR 모바일 주문</h3>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700">발급할 테이블 선택</label>
              <select
                value={selectedTableForQr}
                onChange={(e) => setSelectedTableForQr(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <option key={num} value={`테이블 ${num}`}>
                    테이블 {num}번
                  </option>
                ))}
              </select>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center text-white text-xs font-mono font-bold">
                  [QR CODE: {selectedTableForQr}]
                </div>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{selectedTableForQr} 전용 QR</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  고객이 스마트폰 카메라로 스캔 시 바로 메뉴 주문 페이지로 연결됩니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  showToast(`${selectedTableForQr} QR 인쇄 명령이 전송되었습니다.`, 'success');
                  setIsQrModalOpen(false);
                }}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                QR 스티커 인쇄하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KitchenDisplaySystemView;
