import React, { useMemo, useState } from 'react';
import { showToast, triggerRefresh } from '@/shared/feedback/uiFeedback';
import { useAppNavigation } from '@/shared/navigation/useAppNavigation';
import { usePermissions } from '@/core/auth/usePermissions';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { studentMatchesGuardianQuery } from '@/core/parent/guardianHelpers';
import { attendanceStorage } from '@/capabilities/attendance/infrastructure/attendanceStorage';
import { rosterStorage } from '@/capabilities/roster/infrastructure/rosterStorage';
import {
  formatSessionTime,
  getSessionStatusLabel,
} from '../application/attendanceService';
import type { AttendanceSession } from '../domain/types';
import { PinCheckInKioskView } from './PinCheckInKioskView';
import {
  PageHeader,
  SummaryMetricCard,
  FilterBar,
  SearchField,
  EmptyState,
  StandardDataTable,
  type StandardColumn,
  StatusBadge,
  Button,
} from '@/shared/components';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { getAttendanceSummaryMetric, getCustomerListTab, getIndustryAccent } from '@/core/industry/industryUi';
import {
  attendanceManageTitle,
  attendanceMemoSavedToast,
  attendancePinDisabledDescription,
  attendancePresentLabel,
  attendancePresentTimeLabel,
} from '../attendanceIndustryCopy';
import { useModuleLabels } from '@/core/labels';
import { todayIsoLocal, formatIsoDateLocal, shiftDateIso } from '@/shared/utils/localDate';
import type { Student } from '@/types/customer';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';
import { AttendanceMemoModal } from './AttendanceMemoModal';

type AttendanceSubTab = 'overview' | 'kiosk';

const ATTENDANCE_SUB_TABS: { value: AttendanceSubTab; label: string }[] = [
  { value: 'overview', label: '현황' },
  { value: 'kiosk', label: '키패드' },
];

