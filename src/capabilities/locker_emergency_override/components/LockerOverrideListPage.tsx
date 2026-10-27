import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { ShieldAlert, Plus, Lock, Users, AlertCircle } from 'lucide-react';
import {
  validateOverrideWitness,
  getOverrideReasonLabel,
  type LockerOverrideRecord,
  type OverrideReason,
} from '../domain/lockerOverrideEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const LockerOverrideListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lockerNumber, setLockerNumber] = useState('');
  const [reason, setReason] = useState<OverrideReason>('PIN_FORGOTTEN');
  const [leadStaff, setLeadStaff] = useState('');
  const [witnessStaff, setWitnessStaff] = useState('');
  const [seizedItems, setSeizedItems] = useState('');
  const [isSealed, setIsSealed] = useState(false);
  const [sealTag, setSealTag] = useState('');

  const { query } = useList<LockerOverrideRecord>({
    resource: 'locker_overrides',
    sorters: [{ field: 'opened_at', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const records = (query?.data?.data as LockerOverrideRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const witnessCheck = validateOverrideWitness(true, leadStaff, witnessStaff);
    if (!witnessCheck.isValid) {
      showToast(witnessCheck.error || '입회인 오류', 'error');
      return;
    }

    createRecord(
      {
        resource: 'locker_overrides',
        values: {
          locker_number: lockerNumber.trim(),
          reason,
          lead_staff_name: leadStaff.trim(),
          witness_staff_name: witnessStaff.trim(),
          seized_items_summary: seizedItems.trim() || undefined,
          is_bag_sealed: isSealed,
          seal_tag_number: isSealed ? sealTag.trim() : undefined,
          opened_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`사물함 [${lockerNumber}] 강제 개방 감사 기록 저장됨`, 'success');
          setIsModalOpen(false);
          setLockerNumber('');
          setLeadStaff('');
          setWitnessStaff('');
          setSeizedItems('');
          setSealTag('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '감사 기록 저장 실패', 'error');
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <ShieldAlert className="w-7 h-7 text-red-600" />
            사물함 비상 개방 입회 서약 및 감사 로그
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            분실/장기 미반납 사물함 강제 개방 시 2인 입회 기록 및 유류품 봉인 감사를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 비상 개방 기록 등록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">개방 일시</th>
              <th className="p-3">사물함 번호</th>
              <th className="p-3">개방 사유</th>
              <th className="p-3">책임자 / 입회인</th>
              <th className="p-3">수거 유류품 요약</th>
              <th className="p-3 text-center">봉인 여부</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">비상 개방 기록이 없습니다.</td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 text-slate-500">{new Date(r.opened_at).toLocaleString('ko-KR')}</td>
                  <td className="p-3 font-bold text-red-600">No. {r.locker_number}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700 font-medium border border-red-200">
                      {getOverrideReasonLabel(r.reason)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold">{r.lead_staff_name}</span> (입회: {r.witness_staff_name || '없음'})
                  </td>
                  <td className="p-3 text-slate-600 max-w-xs truncate">{r.seized_items_summary || '(소지품 없음)'}</td>
                  <td className="p-3 text-center">
                    {r.is_bag_sealed ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-semibold">
                        봉인완료 ({r.seal_tag_number})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500">미봉인</span>
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
            <h2 className="text-xl font-bold flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" />
              사물함 비상 강제 개방 감사 기록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">사물함 번호 *</label>
                  <input
                    type="text"
                    value={lockerNumber}
                    onChange={(e) => setLockerNumber(e.target.value)}
                    placeholder="예: L-102"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-red-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">개방 사유 *</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as OverrideReason)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="PIN_FORGOTTEN">비밀번호 분실</option>
                    <option value="KEY_LOST">열쇠 분실</option>
                    <option value="EXPIRED_UNCLAIMED">만료 후 미비움</option>
                    <option value="SAFETY_HAZARD">안전 위협 긴급점검</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">개방 책임자 *</label>
                  <input
                    type="text"
                    value={leadStaff}
                    onChange={(e) => setLeadStaff(e.target.value)}
                    placeholder="책임 직원명"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">입회 증인 직원 *</label>
                  <input
                    type="text"
                    value={witnessStaff}
                    onChange={(e) => setWitnessStaff(e.target.value)}
                    placeholder="입회 직원명"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">내부 소지품 및 유류품 요약</label>
                <textarea
                  value={seizedItems}
                  onChange={(e) => setSeizedItems(e.target.value)}
                  placeholder="예: 운동화 1켤레, 세면도구, 텀블러"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <input
                  type="checkbox"
                  id="sealedCheck"
                  checked={isSealed}
                  onChange={(e) => setIsSealed(e.target.checked)}
                  className="rounded text-red-600"
                />
                <label htmlFor="sealedCheck" className="text-xs font-medium cursor-pointer">
                  보관용 비닐백에 봉인 및 씰링 완료
                </label>
              </div>
              {isSealed && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">봉인 씰 태그 번호</label>
                  <input
                    type="text"
                    value={sealTag}
                    onChange={(e) => setSealTag(e.target.value)}
                    placeholder="예: SEAL-8841"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
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
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  감사 기록 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
