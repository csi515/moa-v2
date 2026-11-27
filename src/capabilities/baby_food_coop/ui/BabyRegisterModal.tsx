import React, { useState } from 'react';
import { Baby } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { useAsyncLock } from '@/shared/hooks/useAsyncLock';
import { BABY_FOOD_COOP_COPY } from './babyFoodCoopCopy';
import type { BabyProfile } from './BabyProfileCard';

export type BabyRegisterModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (baby: Omit<BabyProfile, 'id'>) => void | Promise<void>;
};

export function BabyRegisterModal({ open, onClose, onSubmit }: BabyRegisterModalProps) {
  const [newName, setNewName] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newGuardianName, setNewGuardianName] = useState('');
  const [newAllergiesInput, setNewAllergiesInput] = useState('');
  const [newTagsInput, setNewTagsInput] = useState('');
  const { isLocked, runWithLock: withLock } = useAsyncLock();

  const reset = () => {
    setNewName('');
    setNewBirthDate('');
    setNewGuardianName('');
    setNewAllergiesInput('');
    setNewTagsInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newBirthDate) return;

    await withLock(async () => {
      const allergyList = newAllergiesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const tagList = newTagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await onSubmit({
        name: newName.trim(),
        birthDate: newBirthDate,
        guardianName: newGuardianName.trim() || undefined,
        crm_tags: [...tagList, ...allergyList],
        allergies: allergyList,
      });
      reset();
      onClose();
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={BABY_FOOD_COOP_COPY.registerModalTitle}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">아기 이름 *</label>
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="예: 이로운"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">출생일 *</label>
          <input
            type="date"
            required
            value={newBirthDate}
            onChange={(e) => setNewBirthDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">보호자명</label>
          <input
            type="text"
            value={newGuardianName}
            onChange={(e) => setNewGuardianName(e.target.value)}
            placeholder="예: 김보호"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-rose-700">알레르기 (쉼표로 구분)</label>
          <input
            type="text"
            value={newAllergiesInput}
            onChange={(e) => setNewAllergiesInput(e.target.value)}
            placeholder="예: 계란알레르기, 우유알레르기"
            className="w-full rounded-lg border border-rose-300 bg-rose-50/30 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">태그 (쉼표로 구분)</label>
          <input
            type="text"
            value={newTagsInput}
            onChange={(e) => setNewTagsInput(e.target.value)}
            placeholder="예: 중기이유식, 소고기선호"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={isLocked}>
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={isLocked}>
            {isLocked ? '등록 중...' : '등록 완료'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
