import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useStorageRefresh } from '@/hooks';
import { usePermissions } from '@/core/auth/usePermissions';
import { useModuleLabels } from '@/core/labels';
import { isSkinClinicIndustry } from '@/core/industry/industryUi';
import { ScheduleService } from '@/core/services/scheduleService';
import type { ServiceOffering } from '@/core/types/schedule';
import { EmptyState, Modal, PageHeader } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import { Dumbbell, Sparkles, Trash2 } from 'lucide-react';

const PILATES_CATEGORY: Record<ServiceOffering['category'], string> = {
  private: '개인',
  group: '그룹',
  reformer: '기구',
  other: '기타',
};

const SKIN_CATEGORY: Record<ServiceOffering['category'], string> = {
  private: '1:1',
  group: '그룹',
  reformer: '집중',
  other: '기타',
};

export const ServiceManagementView: React.FC = () => {
  const { showToast, openConfirmDialog } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const skin = isSkinClinicIndustry(industry);
  const categoryLabel = skin ? SKIN_CATEGORY : PILATES_CATEGORY;
  const serviceName = labels.service.management;
  useStorageRefresh();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOffering | null>(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState(80000);
  const [duration, setDuration] = useState(50);
  const [capacity, setCapacity] = useState(1);
  const [category, setCategory] = useState<ServiceOffering['category']>('private');
  const [careDays, setCareDays] = useState('');

  const offerings = ScheduleService.getServiceOfferings();

  const openCreate = () => {
    setEditing(null);
    setName('');
    setPrice(80000);
    setDuration(50);
    setCapacity(1);
    setCategory('private');
    setCareDays('');
    setIsModalOpen(true);
  };

  const openEdit = (o: ServiceOffering) => {
    setEditing(o);
    setName(o.name);
    setPrice(o.price);
    setDuration(o.durationMinutes);
    setCapacity(o.maxCapacity);
    setCategory(o.category);
    setCareDays(o.careIntervalDays ? String(o.careIntervalDays) : '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    ScheduleService.saveServiceOffering({
      id: editing?.id,
      name: name.trim(),
      price,
      durationMinutes: duration,
      maxCapacity: capacity,
      category,
      careIntervalDays: skin && careDays ? Number(careDays) : undefined,
      isActive: true,
      isSchedulable: true,
    });

    showToast(editing ? `${serviceName} 수정이 완료되었습니다.` : `${serviceName} 등록이 완료되었습니다.`, 'success');
    setIsModalOpen(false);
  };

  const handleDelete = (o: ServiceOffering) => {
    openConfirmDialog({
      title: `${serviceName} 삭제`,
      message: `'${o.name}' 항목을 삭제하시겠습니까?`,
      isDestructive: true,
      confirmText: '삭제',
      onConfirm: () => {
        ScheduleService.deleteServiceOffering(o.id);
        showToast('삭제되었습니다.', 'info');
      },
    });
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={skin ? <Sparkles className="w-6 h-6" /> : <Dumbbell className="w-6 h-6" />}
        iconClassName={skin ? 'text-rose-600' : 'text-purple-600'}
        title={`${serviceName} 관리`}
        description={
          skin
            ? '1:1·그룹 시술과 시간·요금을 설정합니다'
            : '개인·그룹·기구 필라테스 수업 종류와 시간·요금을 설정합니다'
        }
        actions={
          <button
            onClick={openCreate}
            className={`px-4 py-2.5 text-white text-sm font-bold rounded-xl ${
              skin ? 'bg-rose-600 hover:bg-rose-700' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            + {labels.service.singular} 추가
          </button>
        }
      />

      {offerings.length === 0 ? (
        <EmptyState
          icon={skin ? <Sparkles className="w-10 h-10" /> : <Dumbbell className="w-10 h-10" />}
          title={`등록된 ${serviceName}이 없습니다`}
          description={`예약 전 ${serviceName}을 먼저 등록해 주세요`}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {offerings.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                    {categoryLabel[o.category]}
                  </span>
                  <p className="font-bold text-slate-900 mt-2">{o.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {o.durationMinutes}분 · 정원 {o.maxCapacity}명 · {formatCurrency(o.price)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(o)} className="text-xs font-bold text-teal-600 px-2 py-1">수정</button>
                  <button onClick={() => handleDelete(o)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? `${serviceName} 수정` : `${serviceName} 등록`}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">{labels.service.singular}명 *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-xl" placeholder={skin ? '기본 관리 60분' : '개인 레슨 50분'} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">시간(분)</label>
              <input type="number" min={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full px-3 py-2 text-sm border rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">정원</label>
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="w-full px-3 py-2 text-sm border rounded-xl" />
            </div>
          </div>
          {skin && (
            <div>
              <label className="block text-xs font-semibold mb-1">권장 재방문 간격(일)</label>
              <input
                type="number"
                min={0}
                value={careDays}
                onChange={(e) => setCareDays(e.target.value)}
                placeholder="없으면 비움"
                className="w-full px-3 py-2 text-sm border rounded-xl min-h-[44px]"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">요금</label>
              <input type="number" min={0} step={1000} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full px-3 py-2 text-sm border rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">분류</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as ServiceOffering['category'])} className="w-full px-3 py-2 text-sm border rounded-xl">
                <option value="private">{categoryLabel.private}</option>
                <option value="group">{categoryLabel.group}</option>
                <option value="reformer">{categoryLabel.reformer}</option>
                <option value="other">{categoryLabel.other}</option>
              </select>
            </div>
          </div>
          <button type="submit" className={`w-full py-2.5 text-white font-bold rounded-xl text-sm ${skin ? 'bg-rose-600' : 'bg-purple-600'}`}>저장</button>
        </form>
      </Modal>
    </div>
  );
};
