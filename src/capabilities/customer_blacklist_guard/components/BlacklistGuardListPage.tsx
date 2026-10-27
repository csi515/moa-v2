import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Ban, Plus, ShieldAlert, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import {
  validateBlacklistInput,
  type BlacklistRecord,
  type RestrictionSeverity,
  type IncidentReason,
} from '../domain/blacklistGuardEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

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
        onError: (err) => {
          showToast(err?.message || '출입제한 등록 실패', 'error');
        },
      }
    );
  };

  const handleToggleActive = (rec: BlacklistRecord) => {
    updateRecord(
      {
        resource: 'blacklist_records',
        id: rec.id,
        values: { is_active: !rec.is_active },
      },
      {
        onSuccess: () => {
          showToast(`출입 제한이 ${!rec.is_active ? '다시 적용' : '해제'}되었습니다.`, 'success');
          refetch();
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Ban className="w-7 h-7 text-rose-600" />
            악성 민원 및 출입제한 통제
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            폭언, 기물 파손, 상습 미납 등 규정 위반 고객에 대한 현장 예약 및 입장 차단을 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 출입 제한 대상 등록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">대상자 성명</th>
              <th className="p-3">연락처 식별값</th>
              <th className="p-3">제한 수위</th>
              <th className="p-3">제한 사유 및 경위</th>
              <th className="p-3">제한 기한</th>
              <th className="p-3">상태</th>
              <th className="p-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">등록된 출입 제한 대상자가 없습니다.</td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-semibold text-rose-600">{r.target_name}</td>
                  <td className="p-3 font-mono">{r.target_phone}</td>
                  <td className="p-3">
                    {r.severity === 'PERMANENT_EXPULSION' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-800 font-bold">영구 제명</span>
                    )}
                    {r.severity === 'TEMPORARY_SUSPENSION' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-semibold">기한부 정지</span>
                    )}
                    {r.severity === 'CAUTION_MONITORING' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">주의 관찰</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600 max-w-sm">{r.incident_summary}</td>
                  <td className="p-3 text-slate-400 text-xs">
                    {r.restricted_until ? `${r.restricted_until}까지` : '무기한'}
                  </td>
                  <td className="p-3">
                    {r.is_active ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-rose-50 text-rose-700 border border-rose-200 font-medium">차단중</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500">해제됨</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleToggleActive(r)}
                      className={`px-2.5 py-1 text-xs rounded border font-medium ${
                        r.is_active
                          ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                          : 'border-rose-300 text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      {r.is_active ? '제한 해제' : '다시 적용'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-rose-600">
              <Ban className="w-5 h-5" />
              신규 출입 제한 대상 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">성명 *</label>
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="예: 김악성"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">연락처 식별값 *</label>
                  <input
                    type="text"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="예: 010-1234-5678"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">제한 수위 *</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as RestrictionSeverity)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="PERMANENT_EXPULSION">영구 제명 (입장 금지)</option>
                    <option value="TEMPORARY_SUSPENSION">기한부 이용 정지</option>
                    <option value="CAUTION_MONITORING">주의 관찰 (경고 팝업)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">사유 분류 *</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as IncidentReason)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">정지 만료일자 *</label>
                  <input
                    type="date"
                    value={restrictedUntil}
                    onChange={(e) => setRestrictedUntil(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">발생 경위 및 증빙 요약 *</label>
                <textarea
                  value={incidentSummary}
                  onChange={(e) => setIncidentSummary(e.target.value)}
                  placeholder="예: 데스크 기물 파손 및 직원에 대한 폭언으로 경찰 출동, 즉시 퇴실 조치됨."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700"
                >
                  등록 및 차단
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
