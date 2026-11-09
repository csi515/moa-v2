import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  Target,
  FolderKanban,
  Award,
  Layers,
  FileText,
  X,
  Plus,
  Activity,
  TrendingUp,
} from 'lucide-react';
import {
  canTransitionMboStatus,
  calculateGradeFromScore,
  validateMboObjectiveWeights,
  type MboStatus,
  type MboLevel,
  type MboEvaluationGrade,
  type MboEvaluationType,
} from '../domain/mboEngine';
import {
  DEFAULT_MBO_CYCLE,
  areGoalsLocked,
  isReviewWindowOpen,
  type MboCycleSettings,
} from '../domain/mboCycle';
import {
  DEFAULT_WORKLOAD_THRESHOLDS,
  type WorkloadThresholds,
} from '../domain/workloadCapacityEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import { MboObjectiveTreeViewer, type ObjectiveNode } from './MboObjectiveTreeViewer';
import { MboQuarterlyReviewForm, type ProgressLogItem, type FeedbackItem } from './MboQuarterlyReviewForm';
import { MboEvaluationMatrixView, type EvaluationItem } from './MboEvaluationMatrixView';
import { TeamWeeklyWorkloadView } from './TeamWeeklyWorkloadView';
import { MboYearlyCapacityForecastView } from './MboYearlyCapacityForecastView';
import { MboCycleSettingsCard } from './MboCycleSettingsCard';
import { MboRevisionTimelineModal } from './MboRevisionTimelineModal';
import { MboReviseGoalModal } from './MboReviseGoalModal';
import { OrganizationMemberPickerModal } from './OrganizationMemberPickerModal';
import { MboProjectPortfolioView } from './MboProjectPortfolioView';
import { MboPlanApprovalModal } from './MboPlanApprovalModal';
import type { PortfolioProject } from '../domain/projectPortfolioEngine';
import type { ProjectCategory } from '../domain/projectCategoryEngine';
import type { MboVisibilityType } from '../domain/mboVisibilityEngine';
import { MboService } from '../services/mboService';
import { readMboRequirePlanApproval } from '../domain/mboPlanApproval';
import { useActiveUser } from '@/shared/session/useActiveUser';
import {
  ensureDefaultProjectCategories,
  listProjectCategories,
} from '../services/projectCategoryService';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useOrganizationTree } from '@/pages/organization/useOrganizationTree';
import { getResolvedPreset } from '@/core/presets/presetResolver';
import { useAuth } from '@/core/auth/AuthProvider';

const SAMPLE_PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: 'proj-sample-1',
    title: '친환경 촉매 합성 및 파일럿 스케일업',
    ownerId: 'u-kim',
    ownerName: '김수석',
    status: 'in_progress',
    startDate: '2026-01-15',
    targetDate: '2026-06-30',
    progressRate: 42,
    objectiveId: 'obj-1',
    description: 'Lab 1 합성 → 항온항습 신뢰성 → 양산 이관 게이트',
    categoryId: 'local-research',
    categoryLabel: '연구',
    categoryColor: '#4f46e5',
  },
  {
    id: 'proj-sample-2',
    title: 'FE-SEM/XRD 측정 표준 SOP 수립',
    ownerId: 'u-lee',
    ownerName: '이선임',
    status: 'approved',
    startDate: '2026-03-01',
    targetDate: '2026-04-30',
    progressRate: 68,
    objectiveId: 'obj-2',
    categoryId: 'local-quality',
    categoryLabel: '품질',
    categoryColor: '#059669',
  },
  {
    id: 'proj-sample-3',
    title: '직무발명 선행기술 조사 및 출원 패키지',
    ownerId: 'u-kim',
    ownerName: '김수석',
    status: 'completed',
    startDate: '2025-11-01',
    targetDate: '2026-01-20',
    progressRate: 100,
    objectiveId: 'obj-1',
    categoryId: 'local-patent',
    categoryLabel: '특허',
    categoryColor: '#c026d3',
  },
  {
    id: 'proj-sample-4',
    title: '2027 중장기 R&D 로드맵',
    ownerId: 'u-park',
    ownerName: '박센터장',
    status: 'draft',
    startDate: '2027-01-01',
    targetDate: '2027-12-31',
    progressRate: 5,
    categoryId: 'local-tech',
    categoryLabel: '기술',
    categoryColor: '#0284c7',
  },
];

