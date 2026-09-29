import React, { useEffect, useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { useParentPortal } from '@/core/parent/context/ParentPortalContext';
import { type GlobalStudent } from '@/core/parent/types/globalParent';
import { ParentRequestEnrollmentModal } from './ParentRequestEnrollmentModal';
import { ParentChildSelectorModal } from './ParentChildSelectorModal';
import { ParentEnrollmentConsentModal } from './ParentEnrollmentConsentModal';
import {
  requestEnrollment,
  cancelEnrollmentRequest,
  findOrganizationByCode,
  type OrganizationSearchResult,
} from '@/core/parent/services/enrollmentRequestService';
import {
  consumePendingOrgPublicCode,
  peekPendingOrgPublicCode,
} from '@/core/parent/services/pendingOrgConnect';
import { useApp } from '@/context/AppContext';
import { ParentAddChildModal } from './ParentAddChildModal';
import { ParentChildCard } from './ParentChildCard';
import { ParentEnrollmentStatusCard } from './ParentEnrollmentStatusCard';

export const ParentChildrenHome: React.FC<{ addRequest?: number }> = ({ addRequest = 0 }) => {
  const { portalTree, selectStudent, refreshPortalTree } = useParentPortal();
  const { showToast } = useApp();
  const children = portalTree?.children ?? [];
  const requests = portalTree?.enrollmentRequests ?? [];

  const [showOrgSearch, setShowOrgSearch] = useState(false);
  const [showChildSelector, setShowChildSelector] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationSearchResult | null>(null);
  const [selectedChild, setSelectedChild] = useState<GlobalStudent | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingChild, setEditingChild] = useState<GlobalStudent | null>(null);
  const [continueAfterAdd, setContinueAfterAdd] = useState(false);

  useEffect(() => {
    const code = peekPendingOrgPublicCode();
    if (!code) return;

    let cancelled = false;
    void (async () => {
      try {
        const org = await findOrganizationByCode(code);
        if (cancelled) return;
        if (!org) {
          consumePendingOrgPublicCode();
          showToast('사업장 코드를 찾을 수 없습니다. 다시 검색해 주세요.', 'error');
          return;
        }
        consumePendingOrgPublicCode();
        setSelectedOrg(org);
        setShowChildSelector(true);
        showToast(`${org.name} 사업장 연결이 대기 중입니다`, 'info');
      } catch (err) {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : '사업장 조회에 실패했습니다', 'error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    if (addRequest < 1) return;
    setEditingChild(null);
    setContinueAfterAdd(Boolean(selectedOrg));
    setShowAddChild(true);
  }, [addRequest]);

  const handleOrgSelect = (org: OrganizationSearchResult) => {
    setSelectedOrg(org);
    setShowOrgSearch(false);
    setShowChildSelector(true);
  };

  const handleChildSelect = (child: GlobalStudent) => {
    setSelectedChild(child);
    setShowChildSelector(false);
    setShowConsent(true);
  };

  const parentPhone = portalTree?.parent?.phone?.trim() ?? '';

  const focusPhone = () => {
    showToast('연결에 쓸 연락처를 아래 계정에 먼저 저장해 주세요.', 'error');
    document.getElementById('parent-phone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const startEnrollmentRequest = () => {
    if (!parentPhone) {
      focusPhone();
      return;
    }
    setShowOrgSearch(true);
  };

  const handleConfirmRequest = async (consentFields: string[], notes?: string) => {
    if (!selectedOrg || !selectedChild) return;
    if (!parentPhone) {
      setShowConsent(false);
      focusPhone();
      return;
    }

    try {
      const result = await requestEnrollment({
        studentId: selectedChild.studentId,
        organizationId: selectedOrg.id,
        consentFields,
        notes,
      });

      showToast(`${result.organizationName}에 ${result.studentName} 연결을 요청했습니다`, 'success');
      setShowConsent(false);
      setSelectedOrg(null);
      setSelectedChild(null);
      await refreshPortalTree();
    } catch (err) {
      throw err;
    }
  };

  const handleChildSaved = async (
    message: string,
    created?: {
      studentId: string;
      displayName: string;
      birthDate: string | null;
      gender: string | null;
      school: string | null;
      grade: string | null;
      relationship: GlobalStudent['relationship'];
    }
  ) => {
    showToast(message, 'success');
    await refreshPortalTree();
    if (continueAfterAdd && selectedOrg && created?.studentId) {
      setSelectedChild({
        studentId: created.studentId,
        displayName: created.displayName,
        birthDate: created.birthDate,
        gender: created.gender,
        school: created.school,
        grade: created.grade,
        relationship: created.relationship,
        isPrimary: true,
        enrollments: [],
      });
      setShowChildSelector(false);
      setShowConsent(true);
    }
    setContinueAfterAdd(false);
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelEnrollmentRequest(requestId);
      showToast('사업장 연결 요청을 취소했습니다', 'success');
      await refreshPortalTree();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '요청 취소에 실패했습니다', 'error');
    }
  };

  const openAddChild = () => {
    setEditingChild(null);
    setContinueAfterAdd(Boolean(selectedOrg));
    setShowChildSelector(false);
    setShowAddChild(true);
  };

  return (
    <>
      {children.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-2">아직 등록된 자녀가 없습니다</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            먼저 자녀를 등록한 뒤 학원에 연결하거나,
            <br />
            학원에서 받은 QR·연결 코드로 바로 연결할 수 있습니다
          </p>
          {selectedOrg && (
            <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4">
              {selectedOrg.name} 연결이 대기 중입니다. 먼저 자녀를 등록해 주세요.
            </p>
          )}
          <button
            type="button"
            onClick={openAddChild}
            className="w-full py-2.5 mb-2 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px]"
          >
            자녀 등록하기
          </button>
          <button
            type="button"
            onClick={startEnrollmentRequest}
            className="w-full py-2.5 mb-4 border border-indigo-200 text-indigo-700 text-sm font-bold rounded-xl min-h-[44px]"
          >
            학원 연결하기
          </button>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-left">
            <p className="text-xs font-bold text-indigo-900 mb-2">학원 연결 방법</p>
            <ul className="text-xs text-indigo-700 space-y-1">
              <li>1. 학원 QR을 스캔합니다 (가장 빠름)</li>
              <li>2. 또는 사업장에서 받은 연결 코드를 입력합니다</li>
              <li>3. QR·코드가 없으면 학원 이름·공개코드로 연결 요청합니다</li>
            </ul>
          </div>
        </div>
      ) : (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">내 자녀</p>
          <button
            type="button"
            onClick={startEnrollmentRequest}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5" />
            학원 연결하기
          </button>
        </div>

        <div className="space-y-3">
          {children.map((child) => (
            <ParentChildCard
              key={child.studentId}
              child={child}
              onSelect={() => {
                if (child.enrollments.length > 0) {
                  selectStudent(child);
                  return;
                }
                if (selectedOrg) {
                  handleChildSelect(child);
                  return;
                }
                startEnrollmentRequest();
              }}
              onEdit={() => {
                setEditingChild(child);
                setContinueAfterAdd(false);
                setShowAddChild(true);
              }}
            />
          ))}
        </div>

      </div>
      )}

      {requests.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">학원 연결 요청 현황</p>
          <div className="space-y-2">
            {requests.map((request) => (
                <ParentEnrollmentStatusCard
                key={request.id}
                request={request}
                onCancel={() => void handleCancelRequest(request.id)}
              />
            ))}
          </div>
        </div>
      )}

      <ParentRequestEnrollmentModal
        isOpen={showOrgSearch}
        onClose={() => setShowOrgSearch(false)}
        onSelectOrg={handleOrgSelect}
      />

      <ParentChildSelectorModal
        isOpen={showChildSelector}
        onClose={() => setShowChildSelector(false)}
        children={children}
        onSelect={handleChildSelect}
        onRegisterChild={openAddChild}
        title="연결할 자녀 선택"
      />

      <ParentAddChildModal
        isOpen={showAddChild}
        child={editingChild}
        onClose={() => {
          setShowAddChild(false);
          setEditingChild(null);
        }}
        onSuccess={(message, created) => void handleChildSaved(message, created)}
      />

      {selectedOrg && selectedChild && (
        <ParentEnrollmentConsentModal
          isOpen={showConsent}
          onClose={() => {
            setShowConsent(false);
            setSelectedOrg(null);
            setSelectedChild(null);
          }}
          organization={selectedOrg}
          student={selectedChild}
          onConfirm={handleConfirmRequest}
        />
      )}
    </>
  );
};
