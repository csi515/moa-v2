import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useModuleLabels } from '@/core/labels';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isOrgAdmin } from '@/core/auth/permissions';
import { useList, useCreate, useUpdate, useDelete } from '@refinedev/core';

import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import {
  fetchStaffAccountStatuses,
  inviteStaffMember,
  revokeStaffInvitation,
  type StaffAccountStatus,
  type StaffAccountStatusItem,
} from '@/core/staff/services/staffAccountService';
import { issueStaffInviteToken } from '@/core/staff/services/issueStaffInviteToken';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AccountStatusBadge } from '@/core/accounts/AccountStatusBadge';
import { StaffInviteResultModal } from '@/core/staff/components/StaffInviteResultModal';
import { JoinRequestsPanel } from '@/core/organizations/components/JoinRequestsPanel';
import { PageHeader } from '@/shared/components';
import { Modal } from '@/shared/components/ui/Modal';
import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { todayIsoLocal } from '@/shared/utils/localDate';
import type { Teacher } from '@/types/teacher';
import type { TeacherPayType } from '@/capabilities/billing/finance/billingLedgerTypes';
import { payTypeLabel, payTypeRateUnitLabel, payTypeUsesUnitRate } from '@/capabilities/billing/finance/teacherPayroll';
import { EMPTY_STAFF_GRANTS, type StaffGrants } from '@/core/staff/staffGrants';
import { formatCurrency } from '@/utils/formatters';
import {
  GraduationCap,
  Search,
  Plus,
  Trash2,
  Edit,
  Phone,
  Mail,
  Calendar,
  X,
  UserPlus,
  Link2,
  Clock,
  Loader2,
} from 'lucide-react';

interface StaffRow {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  user_id?: string | null;
  status?: string;
  created_at: string;
  metadata?: {
    hireDate?: string;
    payType?: TeacherPayType;
    payRate?: number;
    hourlyRate?: number;
    salary?: number;
    color?: string;
    specialty?: string;
    memo?: string;
    grants?: StaffGrants;
  } | null;
}

interface ClassRow {
  id: string;
  name?: string;
  metadata?: {
    teacherId?: string;
  } | null;
}

interface CustomerRow {
  id: string;
  name?: string;
  status?: string;
  teacher_id?: string | null;
}

