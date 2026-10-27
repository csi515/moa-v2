import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  isOfferExpired,
  sortWaitlistQueue,
  type BookingWaitlistEntry,
  type WaitlistStatus,
} from '../domain/waitlistEngine';

const STATUS_BADGES: Record<WaitlistStatus, { label: string; color: string }> = {
  WAITING: { label: '순번 대기 중', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  OFFERED: { label: '자리 제안 발송됨', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONVERTED: { label: '예약 확정 완료', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  EXPIRED: { label: '제안 시간 만료', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const WaitlistPage: React.FC = () => {
  const { query } = useList<BookingWaitlistEntry>({
    resource: 'booking_waitlists',
    sorters: [
      { field: 'booking_slot_id', order: 'asc' },
      { field: 'queue_order', order: 'asc' },
    ],
  });

  const rawEntries = query?.data?.data ?? [];
  const entries = sortWaitlistQueue(rawEntries);
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createEntry } = useCreate();
  const { mutate: updateEntry } = useUpdate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [slotId, setSlotId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [queueOrder, setQueueOrder] = useState(1);

  const handleOpenModal = () => {
    setSlotId('');
    setCustomerId('');
    setQueueOrder(entries.length + 1);
    setIsModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotId || !customerId) return;

    createEntry(
      {
        resource: 'booking_waitlists',
        values: {
          booking_slot_id: slotId,
          customer_id: customerId,
          queue_order: Number(queueOrder),
          status: 'WAITING',
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

  const handleOfferSlot = (entry: BookingWaitlistEntry) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30분 유효시간

    updateEntry(
      {
        resource: 'booking_waitlists',
        id: entry.id!,
        values: {
          status: 'OFFERED',
          offered_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: now.toISOString(),
        },
      },
      {
        onSuccess: () => refetch(),
      }
    );
  };

  const handleConvertBooking = (entry: BookingWaitlistEntry) => {
    updateEntry(
      {
        resource: 'booking_waitlists',
        id: entry.id!,
        values: {
          status: 'CONVERTED',
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => refetch(),
      }
    );
  };

  const handleExpireOffer = (entry: BookingWaitlistEntry) => {
    updateEntry(
      {
        resource: 'booking_waitlists',
        id: entry.id!,
        values: {
          status: 'EXPIRED',
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
            <span>⏳</span>
            <span>시간표/수업 마감 취소 대기열 관리</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            사업주 맞춤 매장 도구: 수업 마감 시 취소 공석을 선착순(FIFO) 자동 제안 및 공석 손실 방지
          </p>
        </div>
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
        >
          + 대기자 수동 등록
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">대기열 목록을 불러오는 중...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-2">🎟️</span>
            <h3 className="text-base font-semibold text-slate-800">현재 대기 중인 고객이 없습니다.</h3>
            <p className="text-sm text-slate-500 mt-1">
              마감된 시간표에 취소 공석이 발생하면 선착순 대기자에게 우선 제안할 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    순번
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    대상 시간표/슬롯 ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    고객 식별번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    제안 발송 & 만료 시각
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                    관리 액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {entries.map((entry) => {
                  const badge = STATUS_BADGES[entry.status] || STATUS_BADGES.WAITING;
                  const expired =
                    entry.status === 'OFFERED' && isOfferExpired(entry.offered_at, 30);

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-900">
                          #{entry.queue_order}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        {expired && (
                          <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                            만료됨
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {entry.booking_slot_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono text-xs">
                        {entry.customer_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {entry.offered_at ? (
                          <div>
                            <div>
                              제안:{' '}
                              {new Date(entry.offered_at).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            {entry.expires_at && (
                              <div className="text-slate-400">
                                만료:{' '}
                                {new Date(entry.expires_at).toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">미발송</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                        {entry.status === 'WAITING' && (
                          <button
                            onClick={() => handleOfferSlot(entry)}
                            className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition"
                          >
                            자리 제안
                          </button>
                        )}
                        {entry.status === 'OFFERED' && (
                          <>
                            <button
                              onClick={() => handleConvertBooking(entry)}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition"
                            >
                              예약 확정
                            </button>
                            <button
                              onClick={() => handleExpireOffer(entry)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition"
                            >
                              만료 처리
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">대기자 수동 등록</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  시간표 슬롯 식별자 (Slot ID)
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: slot-pilates-20261019-10"
                  value={slotId}
                  onChange={(e) => setSlotId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  고객 ID / 회원 번호
                </label>
                <input
                  type="text"
                  required
                  placeholder="고객 UUID 또는 회원 ID"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">대기 순번</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={queueOrder}
                  onChange={(e) => setQueueOrder(Number(e.target.value))}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

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
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
