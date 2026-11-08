import React, { useState, useMemo, useEffect } from 'react';
import {
  RecitalQuickEntry,
  RecitalStatus,
  RECITAL_STATUS_LABELS,
  calculateRecitalBoardStats,
  buildRecitalQuickEntries,
  saveRecitalQuickEntry,
  filterRecitalEntries,
} from './recitalQuickBoardHelpers';
import type { AcademyEvent } from '@/core/events';
import {
  CheckCircle2,
  HelpCircle,
  XCircle,
  Users,
  Search,
  Sparkles,
  RefreshCw,
  Coins,
  Music,
} from 'lucide-react';

interface PianoRecitalQuickBoardProps {
  event: AcademyEvent;
  students: Array<{ id: string; name: string; grade?: string; level?: string }>;
  onSyncParticipants: (studentIds: string[]) => void;
  className?: string;
}

export const PianoRecitalQuickBoard: React.FC<PianoRecitalQuickBoardProps> = ({
  event,
  students,
  onSyncParticipants,
  className = '',
}) => {
  const [entries, setEntries] = useState<RecitalQuickEntry[]>([]);
  const [filter, setFilter] = useState<'all' | RecitalStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);

  // 초기 엔트리 빌드
  useEffect(() => {
    const initial = buildRecitalQuickEntries(event.id, students, event.participantIds || []);
    setEntries(initial);
    setHasUnsyncedChanges(false);
  }, [event.id, students, event.participantIds]);

  // 실시간 통계
  const stats = useMemo(() => calculateRecitalBoardStats(entries), [entries]);

  // 필터링된 엔트리
  const filtered = useMemo(
    () => filterRecitalEntries(entries, filter, searchQuery),
    [entries, filter, searchQuery]
  );

  // 상태 변경 핸들러
  const handleStatusChange = (studentId: string, nextStatus: RecitalStatus) => {
    setEntries((prev) => {
      const updated = prev.map((e) => {
        if (e.studentId === studentId) {
          const nextEntry = { ...e, status: nextStatus };
          saveRecitalQuickEntry(event.id, nextEntry);
          return nextEntry;
        }
        return e;
      });
      return updated;
    });
    setHasUnsyncedChanges(true);
  };

  // 참가곡 입력 핸들러
  const handlePieceChange = (studentId: string, pieceTitle: string) => {
    setEntries((prev) => {
      const updated = prev.map((e) => {
        if (e.studentId === studentId) {
          const nextEntry = { ...e, pieceTitle };
          saveRecitalQuickEntry(event.id, nextEntry);
          return nextEntry;
        }
        return e;
      });
      return updated;
    });
  };

  // 참가비 납부 토글 핸들러
  const handleFeePaidToggle = (studentId: string) => {
    setEntries((prev) => {
      const updated = prev.map((e) => {
        if (e.studentId === studentId) {
          const nextEntry = { ...e, feePaid: !e.feePaid };
          saveRecitalQuickEntry(event.id, nextEntry);
          return nextEntry;
        }
        return e;
      });
      return updated;
    });
  };

  // 행사 공식 참가자로 동기화
  const handleSyncToEvent = () => {
    const participatingIds = entries
      .filter((e) => e.status === 'participating')
      .map((e) => e.studentId);
    onSyncParticipants(participatingIds);
    setHasUnsyncedChanges(false);
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden ${className}`}>
      {/* 헤더 및 통계 요약 */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                실시간 1터치 참가 취합 보드
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              학부모 상담 및 설문 취합 시 원터치로 참가/고민중/불참을 분류하고 행사 참가자로 즉시 동기화합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncToEvent}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs ${
              hasUnsyncedChanges
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-300 animate-pulse'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            참가 확정자({stats.participatingCount}명) 행사 동기화
          </button>
        </div>

        {/* 참가율 프로그레스 & 4대 통계 칩 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              전체 재원생 참가 신청률
            </span>
            <span className="font-black text-indigo-700 text-sm">
              {stats.participationRate}%{' '}
              <span className="text-xs font-normal text-slate-500">
                ({stats.participatingCount}/{stats.totalCount}명 확정)
              </span>
            </span>
          </div>
          <div className="h-2.5 bg-slate-200/70 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${(stats.participatingCount / (stats.totalCount || 1)) * 100}%` }}
              title={`참가 확정: ${stats.participatingCount}명`}
            />
            <div
              className="bg-amber-400 transition-all duration-300"
              style={{ width: `${(stats.pendingCount / (stats.totalCount || 1)) * 100}%` }}
              title={`고민 중: ${stats.pendingCount}명`}
            />
            <div
              className="bg-slate-300 transition-all duration-300"
              style={{ width: `${(stats.declinedCount / (stats.totalCount || 1)) * 100}%` }}
              title={`불참: ${stats.declinedCount}명`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded-xl bg-white/80 border border-emerald-100 flex items-center justify-between">
              <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                참가 확정
              </span>
              <span className="text-xs font-black text-emerald-700">{stats.participatingCount}명</span>
            </div>
            <div className="p-2 rounded-xl bg-white/80 border border-amber-100 flex items-center justify-between">
              <span className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                고민 중
              </span>
              <span className="text-xs font-black text-amber-700">{stats.pendingCount}명</span>
            </div>
            <div className="p-2 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                불참
              </span>
              <span className="text-xs font-black text-slate-600">{stats.declinedCount}명</span>
            </div>
            <div className="p-2 rounded-xl bg-white/80 border border-indigo-100 flex items-center justify-between">
              <span className="text-[11px] text-indigo-800 font-semibold flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-indigo-600" />
                참가비 완납
              </span>
              <span className="text-xs font-black text-indigo-700">
                {stats.feePaidCount}/{stats.participatingCount}명
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 탭 & 검색바 */}
      <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-[34px] px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            전체 ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('participating')}
            className={`min-h-[34px] px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              filter === 'participating'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <span>🟢</span> 참가 ({stats.participatingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`min-h-[34px] px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              filter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <span>🟡</span> 고민중 ({stats.pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('declined')}
            className={`min-h-[34px] px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              filter === 'declined'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>⚪</span> 불참 ({stats.declinedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="학생명, 곡명, 학년 검색..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 원생 취합 리스트 */}
      <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            해당 조건의 원생이 없습니다.
          </div>
        ) : (
          filtered.map((entry) => {
            const isParticipating = entry.status === 'participating';
            return (
              <div
                key={entry.studentId}
                className={`p-3 sm:px-5 sm:py-3.5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isParticipating ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-slate-50/70'
                }`}
              >
                {/* 학생 기본 정보 */}
                <div className="flex items-center gap-3 min-w-[160px]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{entry.studentName}</span>
                      {entry.grade && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {entry.grade}
                        </span>
                      )}
                      {entry.level && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
                          {entry.level}
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-block text-[10px] font-bold px-1.5 py-0.2 mt-1 rounded border ${
                        RECITAL_STATUS_LABELS[entry.status].badgeClass
                      }`}
                    >
                      {RECITAL_STATUS_LABELS[entry.status].icon} {RECITAL_STATUS_LABELS[entry.status].label}
                    </span>
                  </div>
                </div>

                {/* 원터치 상태 선택 3버튼 */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(entry.studentId, 'participating')}
                    className={`min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      entry.status === 'participating'
                        ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-700'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    🟢 참가
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(entry.studentId, 'pending')}
                    className={`min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      entry.status === 'pending'
                        ? 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-600'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                    }`}
                  >
                    🟡 고민중
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(entry.studentId, 'declined')}
                    className={`min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      entry.status === 'declined'
                        ? 'bg-slate-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⚪ 불참
                  </button>
                </div>

                {/* 연주곡 및 참가비 입력 (참가/고민중인 경우 강조) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 md:max-w-md">
                  <div className="relative flex-1">
                    <Music className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={entry.pieceTitle}
                      onChange={(e) => handlePieceChange(entry.studentId, e.target.value)}
                      placeholder={
                        isParticipating ? '연주곡명 입력 (예: 쇼팽 녹턴 9-2)' : '희망곡 또는 비고'
                      }
                      className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFeePaidToggle(entry.studentId)}
                    disabled={!isParticipating}
                    className={`min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                      !isParticipating
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : entry.feePaid
                        ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-700'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    {entry.feePaid ? '참가비 완납' : '참가비 미납'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
