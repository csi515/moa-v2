import React from 'react';
import { Bus, MapPin, Plus, Star, Trash2 } from 'lucide-react';
import type { PickupAddress, ShuttleDirection } from '@/core/transport/types';
import {
  PICKUP_ADDRESS_LABEL_PRESETS,
  SHUTTLE_DIRECTION_OPTIONS,
} from '@/core/transport/types';
import { FormField, FORM_CONTROL_CLASS, FORM_CONTROL_ERROR_CLASS } from '@/shared/components/ui/FormField';
import { STUDENT_FORM_FIELD_IDS } from './studentFormValidation';
import { useModuleLabels } from '@/core/labels';

interface StudentPickupSectionProps {
  address: string;
  usesShuttleService: boolean;
  pickupAddresses: PickupAddress[];
  onAddressChange: (address: string) => void;
  onUsesShuttleChange: (uses: boolean) => void;
  onPickupAddressesChange: (addresses: PickupAddress[]) => void;
  pickupError?: string;
}

function setDefaultAddress(list: PickupAddress[], id: string): PickupAddress[] {
  return list.map((a) => ({ ...a, isDefault: a.id === id }));
}

export const StudentPickupSection: React.FC<StudentPickupSectionProps> = ({
  address,
  usesShuttleService,
  pickupAddresses,
  onAddressChange,
  onUsesShuttleChange,
  onPickupAddressesChange,
  pickupError,
}) => {
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular;
  const contactLabel = labels.contact.singular;

  const updateAddress = (id: string, patch: Partial<PickupAddress>) => {
    onPickupAddressesChange(
      pickupAddresses.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
  };

  const removeAddress = (id: string) => {
    const next = pickupAddresses.filter((a) => a.id !== id);
    if (next.length > 0 && !next.some((a) => a.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    onPickupAddressesChange(next);
  };

  const addAddress = () => {
    const id = crypto.randomUUID();
    onPickupAddressesChange([
      ...pickupAddresses.map((a) => ({ ...a, isDefault: pickupAddresses.length === 0 ? false : a.isDefault })),
      {
        id,
        label: pickupAddresses.length === 0 ? '집' : '기타',
        address: '',
        shuttleDirection: 'both' as ShuttleDirection,
        isDefault: pickupAddresses.length === 0,
      },
    ]);
  };

  return (
    <section
      id={STUDENT_FORM_FIELD_IDS.pickup}
      className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/40 p-4"
    >
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
          <Bus className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">픽업·하원 셔틀</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            셔틀 이용 {customerLabel}의 픽업·하원 주소를 등록합니다.
          </p>
        </div>
      </div>

      <FormField label="거주지 주소">
        <input
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="예: 서울시 강남구 테헤란로 123"
          className={FORM_CONTROL_CLASS}
        />
      </FormField>

      <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
        <input
          type="checkbox"
          checked={usesShuttleService}
          onChange={(e) => onUsesShuttleChange(e.target.checked)}
          className="w-5 h-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        <span className="text-sm font-semibold text-slate-800">셔틀 픽업·하원 서비스 이용</span>
      </label>

      {usesShuttleService && (
        <div className="space-y-3">
          {pickupAddresses.map((item, index) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-3 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">주소 {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onPickupAddressesChange(setDefaultAddress(pickupAddresses, item.id))}
                    className={`p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${
                      item.isDefault ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    aria-label="기본 주소로 설정"
                    title="기본 주소"
                  >
                    <Star className={`w-4 h-4 ${item.isDefault ? 'fill-current' : ''}`} />
                  </button>
                  {pickupAddresses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAddress(item.id)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="주소 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="구분">
                  <input
                    type="text"
                    list={`pickup-label-${item.id}`}
                    value={item.label}
                    onChange={(e) => updateAddress(item.id, { label: e.target.value })}
                    placeholder="집, 할머니댁"
                    className={FORM_CONTROL_CLASS}
                  />
                  <datalist id={`pickup-label-${item.id}`}>
                    {PICKUP_ADDRESS_LABEL_PRESETS.map((label) => (
                      <option key={label} value={label} />
                    ))}
                  </datalist>
                </FormField>

                <FormField label="이용 구분">
                  <select
                    value={item.shuttleDirection}
                    onChange={(e) =>
                      updateAddress(item.id, {
                        shuttleDirection: e.target.value as ShuttleDirection,
                      })
                    }
                    className={FORM_CONTROL_CLASS}
                  >
                    {SHUTTLE_DIRECTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField
                label="주소"
                required
                error={index === 0 ? pickupError : undefined}
              >
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={item.address}
                    onChange={(e) => updateAddress(item.id, { address: e.target.value })}
                    placeholder="도로명 또는 지번 주소"
                    aria-invalid={index === 0 && Boolean(pickupError)}
                    className={`${FORM_CONTROL_CLASS} pl-9 ${
                      index === 0 && pickupError ? FORM_CONTROL_ERROR_CLASS : ''
                    }`}
                  />
                </div>
              </FormField>

              <FormField label="상세 주소">
                <input
                  type="text"
                  value={item.detail || ''}
                  onChange={(e) => updateAddress(item.id, { detail: e.target.value })}
                  placeholder="동·호수, 건물명"
                  className={FORM_CONTROL_CLASS}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="연락 받을 분">
                  <input
                    type="text"
                    value={item.contactName || ''}
                    onChange={(e) => updateAddress(item.id, { contactName: e.target.value })}
                    placeholder={`${contactLabel} 이름`}
                    className={FORM_CONTROL_CLASS}
                  />
                </FormField>
                <FormField label="연락처">
                  <input
                    type="tel"
                    value={item.contactPhone || ''}
                    onChange={(e) => updateAddress(item.id, { contactPhone: e.target.value })}
                    placeholder="010-0000-0000"
                    className={FORM_CONTROL_CLASS}
                  />
                </FormField>
              </div>

              <FormField label="찾아가는 길·메모">
                <textarea
                  rows={2}
                  value={item.directions || ''}
                  onChange={(e) => updateAddress(item.id, { directions: e.target.value })}
                  placeholder="주차 위치, 공동현관 비밀번호 등"
                  className={`${FORM_CONTROL_CLASS} resize-none`}
                />
              </FormField>
            </div>
          ))}

          <button
            type="button"
            onClick={addAddress}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-sky-200 rounded-xl text-sm font-bold text-sky-700 hover:bg-sky-50 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            픽업·하원 주소 추가
          </button>
        </div>
      )}
    </section>
  );
};