export const AttendanceManagementView: React.FC = () => {
  const { setActiveTab, setSelectedStudentId } = useAppNavigation();
  const { attendanceEnabled, industry } = usePermissions();
  const labels = useModuleLabels();
  const memberLabel = labels.customer.singular;
  const activeMemberLabel = labels.customer.singular;
  const { isScoped, scopeStudents } = useStaffScope();
  const refreshKey = useStorageRefresh();

  const accent = getIndustryAccent(industry);
  const accentActive = `${accent.btn} text-white`;
  const linkHover = accent.icon.replace('text-', 'hover:text-');
  const metricVariant = getAttendanceSummaryMetric(industry);
  const customerTab = getCustomerListTab(industry);

  const [subTab, setSubTab] = useState<AttendanceSubTab>('overview');
  const [selectedDate, setSelectedDate] = useState(todayIsoLocal());
  const [searchQuery, setSearchQuery] = useState('');
  const [memoTarget, setMemoTarget] = useState<{
    student: Student;
    session?: AttendanceSession;
  } | null>(null);
  const [memoDraft, setMemoDraft] = useState('');

  const students = useMemo(
    () => scopeStudents(rosterStorage.getStudents()),
    [scopeStudents, refreshKey]
  );
  const sessions = useMemo(() => attendanceStorage.getAttendanceSessions(), [refreshKey]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(formatIsoDateLocal(d));
  };

  const sessionMap = useMemo(() => {
    const map = new Map<string, AttendanceSession>();
    sessions
      .filter((s) => s.sessionDate === selectedDate)
      .forEach((s) => map.set(s.customerId, s));
    return map;
  }, [sessions, selectedDate]);

  const activeStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status !== 'active') return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || studentMatchesGuardianQuery(s.id, searchQuery);
    });
  }, [students, searchQuery]);

  const stats = useMemo(() => {
    let checkedIn = 0;
    activeStudents.forEach((s) => {
      const sess = sessionMap.get(s.id);
      if (sess?.checkInAt) checkedIn++;
    });
    return {
      total: activeStudents.length,
      checkedIn,
      absent: activeStudents.length - checkedIn,
    };
  }, [activeStudents, sessionMap]);

  const openMemoEditor = (student: Student, session?: AttendanceSession) => {
    setMemoTarget({ student, session });
    setMemoDraft(session?.memo || '');
  };

  const saveMemo = () => {
    if (!memoTarget) return;
    const now = new Date().toISOString();
    const existing = memoTarget.session;
    if (existing) {
      attendanceStorage.saveAttendanceSession({
        ...existing,
        memo: memoDraft.trim() || undefined,
        updatedAt: now,
      });
    } else {
      attendanceStorage.saveAttendanceSession({
        id: crypto.randomUUID(),
        customerId: memoTarget.student.id,
        customerName: memoTarget.student.name,
        sessionDate: selectedDate,
        memo: memoDraft.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
    showToast(attendanceMemoSavedToast(industry), 'success');
    setMemoTarget(null);
    triggerRefresh();
  };

  if (!attendanceEnabled) {
    return (
      <EmptyState
        icon={<CheckSquare className="w-10 h-10" />}
        title="PIN 출결이 꺼져 있습니다"
        description={attendancePinDisabledDescription(industry, labels.customer.singular)}
        action={
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-white text-xs font-bold ${accent.btn} ${accent.btnHover}`}
          >
            <Settings className="w-4 h-4" />
            설정으로 이동
          </button>
        }
        className="border-amber-200 bg-amber-50/30"
      />
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<CheckSquare className="w-6 h-6" />}
        iconClassName={accent.icon}
        title={attendanceManageTitle(industry)}
        description="회원 및 고객별 출결 상태 체크 및 실시간 입퇴실 기록 관리"
        actions={
          <SegmentedControl
            value={subTab}
            options={ATTENDANCE_SUB_TABS}
            onChange={(v) => setSubTab(v as AttendanceSubTab)}
            activeClassName={accentActive}
            aria-label="PIN 출석 보기"
            fullWidth
            className="sm:w-auto"
          />
        }
      />

      {subTab === 'kiosk' ? (
        <div id="attendance-panel-kiosk" role="tabpanel" aria-labelledby="segment-kiosk">
          <PinCheckInKioskView />
          <p className="text-center text-[11px] text-slate-400 mt-3">
            입구 태블릿 전용:{' '}
            <a
              href="/attendance-kiosk"
              target="_blank"
              rel="noopener noreferrer"
              className={`font-bold ${accent.icon}`}
            >
              출석 키오스크 열기
            </a>
          </p>
        </div>
      ) : (
        <div
          id="attendance-panel-overview"
          role="tabpanel"
          aria-labelledby="segment-overview"
          className="space-y-4"
        >
          <div className="grid grid-cols-3 gap-3">
            <SummaryMetricCard label={activeMemberLabel} value={`${stats.total}명`} variant={metricVariant} />
            <SummaryMetricCard
              label={attendancePresentLabel(industry)}
              value={`${stats.checkedIn}명`}
              variant="emerald"
            />
            <SummaryMetricCard label="미출석" value={`${stats.absent}명`} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <FilterBar className="border-0 shadow-none rounded-none border-b border-slate-100">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => changeDate(-1)}
                  className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 hover:bg-slate-50"
                  aria-label="이전 날짜"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 sm:flex-none px-3 py-2 min-h-[44px] text-sm font-bold border border-slate-200 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => changeDate(1)}
                  className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 hover:bg-slate-50"
                  aria-label="다음 날짜"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <SearchField
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="이름·연락처 검색"
                className="w-full sm:flex-1 sm:max-w-xs"
              />
            </FilterBar>

            {activeStudents.length === 0 ? (
              <EmptyState
                icon={<Users className="w-10 h-10" />}
                title={isScoped ? `담당 ${memberLabel}이 없습니다` : `등록된 ${activeMemberLabel}이 없습니다`}
                description={
                  searchQuery.trim()
                    ? `검색 조건에 맞는 ${activeMemberLabel}이 없습니다.`
                    : `${memberLabel}을 등록하면 출입 현황을 확인할 수 있습니다.`
                }
                action={
                  !searchQuery.trim() && !isScoped
                    ? {
                        label: labels.customer.add,
                        onClick: () => {
                          setSelectedStudentId(null);
                          setActiveTab(customerTab);
                        },
                        icon: <UserPlus className="w-4 h-4" />,
                      }
                    : undefined
                }
                guide={
                  !searchQuery.trim() && !isScoped
                    ? {
                        badge: '30초 시작 가이드',
                        title: '출결을 시작하려면',
                        tip: 'PIN 출결을 쓰려면 설정에서 출입 관리를 켠 뒤, 회원에게 PIN을 부여하세요.',
                        steps: [
                          {
                            stepNumber: 1,
                            title: `${memberLabel} 등록`,
                            detail: '명부에 연락처를 등록합니다.',
                          },
                          {
                            stepNumber: 2,
                            title: '출결 화면 열기',
                            detail: '오늘 출석 대상이 보이면 등원·결석을 처리합니다.',
                          },
                          {
                            stepNumber: 3,
                            title: '알림 확인(선택)',
                            detail: '보호자 알림이 필요하면 출결 처리 시 함께 보냅니다.',
                          },
                        ],
                      }
                    : undefined
                }
                className="border-0 shadow-none rounded-none"
              />
            ) : (
              <StandardDataTable
                data={activeStudents}
                keyExtractor={(student) => student.id}
                columns={[
                  {
                    key: 'name',
                    header: '이름',
                    render: (student) => (
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setActiveTab(customerTab);
                          }}
                          className="font-bold text-slate-900 hover:underline text-left block"
                        >
                          {student.name}
                        </button>
                        <p className="text-[10px] text-slate-400">{student.grade}</p>
                        {student.specialNotes && (
                          <p className="mt-1 text-[10px] font-semibold text-amber-800 bg-amber-50 rounded-md px-1.5 py-0.5 inline-block max-w-[14rem] truncate">
                            주의 · {student.specialNotes}
                          </p>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: '상태',
                    render: (student) => {
                      const session = sessionMap.get(student.id);
                      const status = getSessionStatusLabel(session);
                      return (
                        <StatusBadge
                          status={
                            status.tone === 'success'
                              ? 'success'
                              : status.tone === 'warning'
                              ? 'warning'
                              : status.tone === 'error'
                              ? 'danger'
                              : 'neutral'
                          }
                          dot
                        >
                          {status.label}
                        </StatusBadge>
                      );
                    },
                  },
                  {
                    key: 'presentTime',
                    header: attendancePresentTimeLabel(industry),
                    className: 'font-mono text-slate-700 tabular-nums',
                    render: (student) => {
                      const session = sessionMap.get(student.id);
                      return formatSessionTime(session?.checkInAt);
                    },
                  },
                  {
                    key: 'pin',
                    header: 'PIN',
                    render: (student) => {
                      const pinSet = attendanceStorage.hasCustomerPin(student.id);
                      return (
                        <StatusBadge status={pinSet ? 'success' : 'neutral'} size="sm">
                          {pinSet ? '설정됨' : '미설정'}
                        </StatusBadge>
                      );
                    },
                  },
                  {
                    key: 'memo',
                    header: '메모',
                    render: (student) => {
                      const session = sessionMap.get(student.id);
                      return (
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openMemoEditor(student, session)}
                            leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                          >
                            {session?.memo ? '수정' : '작성'}
                          </Button>
                          {session?.memo && (
                            <p className="text-[10px] text-slate-400 mt-0.5 max-w-[10rem] truncate">
                              {session.memo}
                            </p>
                          )}
                        </div>
                      );
                    },
                  },
                ]}
                renderMobileCard={(student) => {
                  const session = sessionMap.get(student.id);
                  const status = getSessionStatusLabel(session);
                  const pinSet = attendanceStorage.hasCustomerPin(student.id);
                  return (
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setActiveTab(customerTab);
                          }}
                          className="font-bold text-slate-900 hover:underline text-sm text-left"
                        >
                          {student.name}
                        </button>
                        <StatusBadge
                          status={
                            status.tone === 'success'
                              ? 'success'
                              : status.tone === 'warning'
                              ? 'warning'
                              : status.tone === 'error'
                              ? 'danger'
                              : 'neutral'
                          }
                          dot
                        >
                          {status.label}
                        </StatusBadge>
                      </div>
                      <p className="text-[11px] text-slate-400">{student.grade}</p>
                      {student.specialNotes && (
                        <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 rounded-lg px-2 py-1">
                          주의 · {student.specialNotes}
                        </p>
                      )}
                      <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs flex justify-between items-center">
                        <span className="text-slate-400 text-[11px]">
                          {attendancePresentTimeLabel(industry)}
                        </span>
                        <span className="font-mono font-bold text-slate-700">
                          {formatSessionTime(session?.checkInAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <StatusBadge status={pinSet ? 'success' : 'neutral'} size="sm">
                          PIN {pinSet ? '설정됨' : '미설정'}
                        </StatusBadge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMemoEditor(student, session)}
                          leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                        >
                          {session?.memo ? '메모 수정' : '메모 작성'}
                        </Button>
                      </div>
                      {session?.memo && (
                        <p className="text-[11px] text-slate-500">메모 · {session.memo}</p>
                      )}
                    </div>
                  );
                }}
              />
            )}
          </div>
        </div>
      )}

      <AttendanceMemoModal
        open={Boolean(memoTarget)}
        student={memoTarget?.student ?? null}
        session={memoTarget?.session}
        draft={memoDraft}
        onDraftChange={setMemoDraft}
        onClose={() => setMemoTarget(null)}
        onSave={saveMemo}
        saveButtonClassName={accent.btn}
      />
    </div>
  );
};
