import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { ClipboardCheck, Plus, CheckCircle2, AlertOctagon, TrendingUp } from 'lucide-react';
import {
  calculateQscScoreAndGrade,
  validateAuditInput,
  type SupervisionAuditRecord,
} from '../domain/franchiseSupervisionEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const FranchiseSupervisionListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [quality, setQuality] = useState(30);
  const [service, setService] = useState(30);
  const [cleanliness, setCleanliness] = useState(25);
  const [deficiencies, setDeficiencies] = useState('');
  const [deadline, setDeadline] = useState('');

  const { query } = useList<SupervisionAuditRecord>({
    resource: 'supervision_audits',
    sorters: [{ field: 'audit_date', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const audits = (query?.data?.data as SupervisionAuditRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createAudit } = useCreate();

  const preview = calculateQscScoreAndGrade(quality, service, cleanliness);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateAuditInput(storeName, supervisorName);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    createAudit(
      {
        resource: 'supervision_audits',
        values: {
          store_name: storeName.trim(),
          supervisor_name: supervisorName.trim(),
          quality_score: quality,
          service_score: service,
          cleanliness_score: cleanliness,
          total_score: preview.totalScore,
          grade: preview.grade,
          deficiencies_summary: deficiencies.trim() || undefined,
          action_required: preview.actionRequired,
          action_deadline: preview.actionRequired ? deadline || undefined : undefined,
          audit_date: new Date().toISOString().split('T')[0],
        },
      },
      {
        onSuccess: () => {
          showToast(`[${storeName}] QSC 점검 완료 (총점: ${preview.totalScore}점, 등급: ${preview.grade})`, 'success');
          setIsModalOpen(false);
          setStoreName('');
          setSupervisorName('');
          setDeficiencies('');
          setDeadline('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '점검 저장 실패', 'error');
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <ClipboardCheck className="w-7 h-7 text-teal-600" />
            가맹 본사 QSC 점검 및 정기 슈퍼바이징
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            품질(Q), 서비스(S), 위생(C) 지표에 따른 정기 현장 점검과 시정명령 조치를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 QSC 점검 등록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">점검일</th>
              <th className="p-3">가맹점/매장명</th>
              <th className="p-3">슈퍼바이저</th>
              <th className="p-3 text-center">품질(35)</th>
              <th className="p-3 text-center">서비스(35)</th>
              <th className="p-3 text-center">위생(30)</th>
              <th className="p-3 text-right">총점</th>
              <th className="p-3 text-center">판정 등급</th>
              <th className="p-3">개선 조치 여부</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : audits.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">등록된 슈퍼바이징 점검 내역이 없습니다.</td>
              </tr>
            ) : (
              audits.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 text-slate-500">{a.audit_date}</td>
                  <td className="p-3 font-semibold text-teal-700 dark:text-teal-400">{a.store_name}</td>
                  <td className="p-3">{a.supervisor_name}</td>
                  <td className="p-3 text-center">{a.quality_score}</td>
                  <td className="p-3 text-center">{a.service_score}</td>
                  <td className="p-3 text-center">{a.cleanliness_score}</td>
                  <td className="p-3 text-right font-bold text-base">{a.total_score}점</td>
                  <td className="p-3 text-center">
                    {a.grade === 'GRADE_A' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-bold">A등급 (우수)</span>
                    )}
                    {a.grade === 'GRADE_B' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 font-medium">B등급 (양호)</span>
                    )}
                    {a.grade === 'GRADE_C' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-medium">C등급 (보통)</span>
                    )}
                    {a.grade === 'GRADE_F' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-800 font-bold">F등급 (시정명령)</span>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    {a.action_required ? (
                      <span className="text-rose-600 font-semibold">
                        시정명령 발령 ({a.action_deadline || '기한미정'})
                      </span>
                    ) : (
                      <span className="text-slate-400">적합 (개선사항 없음)</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-teal-700">
              <ClipboardCheck className="w-5 h-5" />
              신규 QSC 현장 점검표 작성
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">가맹점/매장명 *</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="예: 분당정자점"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">슈퍼바이저 성명 *</label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="예: 박준영 과장"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">품질(Q) (최대 35)</label>
                  <input
                    type="number"
                    min={0}
                    max={35}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">서비스(S) (최대 35)</label>
                  <input
                    type="number"
                    min={0}
                    max={35}
                    value={service}
                    onChange={(e) => setService(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">위생(C) (최대 30)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={cleanliness}
                    onChange={(e) => setCleanliness(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-lg flex justify-between items-center text-sm font-bold text-teal-800 dark:text-teal-200">
                <span>합산 총점: {preview.totalScore}점</span>
                <span>판정 등급: {preview.grade}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">지적 사항 및 개선 요구</label>
                <textarea
                  value={deficiencies}
                  onChange={(e) => setDeficiencies(e.target.value)}
                  placeholder="예: 주방 바닥 배수구 청결 미흡 및 유니폼 명찰 미착용"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={2}
                />
              </div>

              {preview.actionRequired && (
                <div>
                  <label className="block text-xs font-semibold text-rose-600 mb-1">
                    시정 조치 완료 기한일 *
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
              )}

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
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
                >
                  점검 완료 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
