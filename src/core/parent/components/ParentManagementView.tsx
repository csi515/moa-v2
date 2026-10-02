import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { getCustomerLabel } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useStorageRefresh } from '@/hooks/useStorageRefresh';
import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import {
  fetchParentAccountStatuses,
  inviteParentWithSync,
  revokeParentInvitation,
  type ParentAccountStatus,
  type ParentAccountStatusItem,
  type InviteParentResult,
} from '@/core/parent/services/parentAccountService';
import { sendParentInvitationEmail } from '@/core/parent/services/parentInviteService';
import { renderAcademyParentInviteResult } from '@/core/staff/staffUi';
import { formatGuardianRelationship, searchParents } from '@/core/parent';
import { AccountStatusBadge } from '@/core/accounts/AccountStatusBadge';
import { StorageService } from '@/services/storage';
import { Parent } from '@/types';
import { formatPhone, getLevelColor } from '@/utils/formatters';
import { PageHeader, FilterBar, SearchField, EmptyState } from '@/shared/components';
import { Modal } from '@/shared/components/ui/Modal';
import {
  UserSquare2,
  Phone,
  Users,
  Mail,
  Link2,
  Loader2,
} from 'lucide-react';

export const ParentManagementView: React.FC = () => {
  const { setSelectedStudentId, setActiveTab, showToast } = useApp();
  const refreshKey = useStorageRefresh([
    STORAGE_KEYS.PARENTS,
    STORAGE_KEYS.STUDENTS,
    STORAGE_KEYS.PARENT_STUDENT_LINKS,
  ]);
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular || getCustomerLabel(industry);
  const contactLabel = labels.contact.singular;
  const contactManagement = labels.contact.management;
  const { currentOrganization, currentRole } = useOrganization();
  const canInvite = currentRole === 'owner' || currentRole === 'admin' || currentRole === 'manager';

  const [searchQuery, setSearchQuery] = useState('');
  const [accountStatuses, setAccountStatuses] = useState<ParentAccountStatusItem[]>([]);
  const [inviteTarget, setInviteTarget] = useState<Parent | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteParentResult | null>(null);
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [inviteEmailMessage, setInviteEmailMessage] = useState<string | undefined>();

  useEffect(() => {
    StorageService.syncParentsFromStudents();
  }, [refreshKey]);

  const parents = StorageService.getParents();
  const students = StorageService.getStudents();
  const parentLinks = StorageService.getParentStudentLinks();

  const getChildRelationship = (parentId: string, studentId: string) => {
    const link = parentLinks.find((l) => l.parentId === parentId && l.studentId === studentId);
    return link ? formatGuardianRelationship(link.relationship) : null;
  };

  const loadStatuses = useCallback(async () => {
    if (!currentOrganization?.id || !canInvite) return;
    try {
      const statuses = await fetchParentAccountStatuses(currentOrganization.id);
      setAccountStatuses(statuses);
    } catch {
      /* offline fallback */
    }
  }, [currentOrganization?.id, canInvite]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses, refreshKey]);

  const statusMap = useMemo(
    () => new Map(accountStatuses.map((s) => [s.parentCustomerId, s])),
    [accountStatuses]
  );

  const filteredParents = searchParents(searchQuery);

  const statusSummary = useMemo(() => {
    const counts = { connected: 0, invited: 0, none: 0 };
    for (const parent of parents) {
      const status = statusMap.get(parent.id)?.status || 'none';
      if (status === 'connected') counts.connected += 1;
      else if (status === 'invited') counts.invited += 1;
      else counts.none += 1;
    }
    return counts;
  }, [parents, statusMap]);

  const resolveStatus = (parent: Parent): ParentAccountStatus => {
    return statusMap.get(parent.id)?.status || 'none';
  };

  const handleInvite = async () => {
    if (!inviteTarget || !currentOrganization?.id || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const parentName = inviteTarget.name;
      const result = await inviteParentWithSync(
        currentOrganization.id,
        inviteTarget.id,
        inviteEmail.trim()
      );

      let emailSent = false;
      let emailMessage: string | undefined;

      // 2026-09-28 hotfix: 이메일 일치 자동 연결 제거 — 항상 'invited' + 연결 코드
      if (result.linkCodes.length > 0) {
        const emailResult = await sendParentInvitationEmail({
          organizationId: currentOrganization.id,
          parentCustomerId: inviteTarget.id,
          linkCodes: result.linkCodes,
        });
        emailSent = emailResult.emailSent;
        emailMessage = emailResult.message;
      }

      setInviteResult(result);
      setInviteEmailSent(emailSent);
      setInviteEmailMessage(emailMessage);
      setInviteTarget(null);
      setInviteEmail('');

      showToast(
        emailSent
          ? `${parentName} ${contactLabel}에게 초대 이메일을 보냈습니다.`
          : `${parentName} ${contactLabel} 초대가 등록되었습니다. 연결 코드를 전달해 주세요.`,
        'success'
      );

      await loadStatuses();
    } catch (e: any) {
      showToast(e?.message || '초대에 실패했습니다.', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (parent: Parent) => {
    if (!currentOrganization?.id) return;
    try {
      await revokeParentInvitation(currentOrganization.id, parent.id);
      showToast('초대가 취소되었습니다.', 'info');
      await loadStatuses();
    } catch {
      showToast('초대 취소에 실패했습니다.', 'error');
    }
  };

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab('students');
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<UserSquare2 className="w-6 h-6" />}
        title={contactManagement}
        description={`${contactLabel} 계정을 초대하면 출결·과제·리포트를 ${contactLabel} 앱에서 확인할 수 있습니다.`}
      />

      {canInvite && parents.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3 text-center">
            <p className="text-lg font-black text-emerald-700">{statusSummary.connected}</p>
            <p className="text-[11px] font-bold text-emerald-800/80">연결 완료</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-3 text-center">
            <p className="text-lg font-black text-amber-700">{statusSummary.invited}</p>
            <p className="text-[11px] font-bold text-amber-800/80">초대중</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
            <p className="text-lg font-black text-slate-700">{statusSummary.none}</p>
            <p className="text-[11px] font-bold text-slate-600">미연결</p>
          </div>
        </div>
      )}

      <FilterBar>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={`${contactLabel} 이름, 연락처, ${customerLabel} 이름 검색...`}
          className="flex-1 min-w-[200px]"
        />
      </FilterBar>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParents.map((parent) => {
          const status = resolveStatus(parent);
          const parentStudents = parent.studentIds
            .map((id) => students.find((s) => s.id === id))
            .filter(Boolean);

          return (
            <div
              key={parent.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    {parent.name.slice(0, 1) || '학'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{parent.name}</h4>
                    <p className="font-mono text-xs text-indigo-600 font-semibold mt-0.5">
                      {formatPhone(parent.phone)}
                    </p>
                    <div className="mt-1">
                      <AccountStatusBadge status={status} />
                    </div>
                  </div>
                </div>
                <a
                  href={`tel:${parent.phone}`}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>

              {canInvite && status !== 'connected' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setInviteTarget(parent);
                      setInviteEmail(parent.email || '');
                    }}
                    className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1"
                  >
                    <Link2 className="w-3 h-3" /> 포털 초대
                  </button>
                  {status === 'invited' && (
                    <button
                      onClick={() => handleRevoke(parent)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg"
                    >
                      취소
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase">자녀 ({parentStudents.length}명)</p>
                {parentStudents.map((st) => {
                  const relLabel = getChildRelationship(parent.id, st!.id);
                  return (
                    <button
                      key={st!.id}
                      onClick={() => handleStudentClick(st!.id)}
                      className="w-full p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold flex items-center gap-1.5">
                        {st!.name}
                        {relLabel && (
                          <span className="text-[10px] font-bold text-slate-400">({relLabel})</span>
                        )}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${getLevelColor(st!.level)}`}>
                        {st!.level}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filteredParents.length === 0 && (
        <EmptyState
          icon={<Users className="w-10 h-10" />}
          title={searchQuery.trim() ? "검색 결과가 없습니다" : `등록된 ${contactLabel}가 없습니다`}
          description={searchQuery.trim()
            ? "다른 이름이나 연락처로 검색해보세요. 또는 검색어를 지우고 전체 목록을 확인하세요."
            : `${customerLabel} 등록 시 ${contactLabel} 정보가 자동으로 생성됩니다. ${customerLabel} 관리에서 첫 ${customerLabel}을(를) 등록해보세요.`}
          action={
            searchQuery.trim() && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all"
              >
                검색 초기화
              </button>
            )
          }
        />
      )}

      <Modal
        isOpen={Boolean(inviteTarget)}
        onClose={() => setInviteTarget(null)}
        title={`${contactLabel} 포털 초대`}
        maxWidth="sm"
      >
        {inviteTarget && (
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-3">
              {inviteTarget.name} — 연결 코드(링크·QR)가 생성됩니다. 받는 분이 로그인한 뒤
              코드로 직접 수락해야 연결됩니다.
            </p>
            <label className="text-xs font-semibold text-slate-700">이메일</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="예: name@example.com"
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-xl mb-4"
            />
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              초대 보내기
            </button>
          </div>
        )}
      </Modal>

      {inviteResult &&
        inviteResult.status === 'invited' &&
        renderAcademyParentInviteResult({
          parentName:
            parents.find((p) => p.id === inviteResult.parentCustomerId)?.name || contactLabel,
          email: inviteResult.email || '',
          organizationName: inviteResult.organizationName || currentOrganization?.name || '사업장',
          linkCodes: inviteResult.linkCodes,
          emailSent: inviteEmailSent,
          emailMessage: inviteEmailMessage,
          onClose: () => setInviteResult(null),
        })}
    </div>
  );
};
