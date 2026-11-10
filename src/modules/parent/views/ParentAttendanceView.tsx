import React, { useState, useEffect } from 'react';
import { Ticket, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import {
  getAvailableMakeupTokensForStudent,
  getMakeupRequestsForStudent,
  type MakeupRequest,
} from '@/capabilities/makeup_lesson_pass/infrastructure/makeupLessonStorage';
import type { MakeupToken } from '@/capabilities/makeup_lesson_pass/domain/makeupLessonEngine';
import { ParentMakeupRequestModal } from '../components/ParentMakeupRequestModal';
import { Loader2, RefreshCw } from 'lucide-react';
import { StorageService } from '@/services/storage';
import { getAttendanceBadge } from '@/utils/formatters';
import {
  formatSessionTime,
  getSessionStatusLabel,
} from '@/capabilities/attendance/services/attendanceService';
import { useParentAttendanceSessions } from '@/core/parent/hooks/useParentAttendanceSessions';
import { normalizeIndustryType, type IndustryType } from '@/core/industry/types';
import {
  attendanceRecordTitle,
  parentAttendanceEmpty,
} from '@/capabilities/attendance/attendanceIndustryCopy';
import type { MakeupStatus, Student } from '@/types';
import { Section } from './shared';
import { ParentIndustryAdapter } from '@/capabilities/parent/ParentIndustryAdapter';

const MAKEUP_STATUS_LABEL: Record<MakeupStatus, string> = {
  pending: '보강 대기',
  scheduled: '보강 예정',
  completed: '보강 완료',
};

export function ParentAttendanceView({
  student,
  organizationId,
  industryType = 'piano',
}: {
  student: Student;
  organizationId: string;
  industryType?: IndustryType | string;
}) {
  const industry = normalizeIndustryType(industryType);
  const { sessions, loading, error, refresh } = useParentAttendanceSessions(
    organizationId,
    student.id,
    30
  );
  const [refreshing, setRefreshing] = useState(false);
  const [activeTokens, setActiveTokens] = useState<Array<MakeupToken & { daysRemaining: number }>>([]);
  const [makeupRequests, setMakeupRequests] = useState<MakeupRequest[]>([]);
  const [selectedTokenForRequest, setSelectedTokenForRequest] = useState<(MakeupToken & { daysRemaining: number }) | null>(null);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const tokens = getAvailableMakeupTokensForStudent(student.id, organizationId);
    const requests = getMakeupRequestsForStudent(organizationId, student.id);
    setActiveTokens(tokens);
    setMakeupRequests(requests);
  }, [student.id, organizationId, refreshing]);

  const legacyRecords = StorageService.getAttendance()
    .filter((a) => a.studentId === student.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  const policy = ParentIndustryAdapter.getPolicy(industryType);
  const makeups =
    policy.showsMakeupList
      ? StorageService.getMakeupItems()
          .filter((m) => m.studentId === student.id)
          .slice(0, 15)
      : [];

  const hasSessions = sessions.length > 0;
  const title = attendanceRecordTitle(industry, student.name);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">실시간 출결 기록</p>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={loading || refreshing}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 min-h-[44px] px-2"
        >
          {loading || refreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          새로고침
        </button>
      </div>

      {requestSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 flex items-center gap-1.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{requestSuccessMessage}</span>
        </div>
      )}

      {/* 보유 중인 보강권 티켓 섹션 (해당 학원 보강권만 표시) */}
      {activeTokens.length > 0 && (
        <Section title={`🎟️ 보유 중인 보강권 (${activeTokens.length}장)`}>
          <div className="space-y-2.5">
            {activeTokens.map((token) => {
              const pendingReq = makeupRequests.find(
                (r) => r.tokenId === token.id && r.status === 'pending'
              );
              const reasonLabel =
                token.originReason === 'advance_request'
                  ? '사전 연락 결석'
                  : token.originReason === 'instructor_cancel'
                  ? '학원 사정 휴강'
                  : '결석';

              return (
                <div
                  key={token.id}
                  className="p-3.5 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-purple-50/40 space-y-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          1회 보강권 ({reasonLabel})
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                          D-{token.daysRemaining}일 남음
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        결석일자: <strong>{token.originDate}</strong>
                        <span className="mx-1 text-slate-300">·</span>
                        유효기한: <strong>~{token.expiresAt}까지</strong>
                      </p>
                    </div>

                    {pendingReq ? (
                      <span className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        신청 검토 중 ({pendingReq.preferredDate} {pendingReq.preferredTime})
                      </span>
                    ) : token.status === 'reserved' ? (
                      <span className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 shrink-0">
                        보강 확정됨
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedTokenForRequest(token)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        보강 신청하기
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800">
          {error} (저장된 기록을 표시합니다)
        </div>
      )}

      {makeups.length > 0 && (
        <Section title="보강 현황">
          {makeups.map((m) => (
            <div key={m.attendanceId} className="py-2 border-b border-slate-50 text-sm">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-semibold text-slate-800">{m.className || '수업'}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    결석 {m.originalDate}
                    {m.makeUpDate
                      ? ` → 보강 ${m.makeUpDate}${
                          m.makeUpStartTime && m.makeUpEndTime
                            ? ` ${m.makeUpStartTime}–${m.makeUpEndTime}`
                            : ''
                        }`
                      : ''}
                  </p>
                  {(m.makeUpRoom || m.makeUpTeacherName) && (
                    <p className="text-[11px] text-indigo-600 mt-0.5">
                      {[m.makeUpRoom, m.makeUpTeacherName].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {m.absentReason && (
                    <p className="text-[11px] text-slate-500 mt-1">{m.absentReason}</p>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                    m.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : m.status === 'scheduled'
                        ? 'bg-sky-50 text-sky-700'
                        : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {MAKEUP_STATUS_LABEL[m.status]}
                </span>
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section title={title}>
        {loading && sessions.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : hasSessions ? (
          sessions.map((s) => {
            const status = getSessionStatusLabel(s);
            return (
              <div key={s.id} className="py-2 border-b border-slate-50 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-mono">{s.sessionDate}</span>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-700">{status.label}</span>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatSessionTime(s.checkInAt)}
                    </p>
                  </div>
                </div>
                {s.memo && (
                  <p className="text-[11px] text-slate-500 mt-1">메모 · {s.memo}</p>
                )}
              </div>
            );
          })
        ) : legacyRecords.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6 leading-relaxed px-2">
            {parentAttendanceEmpty(industry)}
          </p>
        ) : (
          legacyRecords.map((a) => (
            <div
              key={a.id}
              className="flex justify-between items-center py-2 border-b border-slate-50 text-sm"
            >
              <span className="font-mono">{a.date}</span>
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-bold ${getAttendanceBadge(a.status).bg}`}
              >
                {getAttendanceBadge(a.status).label}
              </span>
            </div>
          ))
        )}
      </Section>
    
      {selectedTokenForRequest && (
        <ParentMakeupRequestModal
          isOpen={!!selectedTokenForRequest}
          onClose={() => setSelectedTokenForRequest(null)}
          token={selectedTokenForRequest}
          studentId={student.id}
          studentName={student.name}
          organizationId={organizationId}
          onRequested={(req) => {
            setRequestSuccessMessage(
              `${req.preferredDate} ${req.preferredTime} 보강 신청이 원장님께 제출되었습니다.`
            );
            const updatedRequests = getMakeupRequestsForStudent(organizationId, student.id);
            setMakeupRequests(updatedRequests);
            setTimeout(() => setRequestSuccessMessage(null), 4000);
          }}
        />
      )}
</div>
  );
}
