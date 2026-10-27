import React, { useState } from 'react';
import { Student } from '@/types';
import { X, AlertCircle, Check } from 'lucide-react';

interface AbsentReasonModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const COMMON_REASONS = [
  '감기 / 병원 진료',
  '학교 시험 / 방과후 수업',
  '가족 행사 / 여행',
  '개인 사정 / 기타',
  '무단 결석 / 연락 안됨'
];

export const AbsentReasonModal: React.FC<AbsentReasonModalProps> = ({
  isOpen,
  student,
  onClose,
  onConfirm
}) => {
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  if (!isOpen || !student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customReason.trim() || selectedReason;
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                결석 사유 입력
              </h3>
              <p className="text-xs text-slate-500">
                {student.name} 학생 ({student.school} {student.grade})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              자주 쓰는 결석 사유 선택
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {COMMON_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setSelectedReason(reason);
                    setCustomReason('');
                  }}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between ${
                    selectedReason === reason && !customReason
                      ? 'bg-rose-50 border-rose-300 text-rose-800 ring-1 ring-rose-400'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{reason}</span>
                  {selectedReason === reason && !customReason && (
                    <Check className="w-3.5 h-3.5 text-rose-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              직접 입력 (선택 사항)
            </label>
            <input
              type="text"
              placeholder="직접 사유 입력 시 여기에 작성..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              결석 처리 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
