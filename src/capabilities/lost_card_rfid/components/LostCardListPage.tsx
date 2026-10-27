import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { CreditCard, Plus, ShieldAlert, CheckCircle, RotateCcw, Ban } from 'lucide-react';
import {
  transitionCardStatus,
  validateCardUid,
  type PhysicalCardRecord,
  type CardStatus,
} from '../domain/lostCardEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

export const LostCardListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardUid, setCardUid] = useState('');
  const [cardLabel, setCardLabel] = useState('');
  const [memberName, setMemberName] = useState('');

  const { query } = useList<PhysicalCardRecord>({
    resource: 'rfid_cards',
    sorters: [{ field: 'created_at', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const cards = (query?.data?.data as PhysicalCardRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createCard } = useCreate();
  const { mutate: updateCard } = useUpdate();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCardUid(cardUid);
    if (!validation.isValid) {
      showToast(validation.error || 'UID를 확인해 주세요.', 'error');
      return;
    }

    createCard(
      {
        resource: 'rfid_cards',
        values: {
          card_uid: cardUid.trim(),
          card_label: cardLabel.trim(),
          assigned_member_name: memberName.trim() || undefined,
          status: memberName.trim() ? 'ISSUED' : 'IN_STOCK',
          reissue_fee_paid: 0,
          issued_at: memberName.trim() ? new Date().toISOString() : undefined,
          created_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast('카드가 등록되었습니다.', 'success');
          setIsModalOpen(false);
          setCardUid('');
          setCardLabel('');
          setMemberName('');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '카드 등록 실패', 'error');
        },
      }
    );
  };

  const handleAction = (card: PhysicalCardRecord, action: 'ISSUE' | 'SUSPEND' | 'REPORT_LOST' | 'REACTIVATE' | 'RETURN') => {
    const res = transitionCardStatus(card.status, action);
    if (!res.isAllowed) {
      showToast(res.error || '허용되지 않는 상태 전이입니다.', 'error');
      return;
    }

    updateCard(
      {
        resource: 'rfid_cards',
        id: card.id,
        values: {
          status: res.nextStatus,
          lost_at: action === 'REPORT_LOST' ? new Date().toISOString() : undefined,
        },
      },
      {
        onSuccess: () => {
          showToast(`카드 상태가 [${res.nextStatus}]로 변경되었습니다.`, 'success');
          refetch();
        },
        onError: (err) => {
          showToast(err?.message || '상태 변경 실패', 'error');
        },
      }
    );
  };

  const getStatusBadge = (status: CardStatus) => {
    switch (status) {
      case 'IN_STOCK':
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">미발급 재고</span>;
      case 'ISSUED':
        return <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-semibold">발급 사용중</span>;
      case 'SUSPENDED':
        return <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">일시 정지</span>;
      case 'LOST':
        return <span className="px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-800 font-bold">분실 신고</span>;
      case 'RETURNED':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">반납 완료</span>;
      case 'DISCARDED':
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-200 text-slate-600">폐기</span>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <CreditCard className="w-7 h-7 text-indigo-600" />
            RF/NFC 출입카드 및 실물 발급 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            회원용 물리 카드 UID 재고 등록, 분실 신고 처리 및 반납 수명주기를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 카드 등록
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold border-b">
            <tr>
              <th className="p-3">카드 UID</th>
              <th className="p-3">표면 라벨</th>
              <th className="p-3">배정 회원</th>
              <th className="p-3">발급 상태</th>
              <th className="p-3 text-right">관리 작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">불러오는 중...</td>
              </tr>
            ) : cards.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">등록된 실물 카드가 없습니다.</td>
              </tr>
            ) : (
              cards.map((card) => (
                <tr key={card.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-mono font-medium">{card.card_uid}</td>
                  <td className="p-3 text-slate-500">{card.card_label || '-'}</td>
                  <td className="p-3 font-semibold">{card.assigned_member_name || '(미배정)'}</td>
                  <td className="p-3">{getStatusBadge(card.status)}</td>
                  <td className="p-3 text-right space-x-1">
                    {card.status === 'ISSUED' && (
                      <>
                        <button
                          onClick={() => handleAction(card, 'REPORT_LOST')}
                          className="px-2 py-1 text-xs bg-rose-50 text-rose-600 border border-rose-200 rounded hover:bg-rose-100"
                        >
                          분실 신고
                        </button>
                        <button
                          onClick={() => handleAction(card, 'RETURN')}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
                        >
                          카드 반납
                        </button>
                      </>
                    )}
                    {card.status === 'SUSPENDED' && (
                      <button
                        onClick={() => handleAction(card, 'REACTIVATE')}
                        className="px-2 py-1 text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 rounded hover:bg-emerald-100"
                      >
                        정지 해제
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
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              신규 실물 카드 등록
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">카드 고유 UID (리더기 태그) *</label>
                <input
                  type="text"
                  value={cardUid}
                  onChange={(e) => setCardUid(e.target.value)}
                  placeholder="예: 04E1F2A3B4"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">표면 인쇄 라벨 (선택)</label>
                <input
                  type="text"
                  value={cardLabel}
                  onChange={(e) => setCardLabel(e.target.value)}
                  placeholder="예: No. 104"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">배정 회원명 (즉시 발급 시 입력)</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="비워두면 '미발급 재고'로 등록"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
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
