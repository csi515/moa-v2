import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, Check } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { PrivacyContent, TermsContent } from './legalContent';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
  onAgree?: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
  onAgree,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const handleAgreeAndClose = () => {
    if (onAgree) {
      onAgree();
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="약관 및 정책 안내"
      maxWidth="2xl"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            {activeTab === 'terms' ? '서비스 이용을 위한 필수 약관입니다.' : '개인정보 보호법에 따른 처리방침입니다.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            >
              닫기
            </button>
            {onAgree && (
              <button
                type="button"
                onClick={handleAgreeAndClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                확인 및 동의
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col -mx-6 -mt-6">
        <div className="flex gap-2 border-b border-slate-200 bg-slate-50/80 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'terms'
                ? 'border-slate-900 text-slate-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            서비스 이용약관
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'privacy'
                ? 'border-slate-900 text-slate-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            개인정보처리방침
          </button>
        </div>

        <div className="p-6 space-y-4 text-slate-700 max-h-[60vh] overflow-y-auto overscroll-contain">
          {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>
      </div>
    </Modal>
  );
};
