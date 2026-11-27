import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import { Box, Plus, TrendingDown, Users, CheckCircle } from 'lucide-react';
import {
  computeDispenseCost,
  validateDispenseInput,
  type ConsumableDispenseRecord,
} from '../domain/consumableDispenserEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import { StandardDataTable, type StandardColumn } from '@/shared/components/ui/StandardDataTable';
import { Modal } from '@/shared/components/ui/Modal';

export const ConsumableDispenserListPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemName, setItemName] = useState('복사용지 A4 (Box)');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(25000);
  const [department, setDepartment] = useState('교무기획팀');
  const [staffName, setStaffName] = useState('');

  const { query } = useList<ConsumableDispenseRecord>({
    resource: 'consumable_dispenses',
    sorters: [{ field: 'dispensed_at', order: 'desc' }],
    pagination: { pageSize: 20 },
  });

  const records = (query?.data?.data as ConsumableDispenseRecord[]) || [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createRecord } = useCreate();

  const totalCost = computeDispenseCost(unitCost, quantity);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateDispenseInput(itemName, quantity, department, staffName);
    if (!val.isValid) {
      showToast(val.error || '입력 오류', 'error');
      return;
    }

    createRecord(
      {
        resource: 'consumable_dispenses',
        values: {
          item_id: 'item-auto',
          item_name: itemName.trim(),
          quantity,
          unit_cost: unitCost,
          total_cost: totalCost,
          department: department.trim(),
          staff_name: staffName.trim(),
          dispensed_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          showToast(`[${itemName} x ${quantity}] 불출 등록 완료 (${department})`, 'success');
          setIsModalOpen(false);
          setStaffName('');
          refetch();
        },
        onError: (err) => {
          showToast.error(err, '불출 등록 실패');
        },
      }
    );
  };

  const columns: StandardColumn<ConsumableDispenseRecord>[] = [
    {
      key: 'dispensed_at',
      header: '불출 일시',
      render: (r) => <span className="text-xs font-mono text-slate-500">{new Date(r.dispensed_at).toLocaleString('ko-KR')}</span>,
    },
    {
      key: 'item_name',
      header: '품목명',
      render: (r) => <span className="font-semibold text-orange-700 dark:text-orange-400">{r.item_name}</span>,
    },
    {
      key: 'quantity',
      header: '수량',
      align: 'right',
      render: (r) => <span className="font-bold tabular-nums font-mono">{r.quantity}</span>,
    },
    {
      key: 'unit_cost',
      header: '단가',
      align: 'right',
      render: (r) => <span className="text-slate-500 tabular-nums font-mono">{r.unit_cost.toLocaleString()}원</span>,
    },
    {
      key: 'total_cost',
      header: '배부 금액',
      align: 'right',
      render: (r) => <span className="font-bold tabular-nums font-mono text-slate-800 dark:text-slate-100">{r.total_cost.toLocaleString()}원</span>,
    },
    {
      key: 'department',
      header: '비용 귀속 부서',
      render: (r) => (
        <span className="px-2 py-0.5 rounded text-xs bg-orange-50 text-orange-800 font-medium border border-orange-200">
          {r.department}
        </span>
      ),
    },
    {
      key: 'staff_name',
      header: '불출 직원',
      render: (r) => <span className="font-medium text-slate-900">{r.staff_name}</span>,
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Box className="w-7 h-7 text-orange-600" />
            사내 소모품 자율 불출 및 부서별 비용 배부
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            A4용지, 음료 캡슐, 테이핑, 타월 등 직원 자율 불출 기록과 부서별 예산 소진을 추적합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          신규 소모품 불출 기록
        </button>
      </div>

      <StandardDataTable
        data={records}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="등록된 소모품 불출 이력이 없습니다"
        emptyDescription="신규 소모품 불출 버튼을 눌러 첫 불출 내역을 등록하세요."
        keyExtractor={(r) => r.id}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="사내 소모품 불출 등록"
        maxWidth="md"
      >
        <div className="p-1">
          <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">소모품 품목명 *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="예: 복사용지 A4, 네스프레소 캡슐"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">불출 수량 *</label>
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">단위 단가(원)</label>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg flex justify-between text-xs font-bold text-orange-800 dark:text-orange-200">
                <span>총 소모 비용:</span>
                <span>{totalCost.toLocaleString()}원</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">비용 귀속 부서 *</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="예: 초등영어부"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">불출 직원 성명 *</label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="예: 정선생"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
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
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                >
                  불출 등록
                </button>
              </div>
            </form>
        </div>
      </Modal>
    </div>
  );
};
