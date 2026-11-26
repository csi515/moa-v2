import React, { useState, useMemo } from 'react';
import {
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Sliders,
  ShieldAlert,
  Building2,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_WORKLOAD_THRESHOLDS,
  resolveWorkloadDataScope,
  filterWorkloadDataByScope,
  canReassignWorkload,
  type WorkloadThresholds,
  type WorkloadUserContext,
  type TeamMemberWorkloadItem,
} from '../domain/workloadCapacityEngine';
import { WorkloadThresholdSettingsModal } from './WorkloadThresholdSettingsModal';
import { showToast } from '@/shared/feedback/uiFeedback';

// 샘플 부하 데이터
const SAMPLE_WORKLOAD_ITEMS: TeamMemberWorkloadItem[] = [
  {
    memberId: 'mem-1',
    memberName: '김철수 팀장',
    departmentId: 'dept-dev',
    departmentName: '플랫폼개발팀',
    roleTitle: 'Team Lead',
    assignedTasksCount: 5,
    capacityHoursPerWeek: 40,
    assignedHoursPerWeek: 32,
    workloadRatePercent: 80,
  },
  {
    memberId: 'mem-2',
    memberName: '이영희 매니저',
    departmentId: 'dept-dev',
    departmentName: '플랫폼개발팀',
    roleTitle: 'Senior Frontend',
    assignedTasksCount: 7,
    capacityHoursPerWeek: 40,
    assignedHoursPerWeek: 38,
    workloadRatePercent: 95,
  },
  {
    memberId: 'mem-3',
    memberName: '박지훈 선임',
    departmentId: 'dept-dev',
    departmentName: '플랫폼개발팀',
    roleTitle: 'Backend Engineer',
    assignedTasksCount: 4,
    capacityHoursPerWeek: 40,
    assignedHoursPerWeek: 28,
    workloadRatePercent: 70,
  },
  {
    memberId: 'mem-4',
    memberName: '정수진 팀장',
    departmentId: 'dept-ops',
    departmentName: '사업운영팀',
    roleTitle: 'Ops Lead',
    assignedTasksCount: 6,
    capacityHoursPerWeek: 40,
    assignedHoursPerWeek: 30,
    workloadRatePercent: 75,
  },
  {
    memberId: 'mem-5',
    memberName: '최동욱 매니저',
    departmentId: 'dept-ops',
    departmentName: '사업운영팀',
    roleTitle: 'Operations Specialist',
    assignedTasksCount: 8,
    capacityHoursPerWeek: 40,
    assignedHoursPerWeek: 39,
    workloadRatePercent: 98,
  },
];

interface TeamWeeklyWorkloadViewProps {
  currentUser?: WorkloadUserContext;
  initialThresholds?: WorkloadThresholds;
  onThresholdsChange?: (thresholds: WorkloadThresholds) => void;
}

