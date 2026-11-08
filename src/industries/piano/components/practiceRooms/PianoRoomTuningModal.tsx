import React, { useState, useEffect, type FC } from 'react';
import { Wrench, CheckCircle2, AlertTriangle, X, Clock, Calendar, Sparkles } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import {
  type RoomTuningRecord,
  type PianoInstrumentType,
  PIANO_TYPE_LABELS,
  PIANO_ISSUE_CHIPS,
  calculateTuningDDay,
  saveRoomTuningRecord,
  markRoomTunedToday,
} from './pianoTuningHelpers';

export interface PianoRoomTuningModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RoomTuningRecord;
  onSaved: (updatedRecord: RoomTuningRecord) => void;
}

export const PianoRoomTuningModal: FC<PianoRoomTuningModalProps> = ({
  isOpen,
  onClose,
  record,
  onSaved,
}) => {
  const [currentRecord, setCurrentRecord] = useState<RoomTuningRecord>(record);
  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setCurrentRecord(record);
  }, [record]);

  if (!isOpen) return null;

  const tuningStatus = calculateTuningDDay(
    currentRecord.lastTunedAt,
    currentRecord.tuningCycleMonths || 6,
    todayIso
  );

  const handleToggleIssueChip = (chip: string) => {
    const existing = currentRecord.issueNotes || '';
    if (existing.includes(chip)) {
      const removed = existing
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== chip && Boolean(s))
        .join(', ');
      setCurrentRecord({ ...currentRecord, issueNotes: removed });
    } else {
      const appended = existing.trim() ? `${existing.trim()}, ${chip}` : chip;
      setCurrentRecord({ ...currentRecord, issueNotes: appended });
    }
  };

  const handleMarkTunedToday = () => {
    const updated = markRoomTunedToday(currentRecord, todayIso);
    setCurrentRecord(updated);
    onSaved(updated);
    onClose();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveRoomTuningRecord(currentRecord);
    onSaved(currentRecord);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={`${currentRecord.roomName} · 피아노 조율 & 건반 점검`} maxWidth="md">
      <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
        {/* 상단 조율 D-day 브리핑 배너 */}
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
            tuningStatus.status === 'overdue'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : tuningStatus.status === 'upcoming'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
              {tuningStatus.status === 'overdue' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              ) : (
                <Wrench className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <div>
              <p className="font-black text-sm">{tuningStatus.statusText}</p>
              <p className="text-[11px] opacity-80 mt-0.5">
                다음 예정일: {tuningStatus.nextTuningDate} (권장 주기 {currentRecord.tuningCycleMonths}개월)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleMarkTunedToday}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-black text-xs transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            오늘 조율 완료
          </button>
        </div>

        {/* 1. 피아노 악기 종류 선택 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            피아노 종류
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['grand', 'upright', 'digital'] as PianoInstrumentType[]).map((type) => {
              const active = currentRecord.pianoType === type;
              const info = PIANO_TYPE_LABELS[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCurrentRecord({ ...currentRecord, pianoType: type })}
                  className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-sm mb-0.5">{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 최근 조율 일자 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              최근 조율 일자
            </label>
            <input
              type="date"
              value={currentRecord.lastTunedAt}
              onChange={(e) => setCurrentRecord({ ...currentRecord, lastTunedAt: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl min-h-[40px] font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              조율 권장 주기
            </label>
            <select
              value={currentRecord.tuningCycleMonths}
              onChange={(e) => setCurrentRecord({ ...currentRecord, tuningCycleMonths: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl min-h-[40px] font-semibold"
            >
              <option value={3}>3개월 (연주회/콩쿠르 집중실)</option>
              <option value={6}>6개월 (일반 학원 표준)</option>
              <option value={12}>12개월 (1년 1회)</option>
            </select>
          </div>
        </div>

        {/* 3. 이상 건반 / 페달 점검 메모 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span>건반 및 악기 이상 메모</span>
            <span className="text-[10px] text-slate-400 font-normal">조율사 방문 시 리스트 확인용</span>
          </label>
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {PIANO_ISSUE_CHIPS.map((chip) => {
              const selected = (currentRecord.issueNotes || '').includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleToggleIssueChip(chip)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  +{chip}
                </button>
              );
            })}
          </div>
          <textarea
            rows={2}
            value={currentRecord.issueNotes || ''}
            onChange={(e) => setCurrentRecord({ ...currentRecord, issueNotes: e.target.value })}
            placeholder="예: 3옥타브 솔 건반 뻑뻑함, 서스테인 페달 삐걱거림"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
          />
        </div>

        {/* 풋터 버튼 */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            닫기
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
          >
            저장하기
          </button>
        </div>
      </form>
    </Modal>
  );
};
