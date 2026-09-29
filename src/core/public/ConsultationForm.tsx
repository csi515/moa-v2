import { FormEvent, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ConsultationSubmission } from '@/types';
import { publicOrgService } from './services/publicOrgService';

interface ConsultationFormProps {
  organizationId: string;
  isConsultationMode: boolean;
  /** false면 성공 화면만 보여줄 때 폼을 숨긴다 (기존 showConsultForm && !consultSubmitted) */
  showForm: boolean;
  submitted: boolean;
  onSubmitted: () => void;
  onCloseSuccess: () => void;
}

export function ConsultationForm({
  organizationId,
  isConsultationMode,
  showForm,
  submitted,
  onSubmitted,
  onCloseSuccess,
}: ConsultationFormProps) {
  const [consultForm, setConsultForm] = useState<ConsultationSubmission>({
    contact_name: '',
    contact_phone: '',
    message: '',
    preferred_time: '',
  });
  const [studentName, setStudentName] = useState('');

  const handleConsultSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      const messageParts = [
        studentName.trim() ? `학생: ${studentName.trim()}` : '',
        consultForm.message.trim(),
      ].filter(Boolean);
      await publicOrgService.submitConsultation(organizationId, {
        ...consultForm,
        message: messageParts.join('\n') || consultForm.message,
      });
      onSubmitted();
      setConsultForm({
        contact_name: '',
        contact_phone: '',
        message: '',
        preferred_time: '',
      });
      setStudentName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '상담 신청에 실패했습니다');
    }
  };

  return (
    <>
      {showForm && !submitted && (
        <section className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {isConsultationMode ? '상담 문의' : '상담 신청'}
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            {isConsultationMode
              ? '예약 가능한 시간이 없거나 별도 문의가 필요할 때 이용해 주세요'
              : '담당자가 확인 후 빠른 시일 내에 연락드리겠습니다'}
          </p>
          <form onSubmit={handleConsultSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                신청자 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={consultForm.contact_name}
                onChange={(e) => setConsultForm({ ...consultForm, contact_name: e.target.value })}
                className="w-full px-4 py-3 min-h-[44px] border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="이름"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={consultForm.contact_phone}
                onChange={(e) => setConsultForm({ ...consultForm, contact_phone: e.target.value })}
                className="w-full px-4 py-3 min-h-[44px] border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                수강 희망자 이름 (선택)
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3 min-h-[44px] border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="본인 또는 자녀 이름"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">희망 시간</label>
              <input
                type="text"
                value={consultForm.preferred_time}
                onChange={(e) => setConsultForm({ ...consultForm, preferred_time: e.target.value })}
                className="w-full px-4 py-3 min-h-[44px] border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="예: 평일 오후 3시 이후"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">상담 내용</label>
              <textarea
                value={consultForm.message}
                onChange={(e) => setConsultForm({ ...consultForm, message: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="상담하고 싶은 내용을 적어 주세요"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 min-h-[44px] bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              상담 신청
            </button>
          </form>
        </section>
      )}

      {submitted && (
        <section className="bg-green-50 border border-green-200 rounded-2xl p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">상담 신청이 완료되었습니다</h3>
          <p className="text-slate-700 mb-6">담당자가 확인 후 빠른 시일 내에 연락드리겠습니다</p>
          <button
            onClick={onCloseSuccess}
            className="px-6 py-2 bg-white text-green-600 border border-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
          >
            닫기
          </button>
        </section>
      )}
    </>
  );
}
