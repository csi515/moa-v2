import React, { useState } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import { Briefcase, Plus, CheckCircle, Search } from 'lucide-react';
import {
  validateTagAvailability,
  claimBaggage,
  getBaggageTypeLabel,
  type BaggageClaimRecord,
  type BaggageType,
} from '../domain/coatroomEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import { StandardDataTable, type StandardColumn } from '@/shared/components/ui/StandardDataTable';
import { Modal } from '@/shared/components/ui/Modal';

export const CoatroomListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tagNumber, setTagNumber] = useState(1);
  const [baggageType, setBaggageType] = useState<BaggageType>('COAT');
  const [ownerName, setOwnerName] = useState('');
  const [description, setDescription] = useState('');

  const { query } = useList<BaggageClaimRecord>({
    resource: 'coatroom_claims',
    sorters: [{ field: 'checked_in_at', order: 'desc' }],
    pagination: { pageSize: 30 },
  });

  const claims = (query?.data?.data as BaggageClaimRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createClaim } = useCreate();
  const { mutate: updateClaim } = useUpdate();

  const activeTags = claims
    .filter((c) => c.status === 'CHECKED_IN')
    .map((c) => c.tag_number);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const tagCheck = validateTagAvailability(tagNumber, activeTags, 100);
    if (!tagCheck.isAvailable) {
      showToast(tagCheck.error || '태그 번호 오류', 'error');
      return;
    }

    createClaim(
      {
        resource: 'coatroom_claims',
        values: {
          claim_number: `C-${Date.now().toString().slice(-4)}`,
          tag_number: tagNumber,
          baggage_type: baggageType,
          owner_name: ownerName.trim() || undefined,
          description: description.trim() || undefined,
          status: 'CHECKED_IN',
          checked_in_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`태그 [${tagNumber}번] 보관 접수 완료`, 'success');
          setIsModalOpen(false);
          setDescription('');
          setOwnerName('');
          refetch();
        },
        onError: (err) => {
          showToast.error(err, '보관 접수 실패');
        },
      }
    );
  };

  const handleClaim = (record: BaggageClaimRecord) => {
    const res = claimBaggage(record.status);
    if (!res.isAllowed) {
      showToast(res.error || '회수 불가', 'error');
      return;
    }

    updateClaim(
      {
        resource: 'coatroom_claims',
        id: record.id,
        values: {
          status: 'CLAIMED',
          claimed_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`[태그 ${record.tag_number}번] 물품 회수 완료`, 'success');
          refetch();
        },
      }
    );
  };

  const columns: StandardColumn<BaggageClaimRecord>[] = [
    {
      key: 'tag_number',
      header: '태그 번호',
      render: (c) => <span className="font-bold text-slate-800">No. {c.tag_number}</span>,
    },
    {
      key: 'baggage_type',
      header: '보관 분류',
      render: (c) => (
        <span className="px-2 py-0.5 rounded text-xs bg-slate-50 text-slate-700 font-medium border border-slate-200">
          {getBaggageTypeLabel(c.baggage_type)}
        </span>
      ),
    },
    {
      key: 'owner_name',
      header: '고객명',
      render: (c) => <span className="font-medium text-slate-900">{c.owner_name || '(미기재)'}</span>,
    },
    {
      key: 'description',
      header: '물품 설명',
      render: (c) => <span className="text-slate-500">{c.description || '-'}</span>,
    },
    {
      key: 'checked_in_at',
      header: '보관 일시',
      render: (c) => <span className="text-xs font-mono text-slate-400">{new Date(c.checked_in_at).toLocaleTimeString('ko-KR')}</span>,
    },
    {
      key: 'status',
      header: '상태',
      render: (c) => (
        <>
          {c.status === 'CHECKED_IN' ? (
            <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-medium">보관중</span>
          ) : (
            <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">회수 완료</span>
          )}
        </>
      ),
    },
    {
      key: 'actions',
      header: '회수 처리',
      align: 'right',
      render: (c) => (
        <>
          {c.status === 'CHECKED_IN' && (
            <button
              onClick={() => handleClaim(c)}
              className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium cursor-pointer"
            >
              고객 인도 완료
            </button>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Briefcase className="w-7 h-7 text-slate-800" />
            외투 및 단기 수하물 보관 번호표 대장
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            행거 번호표 및 캐리어/수하물 보관 접수와 회수 상태를 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 물품 보관 접수
        </button>
      </div>

      <StandardDataTable
        data={claims}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="현재 보관 중인 물품이 없습니다"
        emptyDescription="신규 물품 보관 접수 버튼을 눌러 첫 외투나 가방을 보관 등록하세요."
        keyExtractor={(c) => c.id}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="외투 및 수하물 보관 접수"
        maxWidth="md"
      >
        <div className="p-1">
          <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">행거/태그 번호 *</label>
                  <input
                    type="number"
                    value={tagNumber}
                    onChange={(e) => setTagNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">보관 품목 분류 *</label>
                  <select
                    value={baggageType}
                    onChange={(e) => setBaggageType(e.target.value as BaggageType)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="COAT">외투/의류</option>
                    <option value="LUGGAGE">캐리어/가방</option>
                    <option value="STROLLER">유모차</option>
                    <option value="INSTRUMENT">악기/장비</option>
                    <option value="OTHER">기타</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">고객명 (선택)</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="예: 김민준"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">물품 특징 / 브랜드 (선택)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: 검정색 롱패딩, 리모와 은색 캐리어"
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
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                >
                  접수 완료
                </button>
              </div>
            </form>
        </div>
      </Modal>
    </div>
  );
};
