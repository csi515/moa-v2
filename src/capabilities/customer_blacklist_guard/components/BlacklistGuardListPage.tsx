import React, { useState, useMemo } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Ban, Plus, ShieldAlert, CheckCircle } from 'lucide-react';
import {
  validateBlacklistInput,
  type BlacklistRecord,
  type RestrictionSeverity,
  type IncidentReason,
} from '../domain/blacklistGuardEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  PageHeader,
  StandardDataTable,
  type StandardColumn,
  StatusBadge,
  FormModal,
  Button,
} from '@/shared/components';

export const BlacklistGuardListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [severity, setSeverity] = useState<RestrictionSeverity>('PERMANENT_EXPULSION');
  const [reason, setReason] = useState<IncidentReason>('VIOLENCE_VERBAL');
  const [incidentSummary, setIncidentSummary] = useState('');
  const [restrictedUntil, setRestrictedUntil] = useState('');

  const { query } = useList<BlacklistRecord>({
    resource: 'blacklist_records',
    sorters: [{ field: 'created_at', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const records = (query?.data?.data as BlacklistRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();
  const { mutate: updateRecord } = useUpdate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateBlacklistInput(targetName, targetPhone, incidentSummary);
    if (!validation.isValid) {
      showToast(validation.error || '입력 오류', 'error');
      return;
    }

    createRecord(
      {
        resource: 'blacklist_records',
        values: {
          target_name: targetName.trim(),
          target_phone: targetPhone.trim(),
          severity,
          reason,
          incident_summary: incidentSummary.trim(),
          restricted_until: severity === 'TEMPORARY_SUSPENSION' ? restrictedUntil || undefined : undefined,
          is_active: true,
          registered_by: '보안 담당자',
          created_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`[${targetName}] 출입제한 등록 완료`, 'success');
          setIsModalOpen(false);
          setTargetName('');
          setTargetPhone('');
          setIncidentSummary('');
          setRestrictedUntil('');
          refetch();
        },
        onError: (err: any) => {
          showToast(`등록 실패: ${err?.message || 'DB 에러'}`, 'error');
        },
      }
    );
  };

  const handleDeactivate = (id: string, name: string) => {
    if (!window.confirm(`[${name}] 님의 출입 제한 조치를 해제하시겠습니까?`)) return;

    updateRecord(
      {
        resource: 'blacklist_records',
        id,
        values: {
          is_active: false,
          lifted_at: new Date().toISOString(),
          lifted_by: '원장/관리자',
        },
      },
      {
        onSuccess: () => {
          showToast(`[${name}] 출입 제한 해제 완료`, 'info');
          refetch();
        },
        onError: (err: any) => {
          showToast(`해제 실패: ${err?.message}`, 'error');
        },
      }
    );
  };

  const columns: StandardColumn<BlacklistRecord>[] = useMemo(
    () => [
      {
        key: 'target_name',
        header: '대상자 성명',
        className: 'font-semibold text-rose-600',
        render: (r) => r.target_name,
      },
      {
        key: 'target_phone',
        header: '연락처 식별값',
        className: 'font-mono text-slate-700',
        render: (r) => r.target_phone,
      },
      {
        key: 'severity',
        header: '제한 수위',
        render: (r) => {
          if (r.severity === 'PERMANENT_EXPULSION') {
            return <StatusBadge status="danger" dot>영구 제명</StatusBadge>;
          }
          if (r.severity === 'TEMPORARY_SUSPENSION') {
            return <StatusBadge status="warning" dot>기한부 정지</StatusBadge>;
          }
          return <StatusBadge status="info" dot>주의 관찰</StatusBadge>;
        },
      },
      {
        key: 'incident_summary',
        header: '제한 사유 및 경위',
        className: 'text-slate-600 max-w-sm',
        render: (r) => r.incident_summary,
      },
      {
        key: 'restricted_until',
        header: '제한 기한',
        className: 'text-slate-500 font-mono text-xs',
        render: (r) => (r.restricted_until ? `${r.restricted_until}까지` : '무기한'),
      },
      {
        key: 'status',
        header: '상태',
        render: (r) =>
          r.is_active ? (
            <StatusBadge status="danger">차단중</StatusBadge>
          ) : (
            <StatusBadge status="neutral">해제됨</StatusBadge>
          ),
      },
      {
        key: 'actions',
        header: '관리',
        align: 'right',
        render: (r) => (
          <div className="flex items-center justify-end gap-1.5">
            {r.is_active ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeactivate(r.id, r.target_name)}
              >
                제한 해제
              </Button>
            ) : (
              <span className="text-xs text-slate-400">해제완료</span>
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        density="compact"
        icon={<ShieldAlert className="w-5 h-5 text-rose-600" />}
        title="고객 안전 & 출입제한 가드 (Blacklist)"
        description="상습 악성 민원, 폭언/기물파손 이력자의 출입 및 키오스크 셀프 체크인을 사전 방어합니다."
        actions={
          <Button
            variant="destructive"
            size="md"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            신규 출입 제한 대상 등록
          </Button>
        }
      />

      <StandardDataTable
        data={records}
        columns={columns}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyTitle="등록된 출입 제한 대상자가 없습니다."
        emptyDescription="안전한 사업장 환경이 유지되고 있습니다."
      />

      {isModalOpen && (
        <FormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="신규 출입 제한 대상 등록"
          description="출입 제한 대상으로 등록 시, 키오스크 셀프 출결 및 회원 가입이 사전 차단됩니다."
          onSubmit={handleCreate}
          submitLabel="등록 및 차단"
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">대상자 성명 *</label>
                <input
                  type="text"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="예: 김악성"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">연락처 식별값 *</label>
                <input
                  type="text"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">제한 수위 *</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as RestrictionSeverity)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="PERMANENT_EXPULSION">영구 제명 (입장 금지)</option>
                  <option value="TEMPORARY_SUSPENSION">기한부 이용 정지</option>
                  <option value="CAUTION_MONITORING">주의 관찰 (경고 팝업)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">사유 분류 *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as IncidentReason)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="VIOLENCE_VERBAL">폭언/욕설/폭행</option>
                  <option value="PROPERTY_DAMAGE">기물 파손</option>
                  <option value="SEXUAL_HARASSMENT">성희롱</option>
                  <option value="NON_PAYMENT">상습 미납</option>
                  <option value="OTHER">기타 규정 위반</option>
                </select>
              </div>
            </div>
            {severity === 'TEMPORARY_SUSPENSION' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">정지 만료일자 *</label>
                <input
                  type="date"
                  value={restrictedUntil}
                  onChange={(e) => setRestrictedUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">발생 경위 및 증빙 요약 *</label>
              <textarea
                value={incidentSummary}
                onChange={(e) => setIncidentSummary(e.target.value)}
                placeholder="예: 데스크 기물 파손 및 직원에 대한 폭언으로 즉시 퇴실 조치됨."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                rows={3}
                required
              />
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
};
