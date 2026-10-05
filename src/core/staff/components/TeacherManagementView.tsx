import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useModuleLabels } from '@/core/labels';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { isOrgAdmin } from '@/core/auth/permissions';
import { useStorageRefresh } from '@/hooks/useStorageRefresh';
import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import {
  fetchStaffAccountStatuses,
  inviteStaffMember,
  revokeStaffInvitation,
  type StaffAccountStatus,
  type StaffAccountStatusItem,
} from '@/core/staff/services/staffAccountService';
import { AccountStatusBadge } from '@/core/accounts/AccountStatusBadge';
import { StaffInviteResultModal } from '@/core/staff/components/StaffInviteResultModal';
import { JoinRequestsPanel } from '@/core/organizations/components/JoinRequestsPanel';
import { StorageService } from '@/services/storage';
import { PageHeader } from '@/shared/components';
import { CurrencyInput } from '@/shared/components/CurrencyInput';
import { Teacher, type TeacherPayType } from '@/types';
import { payTypeLabel, payTypeRateUnitLabel, payTypeUsesUnitRate } from '@/capabilities/finance/teacherPayroll';
import { normalizeStaffGrants, type StaffGrants } from '@/core/staff/staffGrants';
import { StaffGrantFields, emptyStaffGrants } from './StaffGrantFields';
import { formatCurrency } from '@/utils/formatters';
import {
  GraduationCap,
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

export const TeacherManagementView: React.FC = () => {
  const { showToast, openConfirmDialog } = useApp();
  const refreshKey = useStorageRefresh([
    STORAGE_KEYS.TEACHERS,
    STORAGE_KEYS.CLASSES,
    STORAGE_KEYS.STUDENTS,
  ]);
  const labels = useModuleLabels();
  const { currentOrganization, currentRole } = useOrganization();
  const canManageAccounts = isOrgAdmin(currentRole);

  const teachers = StorageService.getTeachers();
  const classes = StorageService.getClasses();
  const students = StorageService.getStudents();

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
  }, [loadAccountStatuses, refreshKey]);

  const resolveStatus = (teacher: Teacher): StaffAccountStatus => {
    const fromServer = statusMap.get(teacher.id);
    if (fromServer) return fromServer.status;
    if (teacher.userId) return 'connected';
    return 'none';
  };

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    hireDate: new Date().toISOString().slice(0, 10),
    specialty: '클래식 피아노, 기초 테크닉',
    status: 'active' as 'active' | 'inactive',
    color: '#4f46e5',
    payType: 'hourly' as import('@/types').TeacherPayType,
    hourlyRate: 30000,
    salary: 0,
    grants: emptyStaffGrants(),
  });

  const handleOpenCreate = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      phone: '010-0000-0000',
      email: '',
      hireDate: new Date().toISOString().slice(0, 10),
      specialty: '유아 피아노, 반주법, 콩쿠르 지도',
      status: 'active',
      color: '#8b5cf6',
      payType: 'hourly',
      hourlyRate: 30000,
      salary: 0,
      grants: emptyStaffGrants(),
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
      grants: normalizeStaffGrants(t.grants),
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
        StorageService.deleteTeacher(t.id);
        showToast('선생님 정보가 삭제되었습니다.', 'info');
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    StorageService.saveTeacher({
      ...(editingTeacher ? { id: editingTeacher.id } : {}),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      hireDate: formData.hireDate,
      specialty: formData.specialty.trim(),
      status: formData.status,
      color: formData.color,
      payType: formData.payType,
      hourlyRate:
        formData.payType === 'hourly' ||
        formData.payType === 'attendance' ||
        formData.payType === 'work_hours'
          ? Number(formData.hourlyRate) || 0
          : undefined,
      salary: formData.payType === 'monthly' ? Number(formData.salary) || 0 : undefined,
      grants: formData.grants,
    } as Teacher);

    showToast(
      editingTeacher ? `${labels.staff.singular} 정보가 수정되었습니다.` : `신규 ${labels.staff.singular}가 등록되었습니다.`,
      'success'
    );
    setIsModalOpen(false);
    loadAccountStatuses();
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
      const result = await inviteStaffMember(currentOrganization.id, teacher.id, email);
      if (result.status === 'connected') {
        showToast(`${teacher.name} ${labels.staff.singular} 계정은 이미 연결되어 있습니다.`, 'info');
      } else if (result.token) {
        // 2026-09-28 hotfix: 이메일 일치 자동 연결 없음 — 1회용 초대 코드를 전달해 직접 수락
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

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<GraduationCap className="w-6 h-6" />}
        title={labels.staff.management}
        description={`${labels.staff.singular} 명단과 담당 배정`}
        actions={
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            신규 {labels.staff.singular} 등록
          </button>
        }
      />

      {canManageAccounts && <JoinRequestsPanel />}

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teachers.map((t) => {
          const teacherClasses = classes.filter((c) => c.teacherId === t.id);
          const teacherStudents = students.filter((s) => s.status === 'active' && s.teacherId === t.id);
          const accountStatus = resolveStatus(t);
          const isInviting = invitingStaffId === t.id;

          return (
            <div
              key={t.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl text-white font-black text-lg flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: t.color || '#4f46e5' }}
                    >
                      {t.name.slice(0, 1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                        {t.name}
                        {t.status === 'active' ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                            휴직
                          </span>
                        )}
                        {canManageAccounts && (
                          <AccountStatusBadge status={accountStatus} loading={statusLoading} />
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{t.specialty}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.phone}</span>
                  </div>
                  {t.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>입사일: {t.hireDate}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">담당 원생</span>
                    <strong className="text-indigo-600">{teacherStudents.length}명</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">개설 클래스</span>
                    <strong className="text-slate-800">{teacherClasses.length}개 반</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">정산</span>
                    <strong className="text-slate-800 text-right">
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
                    </strong>
                  </div>
                </div>

                {canManageAccounts && (
                  <div className="pt-1">
                    {accountStatus === 'connected' ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                        <Link2 className="w-3.5 h-3.5" />
                        로그인 계정 연결됨
                      </div>
                    ) : accountStatus === 'invited' ? (
                      (() => {
                        const info = statusMap.get(t.id);
                        const needsReissue = Boolean(info?.inviteExpired) || info?.inviteHasCode === false;
                        const expiresLabel = info?.inviteExpiresAt
                          ? new Date(info.inviteExpiresAt).toLocaleDateString('ko-KR', {
                              month: 'numeric',
                              day: 'numeric',
                            })
                          : null;
                        return (
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex items-center gap-1.5 text-[11px] font-semibold flex-1 ${
                                needsReissue ? 'text-rose-600' : 'text-amber-700'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {needsReissue
                                ? '초대 코드 만료 · 재발급 필요'
                                : `수락 대기 중${expiresLabel ? ` (~${expiresLabel})` : ''}`}
                            </div>
                            <button
                              onClick={() => handleInvite(t)}
                              disabled={isInviting}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-slate-100 disabled:opacity-60"
                              title="새 코드를 발급하면 이전 코드는 즉시 무효가 됩니다"
                            >
                              재발급
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(t)}
                              className="text-[10px] font-bold text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-slate-100"
                            >
                              취소
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      <button
                        onClick={() => handleInvite(t)}
                        disabled={isInviting}
                        className="w-full mt-1 px-3 py-2 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        {isInviting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                        계정 초대
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {editingTeacher ? `${labels.staff.singular} 정보 수정` : `신규 ${labels.staff.singular} 등록`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-3">
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

              <StaffGrantFields
                value={formData.grants}
                onChange={(grants: StaffGrants) => setFormData({ ...formData, grants })}
              />

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

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function formatTeacherPay(amount?: number): string {
  if (!amount || amount <= 0) return '미설정';
  return formatCurrency(amount);
}
