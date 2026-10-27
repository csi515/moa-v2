import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Hammer, Plus, CheckCircle, ArrowRight, Package, Clock } from 'lucide-react';
import {
  computeOrderPayments,
  advanceCraftStage,
  validateCustomOrderInput,
  type CustomCraftOrderRecord,
  type CraftStage,
} from '../domain/customOrderEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const CustomOrderListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [customText, setCustomText] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [colorPalette, setColorPalette] = useState('');
  const [totalPrice, setTotalPrice] = useState(85000);
  const [deliveryDate, setDeliveryDate] = useState('2026-10-25');

  const { query } = useList<CustomCraftOrderRecord>({
    resource: 'custom_craft_orders',
    sorters: [{ field: 'target_delivery_date', order: 'asc' }],
    pagination: { pageSize: 20 },
  });

  const orders = (query?.data?.data as CustomCraftOrderRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createOrder } = useCreate();
  const { mutate: updateOrder } = useUpdate();

  const payPreview = computeOrderPayments(totalPrice, 50);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateCustomOrderInput(customerName, itemTitle, totalPrice);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    createOrder(
      {
        resource: 'custom_craft_orders',
        values: {
          order_number: `ORD-${Date.now().toString().slice(-4)}`,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          item_title: itemTitle.trim(),
          spec_custom_text: customText.trim() || undefined,
          spec_dimensions: dimensions.trim() || undefined,
          spec_color_palette: colorPalette.trim() || undefined,
          total_price: totalPrice,
          down_payment_paid: payPreview.requiredDownPayment,
          balance_due: payPreview.balanceDue,
          stage: 'ORDER_RECEIVED',
          target_delivery_date: deliveryDate,
          created_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`[${customerName}] 맞춤 제작 주문이 접수되었습니다.`, 'success');
          setIsModalOpen(false);
          setCustomerName('');
          setItemTitle('');
          setCustomText('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '주문 등록 실패', 'error');
        },
      }
    );
  };

  const handleAdvance = (order: CustomCraftOrderRecord) => {
    const adv = advanceCraftStage(order.stage);
    updateOrder(
      {
        resource: 'custom_craft_orders',
        id: order.id,
        values: { stage: adv.nextStage },
      },
      {
        onSuccess: () => {
          showToast(`[${order.item_title}] 공정이 [${adv.nextStage}] 단계로 진행되었습니다.`, 'success');
          refetch();
        },
      }
    );
  };

  const getStageBadge = (stage: CraftStage) => {
    switch (stage) {
      case 'ORDER_RECEIVED':
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-semibold">1. 사양 확정</span>;
      case 'IN_PRODUCTION':
        return <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-bold">2. 공방 제작중</span>;
      case 'QUALITY_INSPECTED':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 font-semibold">3. 품질 검수완료</span>;
      case 'READY_FOR_PICKUP':
        return <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800 font-bold animate-pulse">4. 픽업 대기</span>;
      case 'FULFILLED':
        return <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-bold">5. 전달 완료</span>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Hammer className="w-7 h-7 text-amber-600" />
            주문 제작 맞춤 사양서 및 단계별 공정 트래커
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            레터링 케이크, 수제 가죽/가구 등 고객 맞춤 사양 등록, 착수금/잔금 및 5단계 제작 공정을 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 맞춤 주문 접수
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">수령 희망일</th>
              <th className="p-3">주문자명</th>
              <th className="p-3">맞춤 제작 품목명</th>
              <th className="p-3">각인/커스텀 사양</th>
              <th className="p-3 text-right">총 주문금액</th>
              <th className="p-3 text-right text-rose-600 font-bold">잔금(픽업시)</th>
              <th className="p-3">공정 상태</th>
              <th className="p-3 text-right">다음 공정</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">진행 중인 주문 제작 건이 없습니다.</td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-semibold text-amber-700 dark:text-amber-400">{o.target_delivery_date}</td>
                  <td className="p-3 font-medium">{o.customer_name}</td>
                  <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{o.item_title}</td>
                  <td className="p-3 text-xs text-slate-600 max-w-xs truncate">
                    {o.spec_custom_text ? `각인: "${o.spec_custom_text}"` : o.spec_dimensions || '-'}
                  </td>
                  <td className="p-3 text-right font-medium">{o.total_price.toLocaleString()}원</td>
                  <td className="p-3 text-right font-bold text-rose-600">{o.balance_due.toLocaleString()}원</td>
                  <td className="p-3">{getStageBadge(o.stage)}</td>
                  <td className="p-3 text-right">
                    {o.stage !== 'FULFILLED' ? (
                      <button
                        onClick={() => handleAdvance(o)}
                        className="px-2.5 py-1 text-xs bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100 font-semibold inline-flex items-center gap-1"
                      >
                        공정 진행 <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">완료됨</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-amber-700">
              <Hammer className="w-5 h-5" />
              신규 맞춤 제작 주문서 접수
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">고객 성명 *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="예: 장서연"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">연락처 *</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="예: 010-8812-3344"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">주문 제작 품목명 *</label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="예: 수제 딸기 2단 생화 레터링 케이크"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">레터링 / 각인 문구</label>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="예: Happy 10th Anniversary"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">사이즈/규격</label>
                  <input
                    type="text"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="예: 2호 (지름 18cm)"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">색상/가죽톤</label>
                  <input
                    type="text"
                    value={colorPalette}
                    onChange={(e) => setColorPalette(e.target.value)}
                    placeholder="예: 파스텔 핑크 & 화이트"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">총 제작 금액(원) *</label>
                  <input
                    type="number"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">수령 희망일자 *</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>착수 계약금 (50% 선납):</span>
                  <span className="font-bold text-emerald-600">{payPreview.requiredDownPayment.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>수령 시 결제 잔금 (50%):</span>
                  <span className="font-bold text-rose-600">{payPreview.balanceDue.toLocaleString()}원</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                >
                  주문서 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