const SAMPLE_CATEGORIES: ProjectCategory[] = [
  {
    id: 'local-research',
    organizationId: 'local',
    categoryKey: 'research',
    label: '연구',
    color: '#4f46e5',
    sortOrder: 10,
    isActive: true,
  },
  {
    id: 'local-quality',
    organizationId: 'local',
    categoryKey: 'quality',
    label: '품질',
    color: '#059669',
    sortOrder: 20,
    isActive: true,
  },
  {
    id: 'local-tech',
    organizationId: 'local',
    categoryKey: 'technology',
    label: '기술',
    color: '#0284c7',
    sortOrder: 30,
    isActive: true,
  },
  {
    id: 'local-patent',
    organizationId: 'local',
    categoryKey: 'patent',
    label: '특허',
    color: '#c026d3',
    sortOrder: 40,
    isActive: true,
  },
];

// 로컬 폴백 샘플 데이터
const INITIAL_OBJECTIVES: ObjectiveNode[] = [
  {
    id: 'obj-1',
    parentId: null,
    level: 'company',
    departmentName: '전사',
    ownerName: '대표이사',
    title: '2026 상반기 고객 유지율 92% 달성 및 재등록 매출 극대화',
    description: '고객 경험 개선 및 이탈 방지 프로세스 확립을 통한 건강한 성장',
    successCriteria: '고객 만족도 NPS 85점 이상, 회원 이탈률 5% 미만 유지',
    status: 'in_progress',
    startDate: '2026-01-01',
    targetDate: '2026-06-30',
    weight: 100,
    progressRate: 72,
    revision: 1,
  },
  {
    id: 'obj-2',
    parentId: 'obj-1',
    level: 'department',
    departmentName: '운영기획팀',
    ownerName: '김팀장',
    title: '교재 및 출결 통합 알림 체계 고도화',
    description: '학부모 피드백 루프 단축 및 수업 만족도 향상',
    successCriteria: '출결 알림 발송 지연율 0%, 교재 배송 리드타임 2일 이내',
    status: 'approved',
    startDate: '2026-02-01',
    targetDate: '2026-05-31',
    weight: 60,
    progressRate: 65,
    revision: 1,
  },
  {
    id: 'obj-3',
    parentId: 'obj-2',
    level: 'individual',
    departmentName: '운영기획팀',
    ownerName: '이지원 매니저',
    title: '모바일 출결 안내 및 VOC 접수 채널 개편',
    description: '1:1 피드백 채널 개설 및 VOC 처리 시간 단축',
    successCriteria: '고객 문의 평균 응답 시간 15분 이내 달성',
    status: 'submitted',
    startDate: '2026-03-01',
    targetDate: '2026-04-30',
    weight: 40,
    progressRate: 25,
    revision: 2,
  },
];

const INITIAL_LOGS: ProgressLogItem[] = [
  {
    id: 'log-1',
    projectId: 'obj-1',
    authorName: '박상담 실장',
    logDate: '2026-03-25',
    progressRate: 80,
    achievements: '장기 미출결 35명 중 28명 상담 완료, 22명 복귀 확정',
    issuesAndActions: '야간 시간대 연락 부재 7건 -> 카카오 알림톡 사전 동의 안내 발송',
    nextSteps: '잔여 7명 2차 통화 및 만족도 조사 설문 발송',
  },
];

const INITIAL_FEEDBACKS: FeedbackItem[] = [
  {
    id: 'fb-1',
    projectId: 'obj-1',
    authorName: '김사업주',
    authorRole: '사업주',
    feedbackType: 'praise',
    content: '복귀율이 목표치를 크게 상회했습니다. 야간 알림톡 선제 대응도 훌륭합니다.',
    createdAt: '2026-03-26 10:15',
  },
];

const INITIAL_EVALUATIONS: EvaluationItem[] = [
  {
    id: 'eval-1',
    projectId: 'obj-1',
    targetUserName: '박상담 실장',
    evaluatorName: '김사업주',
    evaluationType: 'manager',
    score: 95,
    grade: 'S',
    qualitativeFeedback: '탁월한 고객 소통 및 실행력으로 센터 이탈률 방어에 핵심적인 기여를 함.',
    isConfidential: true,
    createdAt: '2026-04-01 15:30',
  },
];