export const TeacherManagementView: React.FC = () => {
  const { showToast, openConfirmDialog } = useApp();
  const labels = useModuleLabels();
  const { currentOrganization, currentRole } = useOrganization();
  const canManageAccounts = isOrgAdmin(currentRole);

  // TanStack Query (via @refinedev/core) 로 데이터 페칭
  const staffList = useList<StaffRow>({
    resource: 'staff',
    meta: { select: '*' }
  });
  const staffRows = staffList.query.data?.data || [];
  const isStaffLoading = staffList.query.isLoading;

  const classesList = useList<ClassRow>({
    resource: 'classes',
    meta: { select: '*' }
  });
  const classRows = classesList.query.data?.data || [];
  const isClassesLoading = classesList.query.isLoading;

  const customersList = useList<CustomerRow>({
    resource: 'customers',
    meta: { select: '*' }
  });
  const customerRows = customersList.query.data?.data || [];
  const isCustomersLoading = customersList.query.isLoading;

  const rolesList = useList<{ id: string; name: string }>({
    resource: 'tenant_roles',
    meta: { select: 'id,name' },
    pagination: { mode: 'off' },
  });
  const tenantRoles = useMemo(() => {
    const raw = rolesList.query.data?.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [rolesList.query.data]);
  const [inviteRoleId, setInviteRoleId] = useState('');
  useEffect(() => {
    if (!inviteRoleId && tenantRoles.length > 0) {
      const preferred =
        tenantRoles.find((r) => /전임|강사|instructor/i.test(r.name)) || tenantRoles[0];
      setInviteRoleId(preferred.id);
    }
  }, [tenantRoles, inviteRoleId]);

  const { mutate: createStaff } = useCreate<StaffRow>();
  const { mutate: updateStaff } = useUpdate<StaffRow>();
  const { mutate: deleteStaff } = useDelete();

  // DB 스키마 -> UI 모델(Teacher) 어댑터
  const teachers: Teacher[] = useMemo(() => {
    if (isStaffLoading || isClassesLoading || isCustomersLoading) return [];

    return staffRows.map(row => {
      const meta = row.metadata;
      return {
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        email: row.email || undefined,
        userId: row.user_id,
        status: row.status as Teacher['status'],
        hireDate: meta?.hireDate || row.created_at,
        payType: meta?.payType,
        payRate: meta?.payRate,
        hourlyRate: meta?.hourlyRate,
        salary: meta?.salary,
        color: meta?.color,
        specialty: meta?.specialty,
        memo: meta?.memo,
        grants: meta?.grants,
      };
    });
  }, [isStaffLoading, isClassesLoading, isCustomersLoading, staffRows]);

  const classes = useMemo(() => {
    return classRows.map(row => ({
      id: row.id,
      name: row.name,
      teacherId: row.metadata?.teacherId,
    }));
  }, [classRows]);

  const students = useMemo(() => {
    return customerRows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      teacherId: row.teacher_id,
    }));
  }, [customerRows]);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [accountStatuses, setAccountStatuses] = useState<StaffAccountStatusItem[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [invitingStaffId, setInvitingStaffId] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    staffName: string;
    token: string;
    expiresAt?: string;
    organizationName?: string;
  } | null>(null);

  const statusMap = useMemo(
    () => new Map(accountStatuses.map((s) => [s.staffId, s])),
    [accountStatuses]
  );

  const loadAccountStatuses = useCallback(async () => {
    if (!currentOrganization?.id || !canManageAccounts) return;
    setStatusLoading(true);
    try {
      const statuses = await fetchStaffAccountStatuses(currentOrganization.id);
      setAccountStatuses(statuses);
    } catch {
      // 조회 실패 시 UI는 teacher.userId 기준 fallback
    } finally {
      setStatusLoading(false);
    }
  }, [currentOrganization?.id, canManageAccounts]);

  useEffect(() => {
    loadAccountStatuses();
  }, [loadAccountStatuses]);

  const resolveStatus = (teacher: Teacher): StaffAccountStatus => {
    const fromServer = statusMap.get(teacher.id);
    if (fromServer) return fromServer.status;
    if (teacher.userId) return 'connected';
    return 'none';
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchName = (t.name || '').toLowerCase().includes(term);
        const matchPhone = (t.phone || '').includes(term);
        const matchEmail = (t.email || '').toLowerCase().includes(term);
        const matchSpecialty = (t.specialty || '').toLowerCase().includes(term);
        if (!matchName && !matchPhone && !matchEmail && !matchSpecialty) {
          return false;
        }
      }
      return true;
    });
  }, [teachers, statusFilter, searchTerm]);

  const counts = useMemo(() => {
    const active = teachers.filter((t) => t.status === 'active').length;
    const inactive = teachers.filter((t) => t.status !== 'active').length;
    return {
      all: teachers.length,
      active,
      inactive,
    };
  }, [teachers]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    hireDate: todayIsoLocal(),
    specialty: '',
    status: 'active' as 'active' | 'inactive',
    color: '#2563eb',
    payType: 'hourly' as TeacherPayType,
    hourlyRate: 30000,
    salary: 0,
  });

  const handleOpenCreate = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      hireDate: todayIsoLocal(),
      specialty: '',
      status: 'active',
      color: '#2563eb',
      payType: 'hourly',
      hourlyRate: 30000,
      salary: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    const inferred =
      t.payType ||
      ((t.hourlyRate || 0) > 0 ? 'hourly' : (t.salary || 0) > 0 ? 'monthly' : 'hourly');
    setFormData({
      name: t.name,
      phone: t.phone,
      email: t.email || '',
      hireDate: t.hireDate,
      specialty: t.specialty || '',
      status: t.status === 'resigned' ? 'inactive' : t.status,
      color: t.color || '#4f46e5',
      payType: inferred,
      hourlyRate: t.hourlyRate || 0,
      salary: t.salary || 0,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (t: Teacher) => {
    openConfirmDialog({
      title: `${labels.staff.singular} 정보 삭제`,
      message: `'${t.name}' 선생님 정보를 삭제하시겠습니까?`,
      isDestructive: true,
      confirmText: '삭제하기',
      onConfirm: () => {
        deleteStaff({
          resource: 'staff',
          id: t.id,
        }, {
          onSuccess: () => showToast(`${labels.staff.singular} 정보가 삭제되었습니다.`, 'success'),
        });
        showToast('선생님 정보가 삭제되었습니다.', 'info');
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const baseData = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || null,
      status: formData.status,
      metadata: {
        hireDate: formData.hireDate,
        specialty: formData.specialty.trim(),
        color: formData.color,
        payType: formData.payType,
        hourlyRate:
          formData.payType === 'hourly' ||
          formData.payType === 'attendance' ||
          formData.payType === 'work_hours'
            ? Number(formData.hourlyRate) || 0
            : undefined,
        salary: formData.payType === 'monthly' ? Number(formData.salary) || 0 : undefined,
        // 강사별 세부 권한 선택 UI 제거 — 저장 시 항상 비움(재무·수납 등 사업주 전용)
        grants: EMPTY_STAFF_GRANTS,
      }
    };

    if (editingTeacher) {
      updateStaff({
        resource: 'staff',
        id: editingTeacher.id,
        values: baseData,
      }, {
        onSuccess: () => {
          showToast(`${labels.staff.singular} 정보가 수정되었습니다.`, 'success');
          setIsModalOpen(false);
          loadAccountStatuses();
        }
      });
    } else {
      createStaff({
        resource: 'staff',
        values: baseData,
      }, {
        onSuccess: () => {
          showToast(`새 ${labels.staff.singular}가 등록되었습니다.`, 'success');
          setIsModalOpen(false);
          loadAccountStatuses();
        }
      });
    }
  };

  const handleInvite = async (teacher: Teacher) => {
    if (!currentOrganization?.id) return;

    const email = (teacher.email || '').trim();
    if (!email || !email.includes('@')) {
      showToast('계정 초대를 위해 이메일을 먼저 등록해 주세요.', 'warning');
      handleOpenEdit(teacher);
      return;
    }

    setInvitingStaffId(teacher.id);
    try {
      const selectedRole =
        tenantRoles.find((r) => r.id === inviteRoleId) || tenantRoles[0] || null;

      // 직급(tenant_roles)이 있으면 role_id 페이로드로 초대 — claim 시 custom_role 연결
      if (isSupabaseConfigured() && selectedRole) {
        const issued = await issueStaffInviteToken({
          organizationId: currentOrganization.id,
          organizationName: currentOrganization.name,
          roleId: selectedRole.id,
          roleName: selectedRole.name,
          ttlSeconds: 60 * 60 * 24 * 7,
        });
        setInviteResult({
          staffName: `${teacher.name} (${selectedRole.name})`,
          token: issued.claimToken,
          expiresAt: issued.expiresAt,
          organizationName: currentOrganization.name,
        });
        await loadAccountStatuses();
        return;
      }

      const result = await inviteStaffMember(currentOrganization.id, teacher.id, email);
      if (result.status === 'connected') {
        showToast(`${teacher.name} ${labels.staff.singular} 계정은 이미 연결되어 있습니다.`, 'info');
      } else if (result.token) {
        setInviteResult({
          staffName: teacher.name,
          token: result.token,
          expiresAt: result.expiresAt,
          organizationName: result.organizationName || currentOrganization.name,
        });
      } else {
        showToast(
          `${teacher.name} ${labels.staff.singular} 초대가 등록되었습니다. 초대 코드를 받으려면 재발급해 주세요.`,
          'warning'
        );
      }
      await loadAccountStatuses();
    } catch (err) {
      const message = err instanceof Error ? err.message : '초대에 실패했습니다.';
      showToast(message, 'error');
    } finally {
      setInvitingStaffId(null);
    }
  };

  const handleRevokeInvite = (teacher: Teacher) => {
    if (!currentOrganization?.id) return;

    openConfirmDialog({
      title: '초대 취소',
      message: `${teacher.name} ${labels.staff.singular}의 계정 초대를 취소하시겠습니까? 전달한 초대 코드는 즉시 사용할 수 없게 됩니다.`,
      isDestructive: true,
      confirmText: '초대 취소',
      onConfirm: async () => {
        try {
          await revokeStaffInvitation(currentOrganization.id, teacher.id);
          showToast('초대가 취소되었습니다.', 'info');
          await loadAccountStatuses();
        } catch {
          showToast('초대 취소에 실패했습니다.', 'error');
        }
      },
    });
  };

  if (isStaffLoading || isClassesLoading || isCustomersLoading) {
    return <PageListSkeleton rows={3} message="직원 목록을 불러오는 중입니다..." />;
  }

  return (
    <div className="space-y-5 pb-8">
      {/* 1. 상단 단일 헤더 (표준 PageHeader) */}
      <PageHeader
        icon={<GraduationCap className="w-5 h-5 text-slate-700" strokeWidth={1.5} />}
        title={labels.staff.management}
        badge={`${teachers.length}명`}
        description={`${labels.staff.singular} 목록과 담당 배정 및 정산 현황을 관리합니다.`}
        actions={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="min-h-[36px] px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>신규 {labels.staff.singular} 등록</span>
          </button>
        }
      />

      {canManageAccounts && <JoinRequestsPanel />}

      {/* 초대 시 부여 직급 선택 패널 (톤다운) */}
      {canManageAccounts && tenantRoles.length > 0 && (
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs"
          data-testid="staff-invite-role-picker"
        >
          <label className="font-semibold text-slate-800 shrink-0" htmlFor="invite-role-select">
            초대 시 부여 직급:
          </label>
          <select
            id="invite-role-select"
            value={inviteRoleId}
            onChange={(e) => setInviteRoleId(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-slate-400 focus:outline-none"
          >
            {tenantRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-slate-500">
            (선택된 직급으로 초대 코드가 발급되며, 수락 시 직급 권한이 자동 부여됩니다)
          </span>
        </div>
      )}

      {/* 2. 압축된 검색 & 필터 바 (Toolbar) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200 shadow-2xs">
        {/* 상태 필터 탭 */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition min-h-[32px] ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            전체 {counts.all}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition min-h-[32px] ${
              statusFilter === 'active'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            재직 {counts.active}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition min-h-[32px] ${
              statusFilter === 'inactive'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            휴직 {counts.inactive}
          </button>
        </div>

        {/* 검색 인풋 & 결과 요약 */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`${labels.staff.singular} 이름·연락처·전공 검색...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-xs text-slate-400 shrink-0 hidden md:inline">
            표시: <strong className="text-slate-700">{filteredTeachers.length}</strong>명
          </span>
        </div>
      </div>

      {/* 3. 본문 렌더링: 빈 화면(Empty State) 또는 데이터 목록 */}
      {filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-2xs">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          {teachers.length === 0 ? (
            <>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                아직 등록된 {labels.staff.singular}이(가) 없습니다
              </h3>
              <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
                {labels.staff.singular}을(를) 등록하면 수업 배정과 담당 학생 관리, 출결 및 정산 업무를 바로 시작할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                첫 {labels.staff.singular} 등록하기
              </button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                검색 조건과 일치하는 {labels.staff.singular}이(가) 없습니다
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                검색어를 확인하거나 필터 조건을 초기화해 보세요.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="text-xs text-slate-700 hover:text-slate-900 underline font-semibold"
              >
                필터 초기화
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* 데스크탑 테이블 뷰 */}
          <div className="hidden md:block rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">성명 / 전공</th>
                  <th className="px-4 py-3">연락처</th>
                  <th className="px-4 py-3">담당 현황</th>
                  <th className="px-4 py-3">정산 방식</th>
                  {canManageAccounts && <th className="px-4 py-3">계정 연동</th>}
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((t) => {
                  const teacherClasses = classes.filter((c) => c.teacherId === t.id);
                  const teacherStudents = students.filter((s) => s.status === 'active' && s.teacherId === t.id);
                  const accountStatus = resolveStatus(t);
                  const isInviting = invitingStaffId === t.id;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 성명 & 전공 */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-md text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ backgroundColor: t.color || '#2563eb' }}
                          >
                            {t.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
                              {t.name}
                              {t.status === 'active' ? (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" title="재직" />
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-medium">
                                  휴직
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {t.specialty || '전공 미입력'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 연락처 */}
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1 font-mono">{t.phone || '-'}</div>
                        {t.email && <div className="text-[11px] text-slate-400 mt-0.5">{t.email}</div>}
                      </td>

                      {/* 담당 현황 */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">
                          담당 {labels.customer?.singular || '원생'} {teacherStudents.length}명
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          개설 클래스 {teacherClasses.length}개 반
                        </div>
                      </td>

                      {/* 정산 방식 */}
                      <td className="px-4 py-3 text-slate-700">
                        {(() => {
                          const type =
                            t.payType ||
                            ((t.hourlyRate || 0) > 0
                              ? 'hourly'
                              : (t.salary || 0) > 0
                                ? 'monthly'
                                : 'none');
                          if (type === 'none') return <span className="text-slate-400">미설정</span>;
                          if (type === 'monthly') return <span className="font-medium text-slate-900">월급 {formatTeacherPay(t.salary)}</span>;
                          return <span className="font-medium text-slate-900">{payTypeLabel(type)} {formatTeacherPay(t.hourlyRate)}</span>;
                        })()}
                      </td>

                      {/* 계정 연동 */}
                      {canManageAccounts && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <AccountStatusBadge status={accountStatus} loading={statusLoading} />
                            {accountStatus === 'none' && (
                              <button
                                type="button"
                                onClick={() => handleInvite(t)}
                                disabled={isInviting}
                                className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
                              >
                                {isInviting ? <Loader2 className="w-3 h-3 animate-spin" /> : '초대'}
                              </button>
                            )}
                            {accountStatus === 'invited' && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleInvite(t)}
                                  disabled={isInviting}
                                  className="text-[11px] text-slate-600 hover:text-slate-900 underline"
                                >
                                  재발급
                                </button>
                                <span className="text-slate-300">·</span>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeInvite(t)}
                                  className="text-[11px] text-rose-500 hover:text-rose-700 underline"
                                >
                                  취소
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 관리 버튼 */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            title="정보 수정"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 뷰 */}
          <div className="md:hidden space-y-3">
            {filteredTeachers.map((t) => {
              const teacherClasses = classes.filter((c) => c.teacherId === t.id);
              const teacherStudents = students.filter((s) => s.status === 'active' && s.teacherId === t.id);
              const accountStatus = resolveStatus(t);
              const isInviting = invitingStaffId === t.id;

              return (
                <div
                  key={t.id}
                  className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-md text-white font-bold text-xs flex items-center justify-center shrink-0"
                        style={{ backgroundColor: t.color || '#2563eb' }}
                      >
                        {t.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                          {t.name}
                          {t.status === 'active' ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded">휴직</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{t.specialty || '전공 미입력'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">연락처</span>
                      <span className="font-mono">{t.phone || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">담당 현황</span>
                      <span className="font-medium text-slate-800">
                        원생 {teacherStudents.length}명 · {teacherClasses.length}개 반
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">정산</span>
                      <span className="font-medium text-slate-800">
                        {(() => {
                          const type =
                            t.payType ||
                            ((t.hourlyRate || 0) > 0
                              ? 'hourly'
                              : (t.salary || 0) > 0
                                ? 'monthly'
                                : 'none');
                          if (type === 'none') return '미설정';
                          if (type === 'monthly') return `월급 ${formatTeacherPay(t.salary)}`;
                          return `${payTypeLabel(type)} ${formatTeacherPay(t.hourlyRate)}`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {canManageAccounts && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <AccountStatusBadge status={accountStatus} loading={statusLoading} />
                      {accountStatus === 'none' && (
                        <button
                          type="button"
                          onClick={() => handleInvite(t)}
                          disabled={isInviting}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                        >
                          {isInviting ? <Loader2 className="w-3 h-3 animate-spin" /> : '계정 초대'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {inviteResult && (
        <StaffInviteResultModal
          staffName={inviteResult.staffName}
          organizationName={inviteResult.organizationName}
          token={inviteResult.token}
          expiresAt={inviteResult.expiresAt}
          staffLabel={labels.staff.singular}
          onClose={() => setInviteResult(null)}
        />
      )}

      {/* Teacher Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTeacher ? `${labels.staff.singular} 정보 수정` : `신규 ${labels.staff.singular} 등록`}
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              form="teacher-form"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              저장
            </button>
          </div>
        }
      >
        <form id="teacher-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  선생님 성명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 김선경"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">연락처</label>
                  <input
                    type="tel"
                    required
                    placeholder="010-0000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">입사일자</label>
                  <input
                    type="date"
                    required
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  이메일 {canManageAccounts && <span className="text-slate-400 font-normal">(연락용 · 계정 연결은 초대 코드로)</span>}
                </label>
                <input
                  type="email"
                  placeholder="예: name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">전공 및 전문 분야</label>
                <input
                  type="text"
                  placeholder="예: 피아노과 학사 / 반주법, 유아 음악 전문"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">정산 방식</label>
                  <select
                    value={formData.payType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payType: e.target.value as TeacherPayType,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold min-h-[44px]"
                  >
                    <option value="hourly">수업 실적 (수업 횟수 × 회당 지급액)</option>
                    <option value="attendance">출근 횟수 (출근 × 1회 지급액)</option>
                    <option value="work_hours">근무 시간 (시간 × 시간당 지급액)</option>
                    <option value="monthly">월급 (월 고정)</option>
                    <option value="none">정산 안 함</option>
                  </select>
                </div>
                {payTypeUsesUnitRate(formData.payType) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      지급 기준 ({payTypeRateUnitLabel(formData.payType)})
                    </label>
                    <CurrencyInput
                      value={formData.hourlyRate}
                      onChange={(v) => setFormData({ ...formData, hourlyRate: v })}
                    />
                    {(formData.payType === 'attendance' || formData.payType === 'work_hours') && (
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                        강사 출근·근무시간은 아직 자동 집계되지 않습니다. 매월 정산 화면에서
                        실적을 직접 입력합니다.
                      </p>
                    )}
                  </div>
                )}
                {formData.payType === 'monthly' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      지급 기준 (원 / 월)
                    </label>
                    <CurrencyInput
                      value={formData.salary}
                      onChange={(v) => setFormData({ ...formData, salary: v })}
                    />
                  </div>
                )}
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  재무 &gt; 강사정산에서 월별 실적을 확인하고 정산 확정·지출 등록을 진행합니다.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">대표 색상</label>
                <div className="flex gap-2">
                  {['#4f46e5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-7 h-7 rounded-xl border-2 transition-transform cursor-pointer ${
                        formData.color === c ? 'scale-110 border-slate-900' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

        </form>
      </Modal>
    </div>
  );
};

function formatTeacherPay(amount?: number): string {
  if (!amount || amount <= 0) return '미설정';
  return formatCurrency(amount);
}
