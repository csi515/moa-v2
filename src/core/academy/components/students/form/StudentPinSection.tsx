import React from 'react';
import { KeyRound } from 'lucide-react';
import type { StudentFormData } from './studentFormTypes';

interface Props {
  formData: StudentFormData;
  onChange: (patch: Partial<StudentFormData>) => void;
}

export const StudentPinSection: React.FC<Props> = ({ formData, onChange }) => (
  <section>
    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
      <KeyRound className="w-3.5 h-3.5" /> 출입 PIN
    </h4>
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={formData.autoGeneratePin}
          onChange={(e) => onChange({ autoGeneratePin: e.target.checked })}
        />
        PIN 자동 발급 (4자리)
      </label>
      {!formData.autoGeneratePin && (
        <input
          type="text"
          inputMode="numeric"
          maxLength={8}
          placeholder="직접 입력 (4~8자리)"
          value={formData.checkInPin}
          onChange={(e) => onChange({ checkInPin: e.target.value.replace(/\D/g, '') })}
          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl bg-white"
        />
      )}
    </div>
  </section>
);
