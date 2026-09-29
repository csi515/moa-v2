import React from 'react';

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  ariaLabel: string;
  activeClassName?: string;
  disabled?: boolean;
}

/** 공통 on/off 스위치 (44px 터치 영역) */
export const ToggleSwitch: React.FC<Props> = ({
  enabled,
  onChange,
  ariaLabel,
  activeClassName = 'bg-indigo-600',
  disabled = false,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={() => onChange(!enabled)}
    className="relative shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
  >
    <span
      className={`relative block w-12 h-7 rounded-full transition-colors ${
        enabled ? activeClassName : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-5' : ''
        }`}
      />
    </span>
  </button>
);
