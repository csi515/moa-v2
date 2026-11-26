import React, { useState } from 'react';
import { X, Check, AlertTriangle, Sliders, Info } from 'lucide-react';
import {
  DEFAULT_WORKLOAD_THRESHOLDS,
  validateWorkloadThresholds,
  type WorkloadThresholds,
} from '../domain/workloadCapacityEngine';

interface WorkloadThresholdSettingsModalProps {
  isOpen: boolean;
  initialThresholds?: WorkloadThresholds;
  onClose: () => void;
  onSave: (thresholds: WorkloadThresholds) => void;
}

export const WorkloadThresholdSettingsModal: React.FC<WorkloadThresholdSettingsModalProps> = ({
  isOpen,
  initialThresholds = DEFAULT_WORKLOAD_THRESHOLDS,
  onClose,
  onSave,
}) => {
  const [thresholds, setThresholds] = useState<WorkloadThresholds>(initialThresholds);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGreenChange = (val: number) => {
    const next = { ...thresholds, green_max: val };
    setThresholds(next);
    const check = validateWorkloadThresholds(next);
    setValidationError(check.valid ? null : check.error || '유효하지 않은 설정입니다.');
  };

  const handleYellowChange = (val: number) => {
    const next = { ...thresholds, yellow_max: val };
    setThresholds(next);
    const check = validateWorkloadThresholds(next);
    setValidationError(check.valid ? null : check.error || '유효하지 않은 설정입니다.');
  };

  const handleReset = () => {
    setThresholds(DEFAULT_WORKLOAD_THRESHOLDS);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateWorkloadThresholds(thresholds);
    if (!check.valid) {
      setValidationError(check.error || '설정값을 확인해주세요.');
      return;
    }
    onSave(thresholds);
    onClose();
  };

  const greenWidth = Math.max(0, Math.min(100, thresholds.green_max));
  const yellowWidth = Math.max(0, Math.min(100, thresholds.yellow_max - thresholds.green_max));
  const redWidth = Math.max(0, 100 - thresholds.yellow_max);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-800 dark:bg-indigo-950 dark:text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                업무 부하 신호등 임계치 설정
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                조직 및 팀의 운영 기준에 맞추어 적정/주의/위험 구간을 동적으로 설정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 본문 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 실시간 게이지 시각화 미리보기 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>구간 미리보기 (0% ~ 100%+)</span>
              <span className="flex items-center gap-1 text-slate-500">
                <Info className="h-3.5 w-3.5" />
                적용 즉시 대시보드 반영
              </span>
            </div>

            {/* 3단 프로그레스 바 */}
            <div className="relative flex h-6 w-full overflow-hidden rounded-lg bg-slate-200 text-[10px] font-bold text-white shadow-inner dark:bg-slate-700">
              <div
                style={{ width: `${greenWidth}%` }}
                className="flex items-center justify-center bg-emerald-500 transition-all duration-200"
                title={`안전(초록): 0% ~ ${thresholds.green_max}%`}
              >
                {greenWidth > 15 && `🟢 ~${thresholds.green_max}%`}
              </div>
              <div
                style={{ width: `${yellowWidth}%` }}
                className="flex items-center justify-center bg-amber-500 transition-all duration-200"
                title={`주의(노랑): ${thresholds.green_max}% ~ ${thresholds.yellow_max}%`}
              >
                {yellowWidth > 15 && `🟡 ~${thresholds.yellow_max}%`}
              </div>
              <div
                style={{ width: `${redWidth}%` }}
                className="flex items-center justify-center bg-rose-500 transition-all duration-200"
                title={`위험(빨강): ${thresholds.yellow_max}% 초과`}
              >
                {redWidth > 12 && `🔴 ${thresholds.yellow_max}%+`}
              </div>
            </div>

            <div className="mt-2.5 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                적정 (0 ~ {thresholds.green_max}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                주의 ({thresholds.green_max} ~ {thresholds.yellow_max}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                위험 ({thresholds.yellow_max}% 초과)
              </span>
            </div>
          </div>

          {/* 슬라이더 및 입력 필드 */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  초록(적정) 상한선 (%):
                </label>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {thresholds.green_max}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                step="5"
                value={thresholds.green_max}
                onChange={(e) => handleGreenChange(Number(e.target.value))}
                className="mt-2 w-full accent-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                이 수치 이하의 업무 부하는 건강한 최적 가동률로 간주합니다.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  노랑(주의) 상한선 (%):
                </label>
                <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {thresholds.yellow_max}%
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={thresholds.yellow_max}
                onChange={(e) => handleYellowChange(Number(e.target.value))}
                className="mt-2 w-full accent-amber-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                이 수치를 초과하는 업무 부하는 즉시 빨강(과부하 위험) 경고가 발생합니다.
              </p>
            </div>
          </div>

          {/* 에러 경고 메시지 */}
          {validationError && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* 푸터 액션 */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
            >
              기본값 복원 (75% / 85%)
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={Boolean(validationError)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                설정 저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
