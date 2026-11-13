import React, { useState, useEffect } from 'react';
import { StorageService } from '@/services/storage';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import type { Consultation, ConsultationType } from '../types';
import { Modal } from '@/shared/components/ui/Modal';
import { useTerminology } from '@/core/terminology';
import { useConfirmDialog } from '@/shared/feedback/useConfirmDialog';
import { MessageSquareText, Calendar, User, Save, X, Phone, Tag, UserPlus } from 'lucide-react';
import { mapConsultationToStudentDraft } from '../utils/consultationStudentMapper';

export interface ConsultationRecordInitialData {
  id?: string;
  studentId?: string;
  studentName?: string;
  parentName?: string;
  phone?: string;
  date?: string;
  type?: ConsultationType;
  content?: string;
  result?: string;
  nextDate?: string;
  notes?: string;
}

export interface ConsultationRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (saved: Consultation) => void;
  onPromoteToStudent?: (draft: any) => void;
  initialData?: ConsultationRecordInitialData | null;
  readOnly?: boolean;
}

const RESULT_PRESETS = [
  '회원 등록 완료',
  '체험 수업 후 결정',
  '시간표 조율 중',
  '상담 완료 (보류)',
  '재상담 예정',
  '취소/미등록',
];

const CONTENT_PLACEHOLDER = `예:
• 피아노 학습 경험: 바이엘 2권까지 배웠으나 1년 공백 있음
• 희망 요일 및 시간: 화/목 15:30~16:20 선호
• 학습 목표: 기초 손모양 교정 및 소나티네 진입 희망
• 특이사항: 차분한 성향, 칭찬 위주 피드백에 반응 좋음`;

export const ConsultationRecordModal: React.FC<ConsultationRecordModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onPromoteToStudent,
  initialData,
  readOnly = false,
}) => {
  const { showToast, currentUser } = useApp();

  const [date, setDate] = useState<string>('');
  const [type, setType] = useState<ConsultationType>('parent');
  const [content, setContent] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { labels } = useTerminology();
  const customerWord = labels.customer.singular;
  const confirm = useConfirmDialog();

  const isDirty = !readOnly && (
    content.trim() !== (initialData?.content || '').trim() ||
    result.trim() !== (initialData?.result || '').trim() ||
    date !== (initialData?.date || '')
  );

  const confirmClose = async (proceed: () => void) => {
    const ok = await confirm({
      title: '상담 일지 작성 취소',
      message: '작성 중인 상담 내용이 저장되지 않았습니다. 창을 닫으시겠습니까?',
      confirmText: '작성 취소하고 닫기',
      cancelText: '계속 작성',
      isDestructive: true,
    });
    if (ok) proceed();
  };
  const [nextDate, setNextDate] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [parentName, setParentName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDate(initialData?.date || new Date().toISOString().slice(0, 10));
      setType(initialData?.type || 'parent');
      setContent(initialData?.content || initialData?.notes || '');
      setResult(initialData?.result || '상담 완료');
      setNextDate(initialData?.nextDate || '');
      setStudentName(initialData?.studentName || initialData?.parentName || '신청자');
      setParentName(initialData?.parentName || '');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!content.trim()) {
      showToast('상담 내용을 입력해주세요.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const counselor = currentUser;
      const saved = StorageService.saveConsultation({
        id: initialData?.id,
        studentId: initialData?.studentId || 'lead_' + Date.now(),
        studentName: studentName.trim() || '신청자',
        parentName: parentName.trim() || '학부모',
        date: date || new Date().toISOString().slice(0, 10),
        type,
        content: content.trim(),
        result: result.trim(),
        nextDate: nextDate || undefined,
        counselorId: counselor?.id || '',
        counselorName: counselor?.name || currentUser.name || '원장',
      });

      showToast('상담 기록이 저장되었습니다.', 'success');
      onSaved?.(saved);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.id ? '상담 기록 조회 및 수정' : '상담 기록 작성'}
      description={`${studentName}님의 상담 일지를 기록하고 결과를 관리합니다.`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* 기본 인적 정보 요약 */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            <span className="text-slate-500 font-medium">상담 대상:</span>
            <strong className="text-slate-800 text-sm">{studentName}</strong>
            {parentName && parentName !== studentName && (
              <span className="text-slate-500">({parentName})</span>
            )}
          </div>
          {initialData?.phone && (
            <div className="flex items-center gap-1.5 text-slate-600 font-mono">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{initialData.phone}</span>
            </div>
          )}
        </div>

        {/* 상담 일자 및 유형 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              상담 일자 <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              disabled={readOnly}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">상담 유형</label>
            <select
              disabled={readOnly}
              value={type}
              onChange={(e) => setType(e.target.value as ConsultationType)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none min-h-[44px] font-bold"
            >
              <option value="parent">학부모 상담 (신규/정기)</option>
              <option value="student">고객 상담 (체험/레벨)</option>
              <option value="career">진로/입시/콩쿠르 상담</option>
              <option value="learning">학습/진도/시간표 조율</option>
            </select>
          </div>
        </div>

        {/* 상담 내용 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            상담 내용 및 특이사항 <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            disabled={readOnly}
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={CONTENT_PLACEHOLDER}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none leading-relaxed"
          />
        </div>

        {/* 상담 결과 및 빠른 선택 프리셋 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">상담 결과 및 후속 조치</label>
            <span className="text-[11px] text-slate-400">자주 쓰는 결과 원클릭 선택</span>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {RESULT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setResult(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    result === preset
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            disabled={readOnly}
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="상담 결과나 다음 액션을 입력하세요 (예: 회원 등록 완료, 월 10만원 이용권 안내)"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none min-h-[44px]"
          />
        </div>

        {/* 다음 상담 / 연락 예정일 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            다음 연락/상담 예정일 (선택)
          </label>
          <input
            type="date"
            disabled={readOnly}
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            className="w-full sm:w-1/2 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none min-h-[44px]"
          />
        </div>

        {/* 모달 하단 버튼 */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div>
            {onPromoteToStudent && (
              <button
                type="button"
                onClick={() => {
                  onPromoteToStudent(
                    mapConsultationToStudentDraft({
                      consultationId: initialData?.id,
                      studentName,
                      parentName,
                      phone: initialData?.phone,
                      content,
                      notes: initialData?.notes,
                    })
                  );
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>{customerWord}으로 정식 등록하기</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer min-h-[44px]"
            >
              {readOnly ? '닫기' : '취소'}
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? '저장 중…' : '상담 기록 저장'}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
