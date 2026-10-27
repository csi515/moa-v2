import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Sparkles, Plus, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import {
  evaluateWarrantyEligibility,
  validateClaimInput,
  type WarrantyClaimRecord,
  type DefectType,
  type ClaimDecision,
} from '../domain/warrantyClaimEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const WarrantyClaimListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [serviceName, setServiceName] = useState('열펌/C컬');
  const [practitionerName, setPractitionerName] = useState('이나은 실장');
  const [serviceDate, setServiceDate] = useState('2026-10-15');
  const [defectType, setDefectType] = useState<DefectType>('PERM_CURL_LOOSE');
  const [defectDesc, setDefectDesc] = useState('');

  const { query } = useList<WarrantyClaimRecord>({
    resource: 'service_warranty_claims',
    sorters: [{ field: 'claim_date', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const claims = (query?.data?.data as WarrantyClaimRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createClaim } = useCreate();
  const { mutate: updateClaim } = useUpdate();

  const today = new Date().toISOString().split('T')[0];
  const preview = evaluateWarrantyEligibility(serviceDate, today, 7);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateClaimInput(customerName, serviceName, defectDesc);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    createClaim(
      {
        resource: 'service_warranty_claims',
        values: {
          customer_name: customerName.trim(),
          original_service_name: serviceName.trim(),
          original_practitioner_name: practitionerName.trim(),
          original_service_date: serviceDate,
          claim_date: today,
          defect_type: defectType,
          defect_description: defectDesc.trim(),
          is_eligible_for_free: preview.isEligible,
          decision: preview.isEligible ? 'FREE_RETOUCH_APPROVED' : 'PAID_RETOUCH_OFFERED',
        },
      },
      {
        onSuccess: () => {
          showToast(
            `A/S 접수 완료 (${preview.isEligible ? '무상 리터치 승인' : '보증기한 초과 유상 안내'})`,
            'success'
          );
          setIsModalOpen(false);
          setCustomerName('');
          setDefectDesc('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '접수 실패', 'error');
        },
      }
    );
  };

  const handleCompleteRework = (claim: WarrantyClaimRecord) => {
    updateClaim(
      {
        resource: 'service_warranty_claims',
        id: claim.id,
        values: { rework_completed_at: new Date().toISOString() },
      },
      {
        onSuccess: () => {
          showToast(`[${claim.customer_name}] 리터치 재시술이 완료 처리되었습니다.`, 'success');
          refetch();
        },
      }
    );
  };

  const getDefectLabel = (type: DefectType) => {
    switch (type) {
      case 'PERM_CURL_LOOSE':
        return '펌/컬 조기 풀림';
      case 'COLOR_FADING':
        return '염색 얼룩/퇴색';
      case 'GEL_NAIL_LIFTING':
        return '젤네일 들뜸/탈락';
      case 'PIGMENT_DROPOUT':
        return '반영구 색소 탈락';
      case 'CUSTOM_FIT_ISSUE':
        return '맞춤 치수 오차';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Sparkles className="w-7 h-7 text-pink-600" />
            시술·서비스 하자 무상보증(A/S) 및 리터치 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            펌, 네일, 반영구 등 시술 후 무상 보증 기한(7일) 대조, 하자 접수 및 무상 리터치 슬롯을 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 하자 A/S 접수
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">접수일</th>
              <th className="p-3">고객명</th>
              <th className="p-3">원 시술명 / 담당자</th>
              <th className="p-3">시술일자</th>
              <th className="p-3">하자 유형 / 불편 사항</th>
              <th className="p-3 text-center">판정 결과</th>
              <th className="p-3 text-right">재시술 완료</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : claims.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">접수된 하자 보증 클레임이 없습니다.</td>
              </tr>
            ) : (
              claims.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 text-slate-500">{c.claim_date}</td>
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{c.customer_name}</td>
                  <td className="p-3">
                    <p className="font-medium text-pink-700 dark:text-pink-400">{c.original_service_name}</p>
                    <p className="text-xs text-slate-400">{c.original_practitioner_name}</p>
                  </td>
                  <td className="p-3 text-slate-500">{c.original_service_date}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                      {getDefectLabel(c.defect_type)}
                    </span>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs truncate">{c.defect_description}</p>
                  </td>
                  <td className="p-3 text-center">
                    {c.decision === 'FREE_RETOUCH_APPROVED' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-bold">
                        무상 리터치 승인
                      </span>
                    )}
                    {c.decision === 'PAID_RETOUCH_OFFERED' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-semibold">
                        기한초과 (유상안내)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {c.rework_completed_at ? (
                      <span className="text-xs text-slate-400 font-medium">재시술 완료됨</span>
                    ) : (
                      <button
                        onClick={() => handleCompleteRework(c)}
                        className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
                      >
                        재시술 완료
                      </button>
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
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-pink-600">
              <Sparkles className="w-5 h-5" />
              신규 시술 하자 A/S 클레임 접수
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">고객 성명 *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="예: 최수진"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">원 시술명 *</label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="예: 글램 레이어드 펌"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">담당 디자이너/시술자</label>
                  <input
                    type="text"
                    value={practitionerName}
                    onChange={(e) => setPractitionerName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">원 시술 일자 *</label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">하자 분류 *</label>
                  <select
                    value={defectType}
                    onChange={(e) => setDefectType(e.target.value as DefectType)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="PERM_CURL_LOOSE">펌/컬 조기 풀림</option>
                    <option value="COLOR_FADING">염색 얼룩/퇴색</option>
                    <option value="GEL_NAIL_LIFTING">젤네일 들뜸/탈락</option>
                    <option value="PIGMENT_DROPOUT">반영구 색소 탈락</option>
                    <option value="CUSTOM_FIT_ISSUE">맞춤 치수 오차</option>
                  </select>
                </div>
              </div>
              <div className="p-3 bg-pink-50 dark:bg-pink-950/40 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span>시술 경과 일수:</span>
                  <span className="font-bold">{preview.daysElapsed}일 경과 (보증기한: {preview.deadlineDate}까지)</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>무상 보증 판정:</span>
                  <span className={preview.isEligible ? 'text-emerald-600' : 'text-rose-600'}>
                    {preview.isEligible ? '무상 리터치 대상 (적격)' : '보증기한 경과 (유상 리터치 대상)'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">불편 사항 및 하자 상세 *</label>
                <textarea
                  value={defectDesc}
                  onChange={(e) => setDefectDesc(e.target.value)}
                  placeholder="예: 3일 차부터 좌측 모발 컬이 완전히 풀려 양쪽 밸런스가 맞지 않음."
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
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700"
                >
                  A/S 접수
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