export const MboManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'objectives' | 'projects' | 'evaluations' | 'workload' | 'forecast'
  >('objectives');
  const [projectSubView, setProjectSubView] = useState<'portfolio' | 'quarterly'>('portfolio');
  const [thresholds, setThresholds] = useState<WorkloadThresholds>(DEFAULT_WORKLOAD_THRESHOLDS);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('obj-1');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [cycleSettings, setCycleSettings] = useState<MboCycleSettings>(DEFAULT_MBO_CYCLE);
  const goalsLocked = areGoalsLocked(cycleSettings, new Date());
  const reviewOpen = isReviewWindowOpen(cycleSettings, new Date());

  // 로컬 폴백 — 샘플 데이터 없이 빈 상태로 시작 (실데이터 우선)
  const [localObjectives, setLocalObjectives] = useState<ObjectiveNode[]>([]);
  const [localLogs, setLocalLogs] = useState<ProgressLogItem[]>([]);
  const [localFeedbacks, setLocalFeedbacks] = useState<FeedbackItem[]>([]);
  const [localEvaluations, setLocalEvaluations] = useState<EvaluationItem[]>([]);

  // 모달 제어 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState('');

  // 신규 목표 입력 폼
  const [newTitle, setNewTitle] = useState('');
  const [newLevel, setNewLevel] = useState<MboLevel>('individual');
  const [newOwner, setNewOwner] = useState('');
  const [newDept, setNewDept] = useState('운영팀');
  const [newCriteria, setNewCriteria] = useState('');
  const [newStartDate, setNewStartDate] = useState('2026-04-01');
  const [newTargetDate, setNewTargetDate] = useState('2026-06-30');
  const [newWeight, setNewWeight] = useState(100);
  const [newVisibility, setNewVisibility] = useState<MboVisibilityType>('PRIVATE');
  const [shareMemberIds, setShareMemberIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mboFilterScope, setMboFilterScope] = useState<'all' | 'my' | 'dept'>('all');
  const [historyGoalId, setHistoryGoalId] = useState<string | null>(null);
  const [reviseGoalId, setReviseGoalId] = useState<string | null>(null);
  const [planApprovalObjectiveId, setPlanApprovalObjectiveId] = useState<string | null>(null);

  const { currentOrganization, activeCapabilities = [] } = useOrganization();
  const { user: authUser } = useAuth();
  const activeUser = useActiveUser();
  const orgId = currentOrganization?.id ?? null;
  const requirePlanApproval = readMboRequirePlanApproval(
    (currentOrganization?.settings ?? null) as Record<string, unknown> | null
  );
  const hasApprovalWorkflow = useMemo(() => {
    const preset = getResolvedPreset(currentOrganization?.industry_type ?? '');
    const caps = new Set([...(preset?.capabilities ?? []), ...activeCapabilities]);
    return caps.has('approval_workflow');
  }, [currentOrganization?.industry_type, activeCapabilities]);
  const { nodes: deptNodes, members: orgMembers, departmentMembers } = useOrganizationTree(
    currentOrganization?.id,
  );

  const reloadProjectCategories = useCallback(async () => {
    if (!orgId) {
      setProjectCategories([]);
      return;
    }
    try {
      await ensureDefaultProjectCategories(orgId);
      const rows = await listProjectCategories(orgId, { includeArchived: true });
      setProjectCategories(rows);
    } catch {
      setProjectCategories([]);
    }
  }, [orgId]);

  useEffect(() => {
    void reloadProjectCategories();
  }, [reloadProjectCategories]);

  // Refine 쿼리
  const { query: objQuery } = useList<any>({
    resource: 'mbo_objectives',
    pagination: { mode: 'off' },
  });
  const { query: logQuery } = useList<any>({
    resource: 'mbo_progress_logs',
    pagination: { mode: 'off' },
  });
  const { query: evalQuery } = useList<any>({
    resource: 'mbo_evaluations',
    pagination: { mode: 'off' },
  });
  const { query: projectQuery } = useList<any>({
    resource: 'mbo_projects',
    pagination: { mode: 'off' },
  });

  const { mutate: mutateCreate } = useCreate();
  const { mutate: mutateUpdate } = useUpdate();

  const refineObjectives = objQuery?.data?.data;
  const refineLogs = logQuery?.data?.data;
  const refineEvals = evalQuery?.data?.data;
  const refineProjects = projectQuery?.data?.data;

  // DB 데이터 우선 바인딩
  const objectives: ObjectiveNode[] = useMemo(() => {
    if (refineObjectives && refineObjectives.length > 0) {
      return refineObjectives.map((row: any) => ({
        id: row.id,
        parentId: row.parent_id,
        level: row.level as MboLevel,
        departmentName: row.department_name || '부서',
        ownerName: row.owner_name || '담당자',
        title: row.title,
        description: row.description || '',
        successCriteria: row.success_criteria || '',
        status: (row.status || 'draft') as MboStatus,
        startDate: row.start_date || '2026-01-01',
        targetDate: row.target_date || '2026-12-31',
        weight: row.weight ?? 100,
        progressRate: row.progress_rate ?? 0,
        revision: row.revision_count ?? row.revision ?? 1,
        isRevised: Boolean(row.is_revised),
        revisionCount: row.revision_count ?? row.revision ?? 1,
        targetValue: row.target_value ?? row.weight ?? null,
        rejectionReason: row.rejection_reason,
      }));
    }
    return localObjectives.map((obj) => ({
      ...obj,
      isRevised: obj.revision > 1,
      revisionCount: obj.revision,
      targetValue: obj.weight,
    }));
  }, [refineObjectives, localObjectives]);

  const filteredObjectives = useMemo(() => {
    if (mboFilterScope === 'all') return objectives;
    const currentUserName = activeUser?.name;
    const currentUserDept = (activeUser as any)?.department;
    if (mboFilterScope === 'my') {
      if (!currentUserName) return objectives;
      return objectives.filter((o) => o.ownerName === currentUserName || o.level === 'company');
    }
    if (mboFilterScope === 'dept') {
      if (!currentUserDept) return objectives;
      return objectives.filter((o) => o.departmentName === currentUserDept || o.level === 'company');
    }
    return objectives;
  }, [objectives, mboFilterScope, activeUser]);

  const logs: ProgressLogItem[] = useMemo(() => {
    if (refineLogs && refineLogs.length > 0) {
      return refineLogs.map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        authorName: row.author_name || '작성자',
        logDate: row.log_date || row.created_at?.slice(0, 10),
        progressRate: row.progress_rate ?? 0,
        achievements: row.achievements || '',
        issuesAndActions: row.issues_and_actions,
        nextSteps: row.next_steps,
      }));
    }
    return localLogs;
  }, [refineLogs, localLogs]);

  const evaluations: EvaluationItem[] = useMemo(() => {
    if (refineEvals && refineEvals.length > 0) {
      return refineEvals.map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        targetUserName: row.target_user_name || '대상자',
        evaluatorName: row.evaluator_name || '평가자',
        evaluationType: (row.evaluation_type || 'manager') as MboEvaluationType,
        score: row.score ?? 0,
        grade: (row.grade || calculateGradeFromScore(row.score ?? 0)) as MboEvaluationGrade,
        qualitativeFeedback: row.qualitative_feedback || '',
        isConfidential: row.is_confidential ?? true,
        createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
      }));
    }
    return localEvaluations;
  }, [refineEvals, localEvaluations]);

  const categoryById = useMemo(() => {
    const map = new Map<string, ProjectCategory>();
    for (const c of projectCategories) map.set(c.id, c);
    return map;
  }, [projectCategories]);

  const portfolioProjects: PortfolioProject[] = useMemo(() => {
    if (refineProjects && refineProjects.length > 0) {
      return refineProjects.map((row: any) => {
        const cat = row.category_id ? categoryById.get(row.category_id) : undefined;
        return {
          id: row.id,
          title: row.title,
          ownerId: row.owner_id ?? null,
          ownerName: row.owner_name || '미배정',
          status: (row.status || 'draft') as MboStatus,
          startDate: row.start_date || '2026-01-01',
          targetDate: row.target_date || '2026-12-31',
          progressRate: row.progress_rate ?? 0,
          objectiveId: row.objective_id,
          evaluationPeriod: row.evaluation_period,
          description: row.description,
          categoryId: row.category_id ?? null,
          categoryLabel: cat?.label ?? null,
          categoryColor: cat?.color ?? null,
        };
      });
    }
    // DB 비어 있으면 목표 노드를 프로젝트 폴백으로 매핑 + 연구소 샘플
    const fromObjectives: PortfolioProject[] = objectives.map((obj) => ({
      id: `obj-as-proj-${obj.id}`,
      title: obj.title,
      ownerId: null,
      ownerName: obj.ownerName,
      status: obj.status,
      startDate: obj.startDate,
      targetDate: obj.targetDate,
      progressRate: obj.progressRate,
      objectiveId: obj.id,
      description: obj.description,
    }));
    return fromObjectives;
  }, [refineProjects, objectives, categoryById]);

  const selectedObjective = objectives.find((o) => o.id === selectedObjectiveId) || objectives[0];
  const selectedPortfolioProject =
    portfolioProjects.find((p) => p.id === selectedProjectId) || portfolioProjects[0];

  // 목표 가중치 100% 인터락 검증
  const weightValidation = useMemo(() => {
    return validateMboObjectiveWeights(objectives);
  }, [objectives]);

  // 목표 상태 전이 액션
  const handleTransitionStatus = (id: string, targetStatus: MboStatus, reason?: string) => {
    const target = objectives.find((o) => o.id === id);
    if (!target) return;

    if (!canTransitionMboStatus(target.status, targetStatus)) {
      showToast(`전이할 수 없는 상태입니다: ${target.status} -> ${targetStatus}`, 'warning');
      return;
    }

    if (refineObjectives && refineObjectives.length > 0) {
      mutateUpdate(
        {
          resource: 'mbo_objectives',
          id,
          values: {
            status: targetStatus,
            rejection_reason: targetStatus === 'rejected' ? reason : null,
          },
        },
        {
          onSuccess: () => {
            objQuery?.refetch();
            showToast(`목표 상태가 [${targetStatus}]로 변경되었습니다.`, 'success');
          },
          onError: () => {
            setLocalObjectives((prev) =>
              prev.map((o) => (o.id === id ? { ...o, status: targetStatus, rejectionReason: reason } : o))
            );
            showToast(`목표 상태가 로컬 변경되었습니다.`, 'info');
          },
        }
      );
    } else {
      setLocalObjectives((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: targetStatus, rejectionReason: reason } : o))
      );
      showToast(`목표 상태가 [${targetStatus}]로 변경되었습니다.`, 'success');
    }
  };

  // 신규 목표 생성
  const handleCreateObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (refineObjectives && refineObjectives.length > 0) {
      mutateCreate(
        {
          resource: 'mbo_objectives',
            values: {
            parent_id: selectedObjectiveId === 'none' ? null : selectedObjectiveId,
            level: newLevel,
            department_name: newDept,
            owner_name: newOwner || '신규 담당자',
            title: newTitle.trim(),
            success_criteria: newCriteria.trim(),
            start_date: newStartDate,
            target_date: newTargetDate,
            weight: newWeight,
            progress_rate: 0,
            status: 'draft',
            visibility_type: newVisibility,
          },
        },
        {
          onSuccess: (result) => {
            const createdId = (result as { data?: { id?: string } })?.data?.id;
            if (createdId && newVisibility === 'PARTIAL' && shareMemberIds.length > 0) {
              void MboService.replaceGoalShares(createdId, shareMemberIds).catch(() => undefined);
            }
            objQuery?.refetch();
            setShowCreateModal(false);
            setNewTitle('');
            setShareMemberIds([]);
            setNewVisibility('PRIVATE');
            showToast('신규 MBO 목표가 DB에 등록되었습니다.', 'success');
          },
          onError: () => {
            const newObj: ObjectiveNode = {
              id: `obj-${Date.now()}`,
              parentId: selectedObjectiveId === 'none' ? null : selectedObjectiveId,
              level: newLevel,
              departmentName: newDept,
              ownerName: newOwner || '신규 담당자',
              title: newTitle.trim(),
              description: '',
              successCriteria: newCriteria.trim(),
              status: 'draft',
              startDate: newStartDate,
              targetDate: newTargetDate,
              weight: newWeight,
              progressRate: 0,
              revision: 1,
            };
            setLocalObjectives((prev) => [...prev, newObj]);
            setShowCreateModal(false);
            setNewTitle('');
            showToast('신규 MBO 목표가 등록되었습니다.', 'success');
          },
        }
      );
    } else {
      const newObj: ObjectiveNode = {
        id: `obj-${Date.now()}`,
        parentId: selectedObjectiveId === 'none' ? null : selectedObjectiveId,
        level: newLevel,
        departmentName: newDept,
        ownerName: newOwner || '신규 담당자',
        title: newTitle.trim(),
        description: '',
        successCriteria: newCriteria.trim(),
        status: 'draft',
        startDate: newStartDate,
        targetDate: newTargetDate,
        weight: newWeight,
        progressRate: 0,
        revision: 1,
      };
      setLocalObjectives((prev) => [...prev, newObj]);
      setShowCreateModal(false);
      setNewTitle('');
      showToast('신규 MBO 목표가 등록되었습니다.', 'success');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2 pb-12">
      {/* 최상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold mb-1.5">
            <Target className="w-3.5 h-3.5" />
            <span>조직 목표 및 성과 관리 (MBO)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">MBO 목표 & 성과평가 허브</h1>
          <p className="text-xs text-slate-500 mt-1">
            전사·부서·개인 목표 계층 연계(가중치 100%), 분기별 진척 일지 및 다면 성과평가를 통합 관리합니다.
          </p>
        </div>

        {/* 상단 네비게이션 탭 */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('objectives')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'objectives'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>목표 트리 & KPI</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('projects');
              setProjectSubView('portfolio');
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'projects'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>진행 프로젝트</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('evaluations')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'evaluations'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>다면 성과평가표</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workload')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'workload'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>주간 팀 부하</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('forecast')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'forecast'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>캐퍼시티 예측</span>
          </button>
        </div>
      </div>

      {/* 목표 가중치 합계 실시간 인터락 배너 */}
      <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
        weightValidation.valid
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          <span className="font-bold">
            {weightValidation.valid
              ? `전사/부서 목표 가중치 합계: 100% (정상 정렬)`
              : `목표 가중치 합계 조정 필요: 현재 ${weightValidation.totalWeight}% (${weightValidation.difference > 0 ? `${weightValidation.difference}% 추가 필요` : `${Math.abs(weightValidation.difference)}% 초과`})`}
          </span>
        </div>
        <span className="text-[11px] font-medium opacity-80">
          모든 목표 항목의 가중치 합은 정확히 100%로 맞춰야 공정한 평가가 가능합니다.
        </span>
      </div>

      <MboCycleSettingsCard onChange={setCycleSettings} />

      {goalsLocked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          목표 잠금이 적용되었습니다. 목표 문장과 핵심 지표는 수정할 수 없습니다. 분기 진척 기록은 계속 작성할 수 있습니다.
        </div>
      ) : null}

      {/* 탭 1: 목표 트리 뷰 */}
      {activeTab === 'objectives' && (
        <MboObjectiveTreeViewer
          objectives={objectives}
          selectedObjectiveId={selectedObjectiveId}
          onSelectObjective={(id) => setSelectedObjectiveId(id)}
          onOpenCreateModal={() => {
            if (goalsLocked) {
              showToast('목표 잠금 기간에는 새 목표를 등록할 수 없습니다.', 'warning');
              return;
            }
            setShowCreateModal(true);
          }}
          onRequestApproval={(id) => {
            if (requirePlanApproval && hasApprovalWorkflow) {
              setPlanApprovalObjectiveId(id);
              return;
            }
            handleTransitionStatus(id, 'submitted');
          }}
          onApprove={(id) => handleTransitionStatus(id, 'approved')}
          onOpenRejectModal={(id) => setShowRejectModal(id)}
          onOpenRevisionHistory={(id) => setHistoryGoalId(id)}
          onOpenRevise={(id) => setReviseGoalId(id)}
        />
      )}

      {planApprovalObjectiveId ? (
        <MboPlanApprovalModal
          open
          organizationId={orgId ?? ''}
          objectiveId={planApprovalObjectiveId}
          objectiveTitle={
            objectives.find((o) => o.id === planApprovalObjectiveId)?.title ?? 'MBO 목표'
          }
          objectiveDescription={
            objectives.find((o) => o.id === planApprovalObjectiveId)?.description
          }
          successCriteria={
            objectives.find((o) => o.id === planApprovalObjectiveId)?.successCriteria
          }
          ownerName={objectives.find((o) => o.id === planApprovalObjectiveId)?.ownerName}
          objectiveStatus={
            objectives.find((o) => o.id === planApprovalObjectiveId)?.status ?? 'draft'
          }
          requirePlanApproval={requirePlanApproval}
          hasApprovalWorkflow={hasApprovalWorkflow}
          requesterId={authUser?.id || activeUser?.id || ''}
          requesterName={activeUser?.name || authUser?.email || '기안자'}
          onClose={() => setPlanApprovalObjectiveId(null)}
          onSubmitted={() => {
            handleTransitionStatus(planApprovalObjectiveId, 'submitted');
            showToast('MBO 계획 결재가 상신되었습니다.', 'success');
          }}
          onSkipToLocalSubmit={() => handleTransitionStatus(planApprovalObjectiveId, 'submitted')}
        />
      ) : null}

      {/* 탭 2: 진행 프로젝트 (연도/월/개인) + 분기 진척 리뷰 */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              className={`h-12 rounded-lg px-4 text-xs font-bold ${
                projectSubView === 'portfolio'
                  ? 'bg-white text-indigo-800 shadow-xs'
                  : 'text-slate-600'
              }`}
              onClick={() => setProjectSubView('portfolio')}
            >
              연도·월·개인 뷰
            </button>
            <button
              type="button"
              className={`h-12 rounded-lg px-4 text-xs font-bold ${
                projectSubView === 'quarterly'
                  ? 'bg-white text-indigo-800 shadow-xs'
                  : 'text-slate-600'
              }`}
              onClick={() => setProjectSubView('quarterly')}
            >
              분기 진척 리뷰
            </button>
          </div>

          {projectSubView === 'portfolio' ? (
            <MboProjectPortfolioView
              projects={portfolioProjects}
              categories={projectCategories}
              organizationId={orgId}
              selectedProjectId={selectedProjectId}
              onSelectProject={(id) => {
                setSelectedProjectId(id);
                const proj = portfolioProjects.find((p) => p.id === id);
                if (proj?.objectiveId) {
                  const match = objectives.find((o) => o.id === proj.objectiveId);
                  if (match) setSelectedObjectiveId(match.id);
                }
              }}
              onOpenQuarterlyReview={(id) => {
                setSelectedProjectId(id);
                setProjectSubView('quarterly');
              }}
              onCategoriesChanged={() => void reloadProjectCategories()}
            />
          ) : (
            <MboQuarterlyReviewForm
              projectId={selectedPortfolioProject?.id || selectedObjective?.id || 'obj-1'}
              projectTitle={
                selectedPortfolioProject?.title || selectedObjective?.title || '선택된 프로젝트'
              }
              logs={logs}
              feedbacks={localFeedbacks}
              onCreateLog={(newLog) => {
                const createdLog: ProgressLogItem = {
                  ...newLog,
                  id: `log-${Date.now()}`,
                };
                setLocalLogs((prev) => [createdLog, ...prev]);
              }}
              onCreateFeedback={(newFb) => {
                const createdFb: FeedbackItem = {
                  ...newFb,
                  id: `fb-${Date.now()}`,
                  createdAt: new Date().toLocaleTimeString(),
                };
                setLocalFeedbacks((prev) => [...prev, createdFb]);
              }}
            />
          )}
        </div>
      )}

      {/* 탭 3: 다면 성과평가표 뷰 */}
      {activeTab === 'evaluations' && (
        reviewOpen ? (
          <MboEvaluationMatrixView
            projectId={selectedObjective?.id || 'obj-1'}
            projectTitle={selectedObjective?.title || '선택된 목표'}
            targetUserName={selectedObjective?.ownerName || '담당자'}
            evaluations={evaluations}
            onCreateEvaluation={(newEval) => {
              const grade = calculateGradeFromScore(newEval.score);
              const createdEval: EvaluationItem = {
                ...newEval,
                id: `eval-${Date.now()}`,
                grade,
                createdAt: new Date().toLocaleDateString(),
              };
              setLocalEvaluations((prev) => [...prev, createdEval]);
            }}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Award className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="text-base font-bold text-slate-900">평가 기간이 아닙니다</p>
            <p className="mt-2 text-sm text-slate-500">
              사업주가 설정한 연말 평가 기간에만 평가를 작성·제출할 수 있습니다. 분기 진척 기록은 연중 작성할 수 있습니다.
            </p>
          </div>
        )
      )}

      {/* 탭 4: 주간 팀 부하 모니터링 */}
      {activeTab === 'workload' && (
        <TeamWeeklyWorkloadView
          initialThresholds={thresholds}
          onThresholdsChange={setThresholds}
        />
      )}

      {/* 탭 5: 연간 캐퍼시티 예측 대사 */}
      {activeTab === 'forecast' && (
        <MboYearlyCapacityForecastView thresholds={thresholds} />
      )}

      {/* 신규 목표 등록 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">신규 MBO 목표 등록</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateObjective} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">목표 계층 구분</label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as MboLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="company">전사 전략 목표</option>
                    <option value="department">부서 핵심 목표</option>
                    <option value="individual">개인 KPI 과제</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">가중치 (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">목표 타이틀 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 2026 하반기 신규 회원 유치 및 상담 전환율 35% 달성"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">핵심 성공 기준 (KPI) *</label>
                <input
                  type="text"
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  placeholder="예: 월 신규 상담 50건 이상, 등록 전환율 35% 돌파"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">담당 부서</label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">책임 담당자</label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    placeholder="담당자명"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <fieldset className="space-y-2 rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-xs font-bold text-slate-700">공개 범위</legend>
                {(
                  [
                    ['PUBLIC', '전사 공개 (PUBLIC)'],
                    ['PRIVATE', '비공개 (본인 및 평가자만, PRIVATE)'],
                    ['PARTIAL', '특정 인원에게만 부분 공개 (PARTIAL)'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex min-h-12 items-center gap-2 text-xs">
                    <input
                      type="radio"
                      name="mbo-visibility"
                      checked={newVisibility === value}
                      onChange={() => setNewVisibility(value)}
                    />
                    {label}
                  </label>
                ))}
                {newVisibility === 'PARTIAL' ? (
                  <button
                    type="button"
                    className="min-h-12 w-full rounded-xl border border-slate-300 text-xs font-bold"
                    onClick={() => setPickerOpen(true)}
                  >
                    + 사내 공개 대상자 선택 ({shareMemberIds.length}명)
                  </button>
                ) : null}
              </fieldset>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="min-h-12 px-4 text-xs font-semibold text-slate-500"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="min-h-12 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                >
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <OrganizationMemberPickerModal
        open={pickerOpen}
        departments={deptNodes.map((node) => ({
          id: node.id,
          name: node.name,
          parentId: node.parentId,
        }))}
        members={orgMembers.map((member) => {
          const dm = departmentMembers.find((row) => row.member_id === member.id);
          const dept = deptNodes.find((node) => node.id === dm?.department_id);
          return {
            id: member.id,
            userId: member.user_id,
            displayName: member.role === 'owner' ? '사업주' : member.user_id.slice(0, 8),
            departmentId: dm?.department_id ?? null,
            departmentName: dept?.name,
          };
        })}
        selectedIds={shareMemberIds}
        onChange={setShareMemberIds}
        onClose={() => setPickerOpen(false)}
        onConfirm={() => setPickerOpen(false)}
      />

      <MboRevisionTimelineModal
        open={Boolean(historyGoalId)}
        goalId={historyGoalId || ''}
        currentTargetValue={objectives.find((o) => o.id === historyGoalId)?.targetValue}
        currentDueDate={objectives.find((o) => o.id === historyGoalId)?.targetDate}
        onClose={() => setHistoryGoalId(null)}
      />

      <MboReviseGoalModal
        open={Boolean(reviseGoalId)}
        goalId={reviseGoalId || ''}
        currentTargetValue={objectives.find((o) => o.id === reviseGoalId)?.targetValue}
        currentDueDate={objectives.find((o) => o.id === reviseGoalId)?.targetDate}
        onClose={() => setReviseGoalId(null)}
        onRevised={() => {
          void objQuery?.refetch?.();
          setLocalObjectives((prev) =>
            prev.map((obj) =>
              obj.id === reviseGoalId
                ? { ...obj, revision: obj.revision + 1, isRevised: true, revisionCount: obj.revision + 1 }
                : obj,
            ),
          );
        }}
      />

      {/* 반려 사유 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">목표 반려 사유 작성</h3>
            <textarea
              value={rejectionInput}
              onChange={(e) => setRejectionInput(e.target.value)}
              placeholder="구체적인 반려 사유와 수정 권고 사항을 입력하세요."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none h-24"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showRejectModal) {
                    handleTransitionStatus(showRejectModal, 'rejected', rejectionInput);
                    setShowRejectModal(null);
                    setRejectionInput('');
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                반려 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
