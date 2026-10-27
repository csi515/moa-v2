import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  evaluateTravelConflict,
  getDispatchOrderTimeRange,
  type DispatchOrderInput,
  type DispatchStatus,
} from '../domain/dispatchEngine';

interface DispatchOrderRow {
  id: string;
  tenant_id: string;
  customer_id?: string | null;
  staff_id?: string | null;
  service_name: string;
  service_address: string;
  address_detail?: string | null;
  scheduled_at: string;
  estimated_duration_min: number;
  travel_buffer_min: number;
  status: DispatchStatus;
  before_photo_url?: string | null;
  after_photo_url?: string | null;
  memo?: string | null;
}

const STATUS_BADGES: Record<DispatchStatus, { label: string; color: string }> = {
  BOOKED: { label: '예약 접수', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ASSIGNED: { label: '담당자 배정', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  EN_ROUTE: { label: '출발/이동 중', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  WORKING: { label: '현장 작업 중', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  COMPLETED: { label: '파견 완료', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  CANCELLED: { label: '취소됨', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const DispatchListPage: React.FC = () => {
  const { query } = useList<DispatchOrderRow>({
    resource: 'dispatch_orders',
    sorters: [{ field: 'scheduled_at', order: 'asc' }],
  });

  const orders = query?.data?.data ?? [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createOrder } = useCreate();
  const { mutate: updateOrder } = useUpdate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMin, setDurationMin] = useState(60);
  const [bufferMin, setBufferMin] = useState(30);
  const [memo, setMemo] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const handleOpenModal = () => {
    setServiceName('');
    setServiceAddress('');
    setAddressDetail('');
    setScheduledAt(new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16));
    setDurationMin(60);
    setBufferMin(30);
    setMemo('');
    setConflictWarning(null);
    setIsModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newOrderInput: DispatchOrderInput = {
      service_name: serviceName,
      service_address: serviceAddress,
      address_detail: addressDetail,
      scheduled_at: scheduledAt,
      estimated_duration_min: Number(durationMin),
      travel_buffer_min: Number(bufferMin),
      status: 'BOOKED',
    };

    const hasConflict = evaluateTravelConflict(orders, newOrderInput);
    if (hasConflict && !conflictWarning) {
      setConflictWarning(
        '⚠️ 기존 파견 일정 및 이동 버퍼 시간과 중복됩니다. 그래도 등록하시겠습니까?'
      );
      return;
    }

    createOrder(
      {
        resource: 'dispatch_orders',
        values: {
          service_name: serviceName,
          service_address: serviceAddress,
          address_detail: addressDetail || null,
          scheduled_at: new Date(scheduledAt).toISOString(),
          estimated_duration_min: Number(durationMin),
          travel_buffer_min: Number(bufferMin),
          status: 'BOOKED',
          memo: memo || null,
        },
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          refetch();
        },
      }
    );
  };

  const handleStatusChange = (orderId: string, nextStatus: DispatchStatus) => {
    updateOrder(
      {
        resource: 'dispatch_orders',
        id: orderId,
        values: {
          status: nextStatus,
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => refetch(),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>🚗</span>
            <span>출장 및 방문 파견 관리</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            사업주 맞춤 매장 도구: 방문 일정, 이동 버퍼 시간 자동 계산 및 지도 길안내 연동
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
        >
          + 새 출장 파견 등록
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">파견 목록을 불러오는 중...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-2">📋</span>
            <h3 className="text-base font-semibold text-slate-800">등록된 출장 파견 일정이 없습니다.</h3>
            <p className="text-sm text-slate-500 mt-1">
              신규 출장 서비스를 등록하여 이동 경로와 일정을 체계적으로 관리해보세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    서비스명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    방문 일시 / 소요 & 이동버퍼
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    방문지 주소 & 길안내
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                    상태 변경 액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {orders.map((order) => {
                  const badge = STATUS_BADGES[order.status] || STATUS_BADGES.BOOKED;
                  const { workEndTime, bufferEndTime } = getDispatchOrderTimeRange(order);
                  const encodedAddr = encodeURIComponent(order.service_address);
                  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodedAddr}`;
                  const naverMapUrl = `https://map.naver.com/v5/search/${encodedAddr}`;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">
                          {order.service_name}
                        </div>
                        {order.memo && (
                          <div className="text-xs text-slate-400 mt-0.5">{order.memo}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">
                          {new Date(order.scheduled_at).toLocaleString('ko-KR', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          작업 {order.estimated_duration_min}분 (~{workEndTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})
                          {' + '}
                          이동 {order.travel_buffer_min}분 버퍼 (~{bufferEndTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-800">
                          {order.service_address}
                          {order.address_detail && ` ${order.address_detail}`}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <a
                            href={kakaoMapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition"
                          >
                            카카오맵 길찾기
                          </a>
                          <a
                            href={naverMapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition"
                          >
                            네이버지도
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value as DispatchStatus)
                          }
                          className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="BOOKED">예약 접수</option>
                          <option value="ASSIGNED">담당자 배정</option>
                          <option value="EN_ROUTE">출발/이동 중</option>
                          <option value="WORKING">현장 작업 중</option>
                          <option value="COMPLETED">파견 완료</option>
                          <option value="CANCELLED">취소</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">새 출장 파견 등록</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">서비스명</label>
                <input
                  type="text"
                  required
                  placeholder="예: 에어컨 분해 세척, 출장 세차 등"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">방문지 주소</label>
                <input
                  type="text"
                  required
                  placeholder="예: 서울시 강남구 테헤란로 123"
                  value={serviceAddress}
                  onChange={(e) => setServiceAddress(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">상세 주소 (동/호수)</label>
                <input
                  type="text"
                  placeholder="예: 101동 1204호"
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">방문 일시</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">작업시간(분)</label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">이동버퍼(분)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={bufferMin}
                    onChange={(e) => setBufferMin(Number(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">특이사항 메모</label>
                <textarea
                  rows={2}
                  placeholder="방문 전 연락 요청 등"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {conflictWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  {conflictWarning}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  {conflictWarning ? '충돌 무시하고 등록' : '등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
