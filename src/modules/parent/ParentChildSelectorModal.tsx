import React from 'react';
import { User, ChevronRight } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import type { GlobalStudent } from '@/core/parent/types/globalParent';
import { GUARDIAN_RELATIONSHIP_LABELS } from '@/core/parent/types';

interface ParentChildSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: GlobalStudent[];
  onSelect: (child: GlobalStudent) => void;
  onRegisterChild?: () => void;
  title?: string;
}

export const ParentChildSelectorModal: React.FC<ParentChildSelectorModalProps> = ({
  isOpen,
  onClose,
  children: childList,
  onSelect,
  onRegisterChild,
  title = '자녀 선택',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        onRegisterChild ? (
          <button
            type="button"
            onClick={onRegisterChild}
            className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl min-h-[44px] hover:bg-slate-800 transition-colors"
          >
            {childList.length === 0 ? '내 자녀 등록' : '자녀 추가'}
          </button>
        ) : undefined
      }
    >
      {childList.length === 0 ? (
        <div className="py-8 text-center">
          <User className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">등록된 자녀가 없습니다. 먼저 자녀를 등록해 주세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {childList.map((child) => (
            <button
              key={child.studentId}
              type="button"
              onClick={() => onSelect(child)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50/40 transition-colors text-left min-h-[44px]"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{child.displayName}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>{GUARDIAN_RELATIONSHIP_LABELS[child.relationship]}</span>
                  {child.birthDate && (
                    <>
                      <span>·</span>
                      <span>{child.birthDate}</span>
                    </>
                  )}
                  {child.isPrimary && (
                    <>
                      <span>·</span>
                      <span className="text-slate-800 font-bold">대표</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};
