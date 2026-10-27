import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Shirt, Plus, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  transitionUniformStatus,
  validateAssignmentInput,
  type UniformAssignmentRecord,
  type UniformType,
} from '../domain/uniformGearEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const UniformGearListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [gearType, setGearType] = useState<UniformType>('POLO_SHIRT');
  const [sizeLabel, setSizeLabel] = useState('L');
  const [quantity, setQuantity] = useState(2);
  const [assetCode, setAssetCode] = useState('');

  const { query } = useList<UniformAssignmentRecord>({
    resource: 'uniform_assignments',
    sorters: [{ field: 'assigned_at', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const records = (query?.data?.data as UniformAssignmentRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();
  const { mutate: updateRecord } = useUpdate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateAssignmentInput(staffName, sizeLabel, quantity);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    createRecord(
      {
        resource: 'uniform_assignments',
        values: {
          staff_id: `staff-${Date.now().toString().slice(-4)}`,
          staff_name: staffName.trim(),
          gear_type: gearType,
          size_label: sizeLabel.trim(),
          asset_code: assetCode.trim() || undefined,
          quantity,
          assigned_at: new Date().toISOString(),
          status: 'ASSIGNED',
          penalty_charged: 0,
        },
      },
      {
        onSuccess: () => {
          showToast(`[${staffName}] 유니폼(${gearType} ${quantity}벌) 지급 등록 완료`, 'success');
          setIsModalOpen(false);
          setStaffName('');
          setAssetCode('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '지급 등록 실패', 'error');
        },
      }
    );
  };

  const handleStatus = (record: UniformAssignmentRecord, action: 'RETURN' | 'REPORT_LOST') => {
    const res = transitionUniformStatus(record.status, action);
    if (!res.isAllowed) {
      showToast(res.error || '작업 불가', 'error');
      return;
    }

    updateRecord(
      {
        resource: 'uniform_assignments',
        id: record.id,
        values: {
          status: res.nextStatus,
          returned_at: action === 'RETURN' ? new Date().toISOString() : undefined,
          penalty_charged: action === 'REPORT_LOST' ? 30000 : 0,
        },
      },
      {
        onSuccess: () => {
          showToast(action === 'RETURN' ? '세탁 반납 처리 완료' : '분실 변상금(30,000원) 처리 완료', 'success');
          refetch();
        },
      }
    );
  };

  const getGearLabel = (type: UniformType) => {
    switch (type) {
      case 'CHEF_COAT':
        return '조리복/가운';
      case 'APRON':
        return '앞치마';
      case 'POLO_SHIRT':
        return '유니폼 폴로티';
      case 'SAFETY_SHOES':
        return '안전화/조리화';
      case 'NAME_TAG':
        return '직원 명찰';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Shirt className="w-7 h-7 text-blue-600" />
            유니폼 및 보호구 사이즈별 지급·회수 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            직원별 유니폼/안전화 지급 일자, 사이즈 규격, 퇴사 시 세탁 반납 및 미반납 변상금을 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 유니폼 지급 등록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">지급 직원</th>
              <th className="p-3">피복/보호구 품목</th>
              <th className="p-3">사이즈</th>
              <th className="p-3 text-right">수량</th>
              <th className="p-3">지급 일시</th>
              <th className="p-3">상태</th>
              <th className="p-3 text-right">회수 처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">지급된 유니폼 내역이 없습니다.</td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{r.staff_name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 font-medium border border-blue-200">
                      {getGearLabel(r.gear_type)}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-600">{r.size_label}</td>
                  <td className="p-3 text-right font-medium">{r.quantity}벌</td>
                  <td className="p-3 text-slate-500">{new Date(r.assigned_at).toLocaleDateString('ko-KR')}</td>
                  <td className="p-3">
                    {r.status === 'ASSIGNED' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-medium">착용/보유중</span>
                    )}
                    {r.status === 'RETURNED_CLEAN' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-medium">반납 완료</span>
                    )}
                    {r.status === 'LOST_COMPENSATED' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-800 font-bold">분실 변상됨</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {r.status === 'ASSIGNED' && (
                      <>
                        <button
                          onClick={() => handleStatus(r, 'RETURN')}
                          className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 font-medium"
                        >
                          세탁 반납
                        </button>
                        <button
                          onClick={() => handleStatus(r, 'REPORT_LOST')}
                          className="px-2.5 py-1 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded hover:bg-rose-100 font-medium"
                        >
                          분실 처리
                        </button>
                      </>
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
            <h2 className="text-xl font-bold flex items-center gap-2 text-blue-600">
              <Shirt className="w-5 h-5" />
              신규 유니폼/보호구 지급 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">지급 직원 성명 *</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="예: 이코치"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">피복 종류 *</label>
                  <select
                    value={gearType}
                    onChange={(e) => setGearType(e.target.value as UniformType)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="POLO_SHIRT">유니폼 폴로티</option>
                    <option value="APRON">앞치마</option>
                    <option value="CHEF_COAT">조리복/가운</option>
                    <option value="SAFETY_SHOES">안전화/조리화</option>
                    <option value="NAME_TAG">명찰</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">사이즈 규격 *</label>
                  <input
                    type="text"
                    value={sizeLabel}
                    onChange={(e) => setSizeLabel(e.target.value)}
                    placeholder="예: M, L, XL, 260mm"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">지급 수량 *</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">식별 자산태그 (선택)</label>
                  <input
                    type="text"
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    placeholder="예: UNIFORM-042"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>
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
                  지급 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
