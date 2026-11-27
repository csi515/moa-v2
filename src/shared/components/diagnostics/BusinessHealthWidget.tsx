/**
 * Moa-v2 업종별 경영 건전성 자동 진단(Business Health Diagnostic) 위젯.
 *
 * 사장님이 대시보드에 들어왔을 때, 매장 운영 상태를 단순 통계가 아닌
 * 직관적인 건전성 점수와 '오늘의 처방 액션'으로 명쾌하게 안내한다.
 */

import React, { useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  evaluateBusinessHealth,
  type BusinessDiagnosticInput,
  type HealthMetricItem,
} from '@/core/diagnostics/businessHealthEngine';

export interface BusinessHealthWidgetProps {
  industryType?: string;
  diagnosticInput: BusinessDiagnosticInput;
  onNavigate?: (tab: string) => void;
  className?: string;
}

export const BusinessHealthWidget: React.FC<BusinessHealthWidgetProps> = ({
  industryType = 'general',
  diagnosticInput,
  onNavigate,
  className = '',
}) => {
  const report = useMemo(
    () => evaluateBusinessHealth(industryType, diagnosticInput),
    [industryType, diagnosticInput]
  );

  const gradeColorStyles = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badge: 'bg-emerald-600 text-white',
      text: 'text-emerald-700',
      progress: 'bg-emerald-500',
    },
    indigo: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      badge: 'bg-slate-900 text-white',
      text: 'text-slate-700',
      progress: 'bg-slate-900',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badge: 'bg-amber-600 text-white',
      text: 'text-amber-800',
      progress: 'bg-amber-500',
    },
    rose: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      badge: 'bg-rose-600 text-white',
      text: 'text-rose-700',
      progress: 'bg-rose-500',
    },
  }[report.gradeColor];

  const renderMetricStatusBadge = (status: HealthMetricItem['status']) => {
    switch (status) {
      case 'good':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-md">
            <CheckCircle2 className="w-3 h-3" />
            우수
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded-md">
            <AlertTriangle className="w-3 h-3" />
            주의
          </span>
        );
      case 'danger':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-rose-100 text-rose-800 rounded-md">
            <AlertTriangle className="w-3 h-3" />
            경고
          </span>
        );
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6 ${className}`}>
      {/* 1. 상단 종합 점수 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-50 text-slate-800 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              우리 매장 경영 건전성 자동 진단
            </h2>
            <span className={`px-2.5 py-0.5 text-xs font-black rounded-full ${gradeColorStyles.badge}`}>
              {report.gradeLabel} ({report.overallScore}점)
            </span>
          </div>
          <p className="text-xs text-slate-500 pl-8">
            {report.summaryHeadline}
          </p>
        </div>

        {/* 진행 바 게이지 */}
        <div className="sm:w-48 bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${gradeColorStyles.progress}`}
            style={{ width: `${report.overallScore}%` }}
          />
        </div>
      </div>

      {/* 2. 업종별 핵심 KPI 지표 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {report.metrics.map((metric) => (
          <div
            key={metric.id}
            className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">{metric.name}</span>
              {renderMetricStatusBadge(metric.status)}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{metric.formattedValue}</span>
              <span className="text-[11px] text-slate-400 font-medium">/ 기준 {metric.benchmark}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {metric.feedback}
            </p>
          </div>
        ))}
      </div>

      {/* 3. 사장님을 위한 맞춤 처방 액션 */}
      {report.prescriptions.length > 0 && (
        <div className="rounded-2xl bg-slate-50/50 border border-slate-200 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wide">
            <Zap className="w-3.5 h-3.5 text-slate-800" />
            <span>오늘의 자동 처방 피드백 (Action Tip)</span>
          </div>

          <div className="space-y-2">
            {report.prescriptions.map((prescription, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200/70 text-xs shadow-2xs"
              >
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    {prescription.priority === 'high' && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-rose-100 text-rose-700 rounded font-semibold">
                        중요
                      </span>
                    )}
                    {prescription.title}
                  </div>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    {prescription.description}
                  </p>
                </div>

                {prescription.actionLabel && prescription.actionTargetTab && onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate(prescription.actionTargetTab!)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors shrink-0 self-start sm:self-center"
                  >
                    <span>{prescription.actionLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
