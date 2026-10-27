import React from 'react';
import { useList, useUpdate } from '@refinedev/core';
import {
  transitionTurnaroundState,
  type TurnaroundStatus,
  type TurnaroundChecklistItem,
} from '../domain/spaceTurnaroundEngine';

interface TurnaroundRow {
  id: string;
  room_name: string;
  service_start_at: string;
  service_end_at: string;
  buffer_minutes: number;
  buffer_end_at: string;
  status: TurnaroundStatus;
  checklist: TurnaroundChecklistItem[];
}

const STATUS_BADGES: Record<TurnaroundStatus, { label: string; color: string }> = {
  in_service: { label: '고객 이용 중', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  cleaning_needed: { label: '퇴실 ➔ 정비 필요', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  cleaning_in_progress: { label: '청소·환기 진행 중', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ready_for_next: { label: '다음 입실 준비 완료', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const SpaceTurnaroundView: React.FC = () => {
  const { query } = useList<TurnaroundRow>({
    resource: 'space_turnarounds',
    sorters: [{ field: 'buffer_end_at', order: 'asc' }],
  });

  const rooms = query?.data?.data ?? [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: updateTurnaround } = useUpdate();

  const handleAction = (row: TurnaroundRow, action: 'checkout' | 'start_cleaning' | 'complete_cleaning' | 'checkin_next') => {
    const checklistForAction =
      action === 'complete_cleaning'
        ? row.checklist
        : row.checklist;
    const result = transitionTurnaroundState(row.status, action, checklistForAction);

    if (!result.allowed) {
      alert(result.error);
      return;
    }

    updateTurnaround(
      {
        resource: 'space_turnarounds',
        id: row.id,
        values: {
          status: result.nextStatus,
          checklist: checklistForAction,
          cleaned_at: result.cleanedAt ?? null,
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => refetch(),
      }
    );
  };

  if (isLoading) {
    return <div className="p-6 text-slate-500">공간 정비 현황을 불러오는 중...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">공간 턴어라운드 및 정비 버퍼 보드</h1>
          <p className="text-sm text-slate-500 mt-1">
            예약 종료 후 15분 청소/정비 버퍼를 확보하여 룸 간 예약 충돌을 방지하고 정비 완료를 확인합니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
            현재 등록된 공간 턴어라운드 작업이 없습니다.
          </div>
        ) : (
          rooms.map((room) => {
            const badge = STATUS_BADGES[room.status] || STATUS_BADGES.in_service;
            return (
              <div
                key={room.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">{room.room_name}</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>이용 종료 예정:</span>
                    <strong className="text-slate-900">{new Date(room.service_end_at).toLocaleTimeString()}</strong>
                  </div>
                  <div className="flex justify-between text-indigo-600 font-medium">
                    <span>정비 버퍼 만료 (+{room.buffer_minutes}분):</span>
                    <strong>{new Date(room.buffer_end_at).toLocaleTimeString()}</strong>
                  </div>
                </div>

                {room.status === 'cleaning_in_progress' && room.checklist?.length > 0 ? (
                  <ul className="space-y-1 text-xs text-slate-700">
                    {room.checklist.map((item) => (
                      <li key={item.id}>
                        <label className="inline-flex min-h-11 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(item.done)}
                            onChange={() => {
                              const next = room.checklist.map((entry) =>
                                entry.id === item.id ? { ...entry, done: !entry.done } : entry,
                              );
                              updateTurnaround(
                                {
                                  resource: 'space_turnarounds',
                                  id: room.id,
                                  values: { checklist: next, updated_at: new Date().toISOString() },
                                },
                                { onSuccess: () => refetch() },
                              );
                            }}
                          />
                          {item.item}
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  {room.status === 'in_service' && (
                    <button
                      onClick={() => handleAction(room, 'checkout')}
                      className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600"
                    >
                      고객 퇴실 ➔ 정비 전환
                    </button>
                  )}
                  {room.status === 'cleaning_needed' && (
                    <button
                      onClick={() => handleAction(room, 'start_cleaning')}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700"
                    >
                      청소·환기 시작
                    </button>
                  )}
                  {room.status === 'cleaning_in_progress' && (
                    <button
                      onClick={() => handleAction(room, 'complete_cleaning')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                    >
                      정비 완료 ➔ 입실 대기
                    </button>
                  )}
                  {room.status === 'ready_for_next' && (
                    <button
                      onClick={() => handleAction(room, 'checkin_next')}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                    >
                      다음 고객 체크인
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