export const TeamWeeklyWorkloadView: React.FC<TeamWeeklyWorkloadViewProps> = ({
  currentUser = {
    userId: 'mem-1',
    role: 'manager',
    departmentId: 'dept-dev',
    departmentName: '플랫폼개발팀',
  },
  initialThresholds = DEFAULT_WORKLOAD_THRESHOLDS,
  onThresholdsChange,
}) => {
  const [thresholds, setThresholds] = useState<WorkloadThresholds>(initialThresholds);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [items, setItems] = useState<TeamMemberWorkloadItem[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');

  // 재분배 모달 상태
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [sourceMemberId, setSourceMemberId] = useState<string>('');
  const [targetMemberId, setTargetMemberId] = useState<string>('');
  const [taskHoursToMove, setTaskHoursToMove] = useState<number>(4);

  // 권한 스코프 판정
  const userScope = useMemo(() => resolveWorkloadDataScope(currentUser), [currentUser]);

  // 스코프 기반 데이터 필터링
  const scopedItems = useMemo(() => {
    return filterWorkloadDataByScope(items, userScope, selectedDeptId, thresholds);
  }, [items, userScope, selectedDeptId, thresholds]);

  // 고유 부서 목록 (Owner/Director 필터용)
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      map.set(item.departmentId, item.departmentName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // 부하 집계 통계
  const stats = useMemo(() => {
    const totalCapacity = scopedItems.reduce((acc, cur) => acc + cur.capacityHoursPerWeek, 0);
    const totalAssigned = scopedItems.reduce((acc, cur) => acc + cur.assignedHoursPerWeek, 0);
    const avgRate = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;
    const redCount = scopedItems.filter((i) => i.trafficLight === 'red').length;
    const yellowCount = scopedItems.filter((i) => i.trafficLight === 'yellow').length;
    const greenCount = scopedItems.filter((i) => i.trafficLight === 'green').length;

    return { totalCapacity, totalAssigned, avgRate, redCount, yellowCount, greenCount };
  }, [scopedItems]);

  const handleSaveThresholds = (newThresholds: WorkloadThresholds) => {
    setThresholds(newThresholds);
    if (onThresholdsChange) {
      onThresholdsChange(newThresholds);
    }
    showToast(
      `적정 ~${newThresholds.green_max}%, 주의 ~${newThresholds.yellow_max}%로 부하 기준이 갱신되었습니다.`,
      'success',
      '임계치 설정 저장'
    );
  };

  const handleOpenReassign = (member: TeamMemberWorkloadItem) => {
    setSourceMemberId(member.memberId);
    // 동일인이 아닌 첫 번째 팀원으로 기본 타겟 설정
    const defaultTarget = scopedItems.find((i) => i.memberId !== member.memberId);
    setTargetMemberId(defaultTarget ? defaultTarget.memberId : '');
    setTaskHoursToMove(4);
    setReassignModalOpen(true);
  };

  const handleExecuteReassign = () => {
    const fromMember = items.find((i) => i.memberId === sourceMemberId);
    const toMember = items.find((i) => i.memberId === targetMemberId);

    if (!fromMember || !toMember) {
      showToast('출발 또는 도착 팀원 정보를 찾을 수 없습니다.', 'error', '재분배 실패');
      return;
    }

    const check = canReassignWorkload({
      taskId: 'task-dyn',
      taskTitle: '프로젝트 업무 이관',
      taskHours: taskHoursToMove,
      fromMember,
      toMember,
      operator: currentUser,
    });

    if (!check.allowed) {
      showToast(check.reason || '재분배 규칙을 위반하였습니다.', 'error', '업무 재분배 권한 제한');
      return;
    }

    // 상태 업데이트: fromMember의 시간 차감, toMember의 시간 가산
    setItems((prev) =>
      prev.map((item) => {
        if (item.memberId === fromMember.memberId) {
          const newAssigned = Math.max(0, item.assignedHoursPerWeek - taskHoursToMove);
          const newRate = Math.round((newAssigned / item.capacityHoursPerWeek) * 100);
          return {
            ...item,
            assignedHoursPerWeek: newAssigned,
            workloadRatePercent: newRate,
            assignedTasksCount: Math.max(0, item.assignedTasksCount - 1),
          };
        }
        if (item.memberId === toMember.memberId) {
          const newAssigned = item.assignedHoursPerWeek + taskHoursToMove;
          const newRate = Math.round((newAssigned / item.capacityHoursPerWeek) * 100);
          return {
            ...item,
            assignedHoursPerWeek: newAssigned,
            workloadRatePercent: newRate,
            assignedTasksCount: item.assignedTasksCount + 1,
          };
        }
        return item;
      })
    );

    setReassignModalOpen(false);
    showToast(
      `${fromMember.memberName} -> ${toMember.memberName} (${taskHoursToMove}시간 이관)`,
      'success',
      '업무 재분배 완료'
    );
  };

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        아래 인원·부하 수치는 UI 시연용 샘플입니다. 조직도·MBO 실데이터 연동 전까지 참고용으로만 사용하세요.
      </p>
      {/* 상단 컨트롤 바 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              주간 팀 업무 부하 모니터링
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Sparkles className="h-3 w-3" />
              신호등 동적 임계치
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {userScope.scopeType === 'all' && '전사 부서의 주간 업무 부하를 통합 관제합니다.'}
            {userScope.scopeType === 'department' &&
              `[${currentUser.departmentName || '소속 부서'}] 팀장의 관할 부서 인원 부하만 표시됩니다. (타 부서 격리)`}
            {userScope.scopeType === 'self' &&
              '본인에게 할당된 주간 업무 시간 및 가용 부하 현황입니다.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 전사 관리자 전용 부서 셀렉터 */}
          {userScope.canChangeDepartmentFilter ? (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="ALL">전체 부서 통합</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          ) : userScope.scopeType === 'department' ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <Building2 className="h-3.5 w-3.5 text-indigo-500" />
              <span>{currentUser.departmentName || '내 소속팀 고정'}</span>
              <span className="rounded bg-slate-100 px-1 py-0.2 text-[10px] text-slate-700 dark:bg-indigo-950 dark:text-indigo-300">
                격리됨
              </span>
            </div>
          ) : null}

          {/* 임계치 설정 버튼 (관리자 전용) */}
          {userScope.canManageThresholds && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Sliders className="h-3.5 w-3.5 text-indigo-500" />
              임계치 설정
            </button>
          )}
        </div>
      </div>

      {/* 종합 현황 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>주간 총 배정 시간</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.totalAssigned}h
            </span>
            <span className="text-xs text-slate-400">/ {stats.totalCapacity}h 가용</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>평균 부하율</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.avgRate}%
            </span>
            <span className="text-xs text-slate-400">
              (기준: 적정 ~{thresholds.green_max}%)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>적정 가동 인원 (🟢)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.greenCount}명
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>위험·주의 인원 (🔴/🟡)</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {stats.redCount}명
            </span>
            <span className="text-xs font-medium text-amber-500">
              (주의 {stats.yellowCount}명)
            </span>
          </div>
        </div>
      </div>

      {/* 팀원별 부하 카드 그리드 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {scopedItems.map((member) => {
          const isRed = member.trafficLight === 'red';
          const isYellow = member.trafficLight === 'yellow';
          const isGreen = member.trafficLight === 'green';

          const badgeColor = isRed
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
            : isYellow
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200';

          const barColor = isRed
            ? 'bg-rose-500'
            : isYellow
            ? 'bg-amber-500'
            : 'bg-emerald-500';

          return (
            <div
              key={member.memberId}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-slate-900 ${
                isRed
                  ? 'border-rose-300 shadow-rose-100/50 dark:border-rose-900/50'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {member.memberName}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {member.roleTitle}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {member.departmentName}
                  </div>
                </div>

                <div
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${badgeColor}`}
                >
                  {isRed && '🔴 위험'}
                  {isYellow && '🟡 주의'}
                  {isGreen && '🟢 적정'}
                  <span>({member.workloadRatePercent}%)</span>
                </div>
              </div>

              {/* 프로그레스 바 */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>주간 배정 / 가용</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {member.assignedHoursPerWeek}시간 / {member.capacityHoursPerWeek}시간
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    style={{ width: `${Math.min(100, member.workloadRatePercent)}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  />
                </div>
              </div>

              {/* 하단 메트릭 및 재분배 액션 */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  담당 과업: <strong className="text-slate-700 dark:text-slate-300">{member.assignedTasksCount}개</strong>
                </span>

                {/* 관리자 또는 팀장인 경우 업무 재분배 가능 */}
                {(currentUser.role === 'owner' ||
                  currentUser.role === 'director' ||
                  currentUser.role === 'manager') && (
                  <button
                    onClick={() => handleOpenReassign(member)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    업무 재분배
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {scopedItems.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <ShieldAlert className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-medium">조회 가능한 업무 부하 데이터가 없습니다.</p>
        </div>
      )}

      {/* 신호등 임계치 설정 모달 */}
      <WorkloadThresholdSettingsModal
        isOpen={isSettingsOpen}
        initialThresholds={thresholds}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveThresholds}
      />

      {/* 업무 재분배 다이얼로그 모달 */}
      {reassignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              팀 내 업무 부하 재분배
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              과중한 팀원의 주간 과업을 가용 역량이 있는 팀원에게 안전하게 이관합니다.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  출발 팀원 (업무 경감):
                </label>
                <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {items.find((i) => i.memberId === sourceMemberId)?.memberName} (
                  {items.find((i) => i.memberId === sourceMemberId)?.departmentName})
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  도착 팀원 (업무 수임):
                </label>
                <select
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">수임 대상 선택</option>
                  {items
                    .filter((i) => i.memberId !== sourceMemberId)
                    .map((target) => (
                      <option key={target.memberId} value={target.memberId}>
                        {target.memberName} ({target.departmentName}) - 부하율 {target.workloadRatePercent}%
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  이관 업무 시간:
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={taskHoursToMove}
                  onChange={(e) => setTaskHoursToMove(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleExecuteReassign}
                disabled={!targetMemberId}
                className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                재분배 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
