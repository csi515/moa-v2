import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Key, Plus, Car, CheckCircle, Clock } from 'lucide-react';
import {
  validateVehicleNumber,
  validateSlotAvailability,
  transitionValetStatus,
  type ValetTicketRecord,
} from '../domain/valetKeyEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const ValetKeyListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [slotNumber, setSlotNumber] = useState(1);
  const [valetFee, setValetFee] = useState(3000);
  const [scratchNotes, setScratchNotes] = useState('');

  const { query } = useList<ValetTicketRecord>({
    resource: 'valet_tickets',
    sorters: [{ field: 'parked_at', order: 'desc' }],
    pagination: { pageSize: 30 },
  });

  const tickets = (query?.data?.data as ValetTicketRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createTicket } = useCreate();
  const { mutate: updateTicket } = useUpdate();

  const occupiedSlots = tickets
    .filter((t) => t.status !== 'DELIVERED')
    .map((t) => t.slot_number);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const vCheck = validateVehicleNumber(vehicleNumber);
    if (!vCheck.isValid) {
      showToast(vCheck.error || '차량 번호 오류', 'error');
      return;
    }
    const slotCheck = validateSlotAvailability(slotNumber, occupiedSlots, 50);
    if (!slotCheck.isAvailable) {
      showToast(slotCheck.error || '슬롯 오류', 'error');
      return;
    }

    createTicket(
      {
        resource: 'valet_tickets',
        values: {
          ticket_number: `V-${Date.now().toString().slice(-4)}`,
          slot_number: slotNumber,
          vehicle_number: vehicleNumber.trim(),
          vehicle_model: vehicleModel.trim() || undefined,
          scratch_notes: scratchNotes.trim() || undefined,
          valet_fee: valetFee,
          is_fee_paid: true,
          status: 'PARKED',
          parked_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`차량 [${vehicleNumber}] 입차 완료 (키 슬롯: ${slotNumber}번)`, 'success');
          setIsModalOpen(false);
          setVehicleNumber('');
          setVehicleModel('');
          setScratchNotes('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '입차 등록 실패', 'error');
        },
      }
    );
  };

  const handleStatusChange = (ticket: ValetTicketRecord, action: 'REQUEST_DISPATCH' | 'DELIVER_KEY') => {
    const res = transitionValetStatus(ticket.status, action);
    if (!res.isAllowed) {
      showToast(res.error || '작업 불가', 'error');
      return;
    }

    updateTicket(
      {
        resource: 'valet_tickets',
        id: ticket.id,
        values: {
          status: res.nextStatus,
          delivered_at: action === 'DELIVER_KEY' ? new Date().toISOString() : undefined,
        },
      },
      {
        onSuccess: () => {
          showToast(action === 'DELIVER_KEY' ? '차량 키 인도 완료' : '출차 요청 접수됨', 'success');
          refetch();
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Key className="w-7 h-7 text-amber-600" />
            차량 키 및 발렛 입출차 보관 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            발렛 입차 차량 키 슬롯 번호 매핑 및 출차 인도 상태를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 발렛 입차 등록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">슬롯 번호</th>
              <th className="p-3">티켓 번호</th>
              <th className="p-3">차량 번호 / 차종</th>
              <th className="p-3">입차 일시</th>
              <th className="p-3">외관 특이사항</th>
              <th className="p-3">상태</th>
              <th className="p-3 text-right">출차 작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">보관 중인 차량 키가 없습니다.</td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-bold text-amber-600">No. {t.slot_number}</td>
                  <td className="p-3 font-mono">{t.ticket_number}</td>
                  <td className="p-3 font-semibold">
                    {t.vehicle_number} <span className="text-xs font-normal text-slate-400">({t.vehicle_model || '차종미입력'})</span>
                  </td>
                  <td className="p-3 text-slate-500">{new Date(t.parked_at).toLocaleTimeString('ko-KR')}</td>
                  <td className="p-3 text-xs text-slate-400">{t.scratch_notes || '-'}</td>
                  <td className="p-3">
                    {t.status === 'PARKED' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-medium">키 보관중</span>
                    )}
                    {t.status === 'DISPATCH_REQUESTED' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 font-bold animate-pulse">출차 요청됨</span>
                    )}
                    {t.status === 'DELIVERED' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">인도 완료</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {t.status === 'PARKED' && (
                      <button
                        onClick={() => handleStatusChange(t, 'REQUEST_DISPATCH')}
                        className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-medium"
                      >
                        출차 요청
                      </button>
                    )}
                    {t.status === 'DISPATCH_REQUESTED' && (
                      <button
                        onClick={() => handleStatusChange(t, 'DELIVER_KEY')}
                        className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
                      >
                        키 인도 완료
                      </button>
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
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Car className="w-5 h-5 text-amber-600" />
              신규 발렛 입차 접수
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">차량 번호 *</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="예: 12가 3456"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">차종/모델</label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="예: 제네시스 G80"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">키 보관함 슬롯 번호 *</label>
                  <input
                    type="number"
                    value={slotNumber}
                    onChange={(e) => setSlotNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-amber-700"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">외관 스크래치/특이사항</label>
                <textarea
                  value={scratchNotes}
                  onChange={(e) => setScratchNotes(e.target.value)}
                  placeholder="예: 조수석 범퍼 하단 미세 긁힘 있음"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={2}
                />
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
                  입차 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
