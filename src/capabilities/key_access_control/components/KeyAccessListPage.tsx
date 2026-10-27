import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { KeyRound, Plus, Lock, CheckCircle, ShieldAlert, RotateCw } from 'lucide-react';
import {
  checkPinRotationNeeded,
  checkoutKey,
  returnKey,
  type AccessKeyRecord,
  type KeyType,
} from '../domain/keyAccessEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const KeyAccessListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [keyType, setKeyType] = useState<KeyType>('PHYSICAL_KEY');
  const [location, setLocation] = useState('본관 2층');
  const [rotationDays, setRotationDays] = useState(90);

  // 대여 모달 상태
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<AccessKeyRecord | null>(null);
  const [borrowerName, setBorrowerName] = useState('');
  const [purpose, setPurpose] = useState('');

  const { query } = useList<AccessKeyRecord>({
    resource: 'access_keys',
    sorters: [{ field: 'name', order: 'asc' }],
    pagination: { pageSize: 20 },
  });

  const keys = (query?.data?.data as AccessKeyRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createKey } = useCreate();
  const { mutate: updateKey } = useUpdate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('열쇠/도어락 식별명을 입력해 주세요.', 'error');
      return;
    }

    createKey(
      {
        resource: 'access_keys',
        values: {
          name: name.trim(),
          key_type: keyType,
          location: location.trim(),
          current_state: 'AVAILABLE',
          last_pin_changed_at: keyType === 'DIGITAL_DOORLOCK' ? new Date().toISOString() : undefined,
          pin_rotation_days: rotationDays,
        },
      },
      {
        onSuccess: () => {
          showToast(`[${name}] 열쇠 대장에 등록되었습니다.`, 'success');
          setIsModalOpen(false);
          setName('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '등록 실패', 'error');
        },
      }
    );
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKey) return;
    const res = checkoutKey(selectedKey.current_state, borrowerName, purpose);
    if (!res.isAllowed) {
      showToast(res.error || '대여 불가', 'error');
      return;
    }

    updateKey(
      {
        resource: 'access_keys',
        id: selectedKey.id,
        values: {
          current_state: 'CHECKED_OUT',
          borrower_name: borrowerName.trim(),
          borrow_purpose: purpose.trim(),
          borrowed_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`[${selectedKey.name}] ${borrowerName}님께 불출 완료`, 'success');
          setBorrowModalOpen(false);
          setSelectedKey(null);
          setBorrowerName('');
          setPurpose('');
          refetch();
        },
      }
    );
  };

  const handleReturn = (keyRecord: AccessKeyRecord) => {
    const res = returnKey(keyRecord.current_state);
    if (!res.isAllowed) {
      showToast(res.error || '반납 불가', 'error');
      return;
    }

    updateKey(
      {
        resource: 'access_keys',
        id: keyRecord.id,
        values: {
          current_state: 'AVAILABLE',
          borrower_name: null,
          borrow_purpose: null,
          borrowed_at: null,
        },
      },
      {
        onSuccess: () => {
          showToast(`[${keyRecord.name}] 반납 처리 완료`, 'success');
          refetch();
        },
      }
    );
  };

  const handleRotatePin = (keyRecord: AccessKeyRecord) => {
    updateKey(
      {
        resource: 'access_keys',
        id: keyRecord.id,
        values: {
          last_pin_changed_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`[${keyRecord.name}] 도어락 비밀번호 변경 이력이 갱신되었습니다.`, 'success');
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
            <KeyRound className="w-7 h-7 text-amber-600" />
            물리 열쇠 대여 및 도어락 비밀번호 교체 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            마스터키/창고 열쇠 불출·반납 현황과 디지털 도어락 비밀번호 정기 교체 주기를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 열쇠/도어락 등록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">식별 명칭</th>
              <th className="p-3">종류</th>
              <th className="p-3">보관 위치</th>
              <th className="p-3">현재 상태</th>
              <th className="p-3">대여자 / 용도</th>
              <th className="p-3">PIN 교체 주기</th>
              <th className="p-3 text-right">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">등록된 열쇠/도어락이 없습니다.</td>
              </tr>
            ) : (
              keys.map((k) => {
                const pinCheck =
                  k.key_type === 'DIGITAL_DOORLOCK'
                    ? checkPinRotationNeeded(k.last_pin_changed_at, k.pin_rotation_days)
                    : null;
                return (
                  <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-semibold text-amber-700 dark:text-amber-400">{k.name}</td>
                    <td className="p-3 text-xs">
                      {k.key_type === 'PHYSICAL_KEY' ? '물리 열쇠' : '디지털 도어락'}
                    </td>
                    <td className="p-3 text-slate-500">{k.location}</td>
                    <td className="p-3">
                      {k.current_state === 'AVAILABLE' ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-medium">보관중 (대여가능)</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-800 font-semibold">대여 불출중</span>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {k.borrower_name ? (
                        <span>
                          <strong>{k.borrower_name}</strong> ({k.borrow_purpose || '용도미기재'})
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {pinCheck ? (
                        pinCheck.needsRotation ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> 교체 요망 ({pinCheck.daysElapsed}일 경과)
                          </span>
                        ) : (
                          <span className="text-slate-400">안전 ({pinCheck.daysElapsed}일 경과)</span>
                        )
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      {k.key_type === 'PHYSICAL_KEY' && k.current_state === 'AVAILABLE' && (
                        <button
                          onClick={() => {
                            setSelectedKey(k);
                            setBorrowModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 font-medium"
                        >
                          대여 불출
                        </button>
                      )}
                      {k.key_type === 'PHYSICAL_KEY' && k.current_state === 'CHECKED_OUT' && (
                        <button
                          onClick={() => handleReturn(k)}
                          className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium"
                        >
                          반납 확인
                        </button>
                      )}
                      {k.key_type === 'DIGITAL_DOORLOCK' && (
                        <button
                          onClick={() => handleRotatePin(k)}
                          className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-medium inline-flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" /> 비번 변경 완료
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 대여 모달 */}
      {borrowModalOpen && selectedKey && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-amber-700">
              <KeyRound className="w-5 h-5" />
              [{selectedKey.name}] 대여 불출 기록
            </h2>
            <form onSubmit={handleCheckout} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">대여자 성명 *</label>
                <input
                  type="text"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  placeholder="예: 최강사"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">사용 목적 *</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="예: 주말 연습실 청소 및 장비 세팅"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBorrowModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                >
                  불출 확인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-amber-700">
              <KeyRound className="w-5 h-5" />
              신규 열쇠/도어락 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">식별 명칭 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 3번 레슨룸 도어락, 지하 창고 마스터키"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">구분 *</label>
                  <select
                    value={keyType}
                    onChange={(e) => setKeyType(e.target.value as KeyType)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="PHYSICAL_KEY">물리 열쇠</option>
                    <option value="DIGITAL_DOORLOCK">디지털 도어락 PIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">보관/설치 위치</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              {keyType === 'DIGITAL_DOORLOCK' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">비밀번호 교체 권장 주기(일)</label>
                  <input
                    type="number"
                    value={rotationDays}
                    onChange={(e) => setRotationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
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
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
