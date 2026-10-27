import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Volume2, Plus, Clock, Play, Bell, Calendar } from 'lucide-react';
import {
  validateScheduleInput,
  type BroadcastScheduleRecord,
  type BroadcastType,
} from '../domain/soundBroadcastEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export const SoundBroadcastListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetTime, setTargetTime] = useState('21:30');
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('CLOSING_ANNOUNCEMENT');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [volume, setVolume] = useState(80);
  const [ttsText, setTtsText] = useState('');

  const { query } = useList<BroadcastScheduleRecord>({
    resource: 'broadcast_schedules',
    sorters: [{ field: 'target_time', order: 'asc' }],
    pagination: { pageSize: 20 },
  });

  const schedules = (query?.data?.data as BroadcastScheduleRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createSchedule } = useCreate();
  const { mutate: updateSchedule } = useUpdate();

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateScheduleInput(title, targetTime, selectedDays);
    if (!validation.isValid) {
      showToast(validation.error || '입력 오류', 'error');
      return;
    }

    createSchedule(
      {
        resource: 'broadcast_schedules',
        values: {
          title: title.trim(),
          target_time: targetTime,
          broadcast_type: broadcastType,
          days_of_week: selectedDays,
          volume_percent: volume,
          tts_text: ttsText.trim() || undefined,
          is_active: true,
        },
      },
      {
        onSuccess: () => {
          showToast('안내방송 스케줄이 등록되었습니다.', 'success');
          setIsModalOpen(false);
          setTitle('');
          setTtsText('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '스케줄 등록 실패', 'error');
        },
      }
    );
  };

  const handleTestPlay = (sch: BroadcastScheduleRecord) => {
    // Web Audio / SpeechSynthesis 테스트
    if ('speechSynthesis' in window && sch.tts_text) {
      const utter = new SpeechSynthesisUtterance(sch.tts_text);
      utter.volume = sch.volume_percent / 100;
      window.speechSynthesis.speak(utter);
      showToast(`[${sch.title}] 테스트 음성을 재생합니다.`, 'info');
    } else {
      showToast(`[${sch.title}] 차임벨 신호음을 시뮬레이션 재생합니다.`, 'info');
    }
  };

  const toggleActive = (sch: BroadcastScheduleRecord) => {
    updateSchedule(
      {
        resource: 'broadcast_schedules',
        id: sch.id,
        values: { is_active: !sch.is_active },
      },
      {
        onSuccess: () => {
          showToast(`스케줄이 ${!sch.is_active ? '활성화' : '비활성화'}되었습니다.`, 'success');
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
            <Volume2 className="w-7 h-7 text-cyan-600" />
            원내 시보·안내방송 타임테이블 스케줄러
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            수업 시작/종료 타임 종소리, 마감 예고 등 정기 안내방송 타임테이블을 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 방송 스케줄 추가
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">재생 시각</th>
              <th className="p-3">방송명</th>
              <th className="p-3">반복 요일</th>
              <th className="p-3">음량</th>
              <th className="p-3">상태</th>
              <th className="p-3 text-right">제어</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : schedules.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">등록된 안내방송 스케줄이 없습니다.</td>
              </tr>
            ) : (
              schedules.map((sch) => (
                <tr key={sch.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-mono font-bold text-cyan-700 dark:text-cyan-400 text-base">
                    {sch.target_time}
                  </td>
                  <td className="p-3 font-semibold">
                    {sch.title}
                    {sch.tts_text && <p className="text-xs font-normal text-slate-400 mt-0.5">"{sch.tts_text}"</p>}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {DAY_LABELS.map((dayLabel, idx) => (
                        <span
                          key={idx}
                          className={`w-5 h-5 flex items-center justify-center text-xs rounded-full font-medium ${
                            sch.days_of_week.includes(idx)
                              ? 'bg-cyan-100 text-cyan-800 font-bold'
                              : 'text-slate-300'
                          }`}
                        >
                          {dayLabel}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-slate-500">{sch.volume_percent}%</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleActive(sch)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        sch.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {sch.is_active ? 'ON 활성' : 'OFF 일시정지'}
                    </button>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button
                      onClick={() => handleTestPlay(sch)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium inline-flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> 테스트 청취
                    </button>
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
              <Volume2 className="w-5 h-5 text-cyan-600" />
              신규 안내방송 스케줄 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">방송 타이틀 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 마감 30분 전 퇴실 준비 안내"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">재생 시각 (HH:mm) *</label>
                  <input
                    type="time"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">방송 음량(%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">반복 요일 선택 *</label>
                <div className="flex justify-between gap-1">
                  {DAY_LABELS.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-semibold border ${
                        selectedDays.includes(idx)
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">음성 안내 문구 (TTS 텍스트)</label>
                <textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="예: 이용자 여러분 안녕하십니까. 잠시 후 10시에 매장이 마감되오니 개인 소지품을 챙겨주시기 바랍니다."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={3}
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
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700"
                >
                  스케줄 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
