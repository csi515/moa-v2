import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CanAccess } from '@refinedev/core';
import {
  Crown,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import {
  listRoleMembers,
  type DynamicMemberRow,
} from '@/core/organizations/services/dynamicRoleService';
import { transferOrganizationOwnership } from '@/core/organizations/services/organizationService';

const CONFIRM_TEXT = '소유권 이전 확인';

export function OwnershipTransferCard(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { currentOrganization, refreshOrganizations } = useOrganization();
  const { role } = useAuthorization();
  const orgId = currentOrganization?.id ?? '';

  const [members, setMembers] = useState<DynamicMemberRow[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [reason, setReason] = useState('');
  const [typedConfirm, setTypedConfirm] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    let mounted = true;
    async function loadMembers() {
      setLoadingMembers(true);
      setError(null);
      try {
        const list = await listRoleMembers(orgId);
        if (mounted) {
          // owner 본인을 제외한 활성 직원만 대상 목록으로 구성
          setMembers(list.filter((m) => m.is_active));
        }
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : '직원 목록 조회 실패');
        }
      } finally {
        if (mounted) setLoadingMembers(false);
      }
    }
    void loadMembers();
    return () => {
      mounted = false;
    };
  }, [orgId]);

  const candidateMembers = members.filter((m) => m.role !== 'owner');
  const selectedMember = candidateMembers.find((m) => m.id === selectedMemberId);

  const canProceed =
    selectedMemberId.length > 0 &&
    reason.trim().length >= 4 &&
    typedConfirm.trim() === CONFIRM_TEXT &&
    !submitting;

  async function handleTransfer() {
    if (!canProceed || !selectedMemberId) return;
    setSubmitting(true);
    setError(null);
    try {
      await transferOrganizationOwnership(selectedMemberId, reason.trim());
      setSuccess(true);
      setShowConfirmModal(false);
      queryClient.invalidateQueries();
      await refreshOrganizations({ quiet: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '소유권 이전에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  const isOwner = role === 'owner';

  return (
    <CanAccess resource="organization" action="transfer_ownership">
      <div
        data-testid="ownership-transfer-card"
        className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/50 via-white to-amber-50/30 p-6 shadow-sm"
      >
        <div className="flex items-start justify-between border-b border-rose-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {isOwner ? '법인 대표자 소유권 이전 (Ownership Transfer)' : '법인 대표이사 소유권 이전 [인사팀 대행]'}
                </h3>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  {isOwner ? '대표(CEO) 전용' : '인사팀 위임 대행'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {isOwner
                  ? '주기적인 대표이사 변경 또는 법인 지분 양도 시, 기존 데이터를 유지하며 사업장 최고 권한을 원자적으로 이관합니다.'
                  : '주주총회/이사회 결의 및 임원 변경 등기 절차에 따라 사내 차기 대표이사로의 소유권 이전을 대행합니다.'}
              </p>
            </div>
          </div>
        </div>

        {/* 주의 경고 배너 */}
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">소유권 이전 시 즉각적인 영향</p>
            <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
              <li>신임 대표자에게 사업장의 모든 데이터 및 전사 설정 권한이 완전히 부여됩니다.</li>
              <li>
                <strong>세션 즉시 파기:</strong> {isOwner
                  ? '소유권 이전 완료 즉시 본인의 대표자 권한이 일반 직원으로 강등되며 기존 발급된 세션 토큰이 즉시 만료됩니다.'
                  : '전임 대표이사는 일반 직원으로 전환되며, 전임/신임 대표이사의 세션 토큰(token_version)이 즉시 만료 및 재발급됩니다. 실행자인 인사담당자 본인의 세션은 유지됩니다.'}
              </li>
              <li>이 작업은 단일 원자적 트랜잭션으로 처리되며 실행자 사번 및 사유가 불변 감사 로그(audit_logs)에 영구 보존됩니다.</li>
            </ul>
          </div>
        </div>

        {success ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h4 className="mt-3 text-sm font-bold text-emerald-900">소유권 이전이 성공적으로 완료되었습니다</h4>
            <p className="mt-1 text-xs text-emerald-700">
              신임 대표자에게 사업자 권한이 인계되었으며, 권한 및 조직 정보가 갱신되었습니다.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            {/* 신임 대표자 선택 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                신임 대표자(후임 CEO) 선택 <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                disabled={loadingMembers || submitting}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:bg-slate-100"
              >
                <option value="">-- 신임 대표자를 선택하세요 --</option>
                {candidateMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.user_id.slice(0, 8)} ({m.email || '이메일 없음'} | 사번: {m.user_id.slice(0, 6)})
                  </option>
                ))}
              </select>
              {candidateMembers.length === 0 && !loadingMembers && (
                <p className="mt-1 text-xs text-slate-400">이전 가능한 활성 직원이 없습니다. 먼저 사원을 초대하세요.</p>
              )}
            </div>

            {/* 이전 사유 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                소유권 이전 사유 (불변 감사 로그 기록용) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  isOwner
                    ? '예: 대표이사 변경 등기 완료, 정기 인사 이동 등 (최소 4자)'
                    : '예: 제24기 정기주주총회/이사회 대표이사 변경 결의 (등기접수 제2026-12345호)'
                }
                disabled={submitting}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:bg-slate-100"
              />
            </div>

            {/* 확인 문구 타이핑 가드 */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                안전 확인: 아래 입력창에 <span className="font-bold text-rose-600">"{CONFIRM_TEXT}"</span>을 정확히 입력하세요 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                placeholder={CONFIRM_TEXT}
                disabled={submitting}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:bg-slate-100"
              />
            </div>

            {/* 실행 버튼 */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={!canProceed}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Lock className="h-4 w-4" />
                {isOwner ? '소유권 이전 실행' : '[인사팀 대행] 대표이사 소유권 이전 실행'}
              </button>
            </div>
          </div>
        )}

        {/* 최종 컨펌 모달 */}
        {showConfirmModal && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-600">
                <ShieldAlert className="h-7 w-7" />
                <h4 className="text-base font-bold text-slate-900">
                  {isOwner ? '최종 확인: 소유권을 이전하시겠습니까?' : '[인사팀 대행] 대표이사 소유권을 이전하시겠습니까?'}
                </h4>
              </div>

              <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">실행자:</span>
                  <span className="font-semibold text-slate-900">{isOwner ? '본인 (대표이사)' : '본인 (인사팀 대행)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">신임 대표이사:</span>
                  <span className="font-bold text-rose-600">
                    {selectedMember.name || selectedMember.user_id.slice(0, 8)} ({selectedMember.email})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">이전 사유:</span>
                  <span className="font-medium text-slate-900">{reason}</span>
                </div>
              </div>

              <p className="mt-4 text-xs font-medium text-rose-600">
                {isOwner
                  ? '이 작업을 진행하면 즉시 본인의 대표자 권한이 회수되며 세션이 종료됩니다. 계속하시겠습니까?'
                  : '이 작업을 진행하면 전임/신임 대표이사의 세션이 즉시 만료되며, 신임 대표이사에게 최고 권한이 이관됩니다. 계속하시겠습니까?'}
              </p>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleTransfer()}
                  disabled={submitting}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:bg-slate-300"
                >
                  {submitting ? '이전 처리 중...' : '확인 및 소유권 즉시 이전'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CanAccess>
  );
}
