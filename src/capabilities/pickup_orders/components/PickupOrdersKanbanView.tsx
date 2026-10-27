import React, { useState } from 'react';
import {
  PackageCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Calendar,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  transitionPickupStage,
  summarizePickupOrders,
  type PickupOrder,
  type PickupStage,
} from '../domain/pickupOrdersEngine';

const DUMMY_ORDERS: PickupOrder[] = [
  {
    id: 'ord-1',
    orderNumber: 'ORD-202610-001',
    customerName: '김민선',
    customerPhone: '010-3849-2918',
    items: [
      {
        name: '시그니처 파스텔 생화 꽃다발',
        quantity: 1,
        unitPrice: 65000,
        options: { '리본 메시지': '결혼기념일을 축하합니다 ❤️' },
      },
    ],
    stage: 'RECEIVED',
    pickupDateTime: '2026-10-20T14:30:00',
    specialRequests: '물주머니 넉넉히 부탁드립니다.',
    totalAmount: 65000,
    paymentStatus: 'PAID',
    createdAt: '2026-10-20T09:30:00',
  },
  {
    id: 'ord-2',
    orderNumber: 'ORD-202610-002',
    customerName: '박준호',
    customerPhone: '010-8274-1029',
    items: [
      {
        name: '수제 레터링 당근케이크 1호',
        quantity: 1,
        unitPrice: 42000,
        options: { '레터링 문구': '입사 1주년 축하해!' },
      },
    ],
    stage: 'PREPARING',
    pickupDateTime: '2026-10-20T16:00:00',
    totalAmount: 42000,
    paymentStatus: 'PAID',
    createdAt: '2026-10-20T11:00:00',
  },
  {
    id: 'ord-3',
    orderNumber: 'ORD-202610-003',
    customerName: '최유진',
    customerPhone: '010-9921-4432',
    items: [
      {
        name: '이탈리안 베지터블 가죽 카드지갑',
        quantity: 2,
        unitPrice: 48000,
        options: { 각인: 'Y.J. CHOI' },
      },
    ],
    stage: 'READY_FOR_PICKUP',
    pickupDateTime: '2026-10-20T17:30:00',
    totalAmount: 96000,
    paymentStatus: 'PAID',
    isNotificationSent: true,
    createdAt: '2026-10-20T12:00:00',
  },
];

const STAGE_CONFIG: Record<
  PickupStage,
  { label: string; color: string; badgeBg: string; nextStage?: PickupStage; nextLabel?: string }
> = {
  RECEIVED: {
    label: '주문 접수',
    color: 'text-amber-700 border-amber-200',
    badgeBg: 'bg-amber-50 text-amber-800',
    nextStage: 'PREPARING',
    nextLabel: '제작 시작',
  },
  PREPARING: {
    label: '제작/준비 중',
    color: 'text-blue-700 border-blue-200',
    badgeBg: 'bg-blue-50 text-blue-800',
    nextStage: 'READY_FOR_PICKUP',
    nextLabel: '제작 완료 (알림)',
  },
  READY_FOR_PICKUP: {
    label: '픽업 대기',
    color: 'text-purple-700 border-purple-200',
    badgeBg: 'bg-purple-50 text-purple-800',
    nextStage: 'COMPLETED',
    nextLabel: '수령 완료 처리',
  },
  COMPLETED: {
    label: '수령 완료',
    color: 'text-emerald-700 border-emerald-200',
    badgeBg: 'bg-emerald-50 text-emerald-800',
  },
  CANCELLED: {
    label: '주문 취소',
    color: 'text-slate-500 border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-700',
  },
};

export const PickupOrdersKanbanView: React.FC = () => {
  const [orders, setOrders] = useState<PickupOrder[]>(DUMMY_ORDERS);
  const [feedback, setFeedback] = useState<string | null>(null);

  const summary = summarizePickupOrders(orders);

  const handleAdvance = (order: PickupOrder) => {
    const config = STAGE_CONFIG[order.stage];
    if (!config.nextStage) return;

    const res = transitionPickupStage(order, config.nextStage);
    if (res.success) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? res.updatedOrder : o)));
      if (res.notificationTriggered) {
        setFeedback(`[${order.customerName}] 고객님께 '픽업 준비 완료' 안내 알림이 발송되었습니다.`);
      } else {
        setFeedback(`주문 [${order.orderNumber}] 상태가 '${STAGE_CONFIG[config.nextStage].label}'(으)로 변경되었습니다.`);
      }
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const stages: PickupStage[] = ['RECEIVED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 및 통계 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">사전 예약 픽업 주문 관리</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            고객 수령 희망 일시에 맞춘 4단계 주문제작 및 픽업 안내 칸반 파이프라인
          </p>
        </div>

        <div className="flex gap-2">
          <div className="px-3 py-2 bg-indigo-50 text-indigo-800 rounded-lg text-sm font-medium flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>오늘 픽업 예정: <strong>{summary.todayPickupCount}건</strong></span>
          </div>
          <div className="px-3 py-2 bg-emerald-50 text-emerald-800 rounded-lg text-sm font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>진행 중: <strong>{summary.totalActiveOrders}건</strong></span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 4단 칸반 보드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const stageOrders = orders.filter((o) => o.stage === stage);
          const config = STAGE_CONFIG[stage];

          return (
            <div key={stage} className="bg-slate-50 rounded-xl p-4 flex flex-col h-[650px] border">
              <div className="flex items-center justify-between pb-3 border-b mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.badgeBg}`}>
                  {config.label}
                </span>
                <span className="text-xs font-bold text-slate-500">{stageOrders.length}건</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {stageOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">해당 주문 없음</div>
                ) : (
                  stageOrders.map((order) => {
                    const pickupTimeStr = order.pickupDateTime.replace('T', ' ').slice(5, 16);

                    return (
                      <div
                        key={order.id}
                        className="bg-white p-3.5 rounded-lg border shadow-sm space-y-2 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-medium text-slate-500">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {order.totalAmount.toLocaleString()}원
                          </span>
                        </div>

                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{order.customerName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {order.customerPhone}
                          </div>
                        </div>

                        <div className="p-2 bg-slate-50 rounded text-xs space-y-1">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="font-medium text-slate-800">
                              {it.name} × {it.quantity}개
                              {it.options && Object.keys(it.options).length > 0 && (
                                <div className="text-slate-500 font-normal pl-2">
                                  {Object.entries(it.options).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-1 text-xs font-semibold text-indigo-700">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>픽업 희망: {pickupTimeStr}</span>
                        </div>

                        {order.specialRequests && (
                          <div className="text-xs text-amber-800 bg-amber-50 p-1.5 rounded">
                            요청: {order.specialRequests}
                          </div>
                        )}

                        {config.nextStage && (
                          <button
                            onClick={() => handleAdvance(order)}
                            className="w-full mt-2 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>{config.nextLabel}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
