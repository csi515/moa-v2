import React, { useState } from 'react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { usePermissions } from '@/core/auth/usePermissions';
import { isSkinClinicIndustry } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { attendanceStorage } from '@/capabilities/attendance/infrastructure/attendanceStorage';
import type { Student } from '@/types';
import { KeyRound, RefreshCw } from 'lucide-react';
import { PIN_ATTENDANCE_DIRECTOR_COPY } from '../domain/attendanceNotifyCopy';

interface CustomerPinPanelProps {
  student: Student;
}

/** 원생별 출결 PIN 설정 패널 */
export const CustomerPinPanel: React.FC<CustomerPinPanelProps> = ({ student }) => {
  const { attendanceEnabled, industry } = usePermissions();
  const labels = useModuleLabels();
  const skin = isSkinClinicIndustry(industry);
  const org = useOptionalOrganization();
  const organizationId = org?.currentOrganization?.id || 'local-org';

  const [customPin, setCustomPin] = useState('');
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pinSet = attendanceStorage.hasCustomerPin(student.id);

  if (!attendanceEnabled) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { pin } = await attendanceStorage.generateCustomerPin(student.id, organizationId);
      setRevealedPin(pin);
      showToast(`${student.name}님 PIN이 발급되었습니다.`, 'success');
    } catch {
      showToast('PIN 발급에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustom = async () => {
    setLoading(true);
    try {
      const result = await attendanceStorage.setCustomerPin(student.id, customPin, organizationId);
      if (result.ok === false) {
        const messages: Record<'invalid_pin_format' | 'pin_already_used', string> = {
          invalid_pin_format: 'PIN은 4~8자리 숫자여야 합니다.',
          pin_already_used: '다른 회원이 사용 중인 PIN입니다.',
        };
        showToast(messages[result.error], 'error');
        return;
      }
      setRevealedPin(customPin);
      setCustomPin('');
      showToast('PIN이 저장되었습니다.', 'success');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    attendanceStorage.clearCustomerPin(student.id);
    setRevealedPin(null);
    setCustomPin('');
    showToast('PIN이 삭제되었습니다.', 'info');
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-indigo-600" />
        <h4 className="text-sm font-bold text-slate-900">출결 PIN</h4>
        <span className={`text-[10px] font-bold ml-auto ${pinSet ? 'text-emerald-600' : 'text-rose-500'}`}>
          {pinSet ? '설정됨' : '미설정'}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        {PIN_ATTENDANCE_DIRECTOR_COPY.pinPanelHint}
      </p>

      {!pinSet && !revealedPin && (
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-3">
          <p className="text-xs text-amber-900">
            <strong>PIN 미설정</strong><br />
            <span className="text-amber-700">자동 발급 또는 직접 입력으로 PIN을 설정하세요</span>
          </p>
        </div>
      )}

      {revealedPin && (
        <div className="bg-indigo-600 text-white rounded-xl p-3 text-center">
          <p className="text-[10px] opacity-80">발급된 PIN (한 번만 표시)</p>
          <p className="text-2xl font-black tracking-[0.3em] font-mono mt-1">{revealedPin}</p>
          <p className="text-[10px] opacity-80 mt-2">
            {skin
              ? `${labels.contact.singular} 또는 ${labels.customer.singular}에게 전달하세요`
              : '학부모님 또는 학생에게 전달하세요'}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          placeholder="직접 입력 (4~8자리)"
          value={customPin}
          onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, ''))}
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          disabled={loading}
        />
        <button
          type="button"
          disabled={loading || customPin.length < 4}
          onClick={handleSaveCustom}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-slate-50 active:scale-[0.98] transition-all min-h-[44px]"
        >
          저장
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={handleGenerate}
          className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 min-h-[44px] hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '발급 중...' : 'PIN 자동 발급'}
        </button>
        {pinSet && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 active:scale-[0.98] transition-all min-h-[44px]"
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
};
