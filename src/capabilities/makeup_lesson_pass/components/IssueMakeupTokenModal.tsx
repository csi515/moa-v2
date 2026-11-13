import React, { useState, useEffect } from 'react';
import { CheckCircle, Copy, Check, Ticket, Calendar } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import {
  assembleMakeupTokenIssueNotice,
  type MakeupToken,
} from '../domain/makeupLessonEngine';
import { issueAndSaveMakeupToken } from '../infrastructure/makeupLessonStorage';

export interface IssueMakeupTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    name: string;
  } | null;
  originDate: string; // YYYY-MM-DD
  academyName?: string;
  onIssued?: (token: MakeupToken) => void;
}

export const IssueMakeupTokenModal: React.FC<IssueMakeupTokenModalProps> = ({
  isOpen,
  onClose,
  student,
  originDate,
  academyName = '학원',
  onIssued,
}) => {
  const [originReason, setOriginReason] = useState<'advance_request' | 'absence' | 'instructor_cancel'>('advance_request');
  const [validityDays, setValidityDays] = useState<number>(30);
  const [issuedToken, setIssuedToken] = useState<MakeupToken | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // 모달이 열릴 때마다 초기화
  useEffect(() => {
    if (isOpen) {
      setOriginReason('advance_request');
      setValidityDays(30);
      setIssuedToken(null);
      setIsSubmitting(false);
      setCopied(false);
    }
  }, [isOpen]);

  if (!student) return null;

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = issueAndSaveMakeupToken({
        studentId: student.id,
        studentName: student.name,
        originReason,
        originDate,
        validityDays,
      });
      setIssuedToken(token);
      onIssued?.(token);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyNotice = () => {
    if (!issuedToken) return;
    const text = assembleMakeupTokenIssueNotice({
      studentName: student.name,
      originDate: issuedToken.originDate,
      expiresAt: issuedToken.expiresAt,
      originReason: issuedToken.originReason,
      academyName,
    });

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={issuedToken ? '보강권 발급 완료' : '보강권(1회) 발급'}
      description={
        issuedToken
          ? '학부모님께 발급 알림을 공유하세요'
          : '사전 협의된 결석 건에 보강권을 생성합니다'
      }
      maxWidth="md"
      intent={issuedToken ? 'view' : 'form'}
    >
      {!issuedToken ? (
        <form onSubmit={handleIssue} className="space-y-4">
          {/* 기본 안내 카드 */}
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span>대상 학생: <strong className="text-indigo-950 font-bold text-sm">{student.name}</strong></span>
              <span className="flex items-center gap-1 text-indigo-700">
                <Calendar className="w-3.5 h-3.5" />
                결석일: {originDate}
              </span>
            </div>
            <p className="text-indigo-600/90 text-[11px] leading-relaxed pt-1">
              💡 무조건 보강이 아닌, 원장님이 승인한 결석에 한해 유효기간 동안 1회 보강을 부여합니다.
            </p>
          </div>

          {/* 결석 사유 선택 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              결석 사유 (보강 승인 사유)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOriginReason('advance_request')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                  originReason === 'advance_request'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                사전 연락
              </button>
              <button
                type="button"
                onClick={() => setOriginReason('absence')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                  originReason === 'absence'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                병결·입원
              </button>
              <button
                type="button"
                onClick={() => setOriginReason('instructor_cancel')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                  originReason === 'instructor_cancel'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                학원 사정
              </button>
            </div>
          </div>

          {/* 유효기간 선택 */}
          <div className="space-y-1.5">
            <label htmlFor="makeup-validity-select" className="block text-xs font-bold text-slate-700">
              보강권 유효기간 (기한 경과 시 자동 소멸)
            </label>
            <div className="flex items-center gap-2">
              <select
                id="makeup-validity-select"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="flex-1 py-2 px-3 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={14}>14일 (2주 이내 보강)</option>
                <option value={30}>30일 (권장: 1개월 이내 보강)</option>
                <option value={60}>60일 (2개월 이내 보강)</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-400">
              * 무기한 보강으로 인한 시간표 누적 정원 초과를 방지합니다.
            </p>
          </div>

          {/* 액션 버튼 */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Ticket className="w-3.5 h-3.5" />
              {isSubmitting ? '발급 중...' : '보강권 발급 (1회)'}
            </button>
          </div>
        </form>
      ) : (
        /* 발급 완료 후 학부모 안내 뷰 */
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-emerald-950">
                {student.name} 학생에게 보강권이 발급되었습니다.
              </h3>
              <p className="text-xs text-emerald-800">
                유효기간: <strong>~{issuedToken.expiresAt}까지</strong> ({validityDays}일간)
              </p>
              <p className="text-[11px] text-emerald-700/80">
                추후 여유 슬롯에 배정하거나 토요일 보강 타임에 매칭할 수 있습니다.
              </p>
            </div>
          </div>

          {/* 카카오톡 / 문자 안내문 미리보기 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                학부모 전송용 안내 템플릿
              </span>
              <button
                type="button"
                onClick={handleCopyNotice}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>카톡 문구 복사</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {assembleMakeupTokenIssueNotice({
                studentName: student.name,
                originDate: issuedToken.originDate,
                expiresAt: issuedToken.expiresAt,
                originReason: issuedToken.originReason,
                academyName,
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
            >
              확인 완료
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
