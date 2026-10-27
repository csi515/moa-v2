import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { Lock, Plus, ShieldAlert, Eye, Search, FileText } from 'lucide-react';
import {
  maskSensitiveData,
  validateAuditReason,
  type PrivacyAuditLogRecord,
  type AccessPurpose,
} from '../domain/privacyAuditEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const PrivacyAuditListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accessorName, setAccessorName] = useState('인사담당자');
  const [subjectName, setSubjectName] = useState('');
  const [targetField, setTargetField] = useState('주민등록번호');
  const [purpose, setPurpose] = useState<AccessPurpose>('TAX_WITHHOLDING');
  const [purposeDetail, setPurposeDetail] = useState('');

  const { query } = useList<PrivacyAuditLogRecord>({
    resource: 'privacy_audit_logs',
    sorters: [{ field: 'accessed_at', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const logs = (query?.data?.data as PrivacyAuditLogRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createLog } = useCreate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateAuditReason(true, purpose, purposeDetail);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    createLog(
      {
        resource: 'privacy_audit_logs',
        values: {
          accessor_id: 'staff-current',
          accessor_name: accessorName.trim(),
          subject_member_id: 'mem-target',
          subject_member_name: subjectName.trim(),
          target_field: targetField,
          purpose,
          purpose_detail: purposeDetail.trim(),
          accessed_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`[${subjectName}] 민감정보 열람 감사 로그가 기록되었습니다.`, 'success');
          setIsModalOpen(false);
          setSubjectName('');
          setPurposeDetail('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '열람 감사 기록 저장 실패', 'error');
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Lock className="w-7 h-7 text-blue-600" />
            개인정보 열람 감사 로그 및 파기 관리 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            주민등록번호, 계좌번호 등 민감 개인정보 열람 사유 및 이력을 실시간 감사 로깅합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          민감정보 열람 품의 기록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">열람 일시</th>
              <th className="p-3">열람 직원</th>
              <th className="p-3">대상 회원</th>
              <th className="p-3">열람 항목</th>
              <th className="p-3">열람 목적</th>
              <th className="p-3">상세 사유</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">열람 감사 이력이 없습니다.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 text-slate-500">{new Date(log.accessed_at).toLocaleString('ko-KR')}</td>
                  <td className="p-3 font-medium">{log.accessor_name}</td>
                  <td className="p-3 font-semibold text-blue-600">{log.subject_member_name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-mono font-medium">
                      {log.target_field}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 font-medium border border-blue-200">
                      {log.purpose}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 max-w-sm truncate">{log.purpose_detail || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-blue-600">
              <Lock className="w-5 h-5" />
              민감 개인정보 열람 사유 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">열람 직원 성명 *</label>
                <input
                  type="text"
                  value={accessorName}
                  onChange={(e) => setAccessorName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">대상 회원명 *</label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="예: 이영희"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">열람 대상 항목 *</label>
                  <select
                    value={targetField}
                    onChange={(e) => setTargetField(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="주민등록번호">주민등록번호</option>
                    <option value="환불계좌번호">환불계좌번호</option>
                    <option value="민감병력/문진표">민감병력/문진표</option>
                    <option value="외국인등록번호">외국인등록번호</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">법정 열람 목적 *</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as AccessPurpose)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="TAX_WITHHOLDING">원천징수 및 세무 증빙 제출</option>
                  <option value="LEGAL_DISPUTE">법적 분쟁 소명 및 수사 협조</option>
                  <option value="INSURANCE_CLAIM">시설 안전사고 보험 청구</option>
                  <option value="CONSULTATION_SERVICE">회원 본인 요청 확인</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">구체적 열람 사유 (5자 이상) *</label>
                <textarea
                  value={purposeDetail}
                  onChange={(e) => setPurposeDetail(e.target.value)}
                  placeholder="예: 2026년 상반기 원천징수영수증 발급을 위한 주민번호 마스킹 해제 확인"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  사유 등록 및 열람
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
