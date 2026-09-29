import React from 'react';
import {
  Phone,
  Mail,
  UserPlus,
  Link2,
  Trash2,
  Search,
} from 'lucide-react';
import type { Parent } from '@/types';
import type { GuardianRelationship } from '@/core/parent/types';
import {
  getParentChildNames,
  GUARDIAN_RELATIONSHIP_LABELS,
} from '@/core/parent/guardianHelpers';
import type { GuardianFormEntry } from './studentFormTypes';
import { RELATIONSHIP_OPTIONS } from './studentFormTypes';
import { STUDENT_FORM_FIELD_IDS } from './studentFormValidation';
import { useModuleLabels } from '@/core/labels';
import { FORM_CONTROL_ERROR_CLASS } from '@/shared/components/ui/FormField';

interface Props {
  isEdit: boolean;
  canInviteParent: boolean;
  guardians: GuardianFormEntry[];
  activeSearchIdx: number | null;
  searchResults: Parent[];
  onAddGuardian: () => void;
  onUpdateGuardian: (idx: number, patch: Partial<GuardianFormEntry>) => void;
  onSetPrimary: (idx: number) => void;
  onRemoveGuardian: (idx: number) => void;
  onSelectExistingParent: (idx: number, parent: Parent) => void;
  onFocusSearch: (idx: number) => void;
  errors?: Record<string, string>;
}

export const GuardianSection: React.FC<Props> = ({
  isEdit,
  canInviteParent,
  guardians,
  activeSearchIdx,
  searchResults,
  onAddGuardian,
  onUpdateGuardian,
  onSetPrimary,
  onRemoveGuardian,
  onSelectExistingParent,
  onFocusSearch,
  errors,
}) => {
  const fieldErrors = errors ?? {};
  const labels = useModuleLabels();
  const contactLabel = labels.contact.singular;

  return (
  <section id={STUDENT_FORM_FIELD_IDS.guardians}>
    <div className="flex items-center justify-between mb-3">
      <div>
        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" /> {contactLabel} 연결
        </h4>
        {isEdit && (
          <p className="text-[11px] text-slate-500 mt-1">
            부·모 각각 별도 계정으로 연결할 수 있습니다. {contactLabel} 추가 후 저장하면 link가 반영됩니다.
          </p>
        )}
        {fieldErrors.guardians && (
          <p className="text-xs text-rose-600 mt-1" role="alert">
            {fieldErrors.guardians}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onAddGuardian}
        className="text-xs font-bold text-indigo-600 flex items-center gap-1 shrink-0 min-h-[44px] px-2"
      >
        <UserPlus className="w-3.5 h-3.5" /> {contactLabel} 추가
      </button>
    </div>

    <div className="space-y-4">
      {guardians.map((g, idx) => (
        <div key={g.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              {contactLabel} {idx + 1}
              {g.isPrimary && (
                <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md">
                  주 {contactLabel}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {!g.isPrimary && (
                <button
                  type="button"
                  onClick={() => onSetPrimary(idx)}
                  className="text-[10px] text-indigo-600 font-bold"
                >
                  주 {contactLabel}로
                </button>
              )}
              {guardians.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveGuardian(idx)}
                  className="text-rose-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="연결 해제"
                  aria-label={`${contactLabel} 연결 해제`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdateGuardian(idx, { mode: 'existing' })}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                g.mode === 'existing'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <Link2 className="w-3 h-3 inline mr-1" />
              기존 {contactLabel}
            </button>
            <button
              type="button"
              onClick={() => onUpdateGuardian(idx, { mode: 'new', existingParentId: '' })}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                g.mode === 'new'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <UserPlus className="w-3 h-3 inline mr-1" />
              새 {contactLabel}
            </button>
          </div>

          {g.mode === 'existing' ? (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id={STUDENT_FORM_FIELD_IDS.guardianExisting(idx)}
                type="search"
                placeholder="이름·전화·자녀명으로 검색"
                value={g.parentSearch}
                onFocus={() => onFocusSearch(idx)}
                onChange={(e) =>
                  onUpdateGuardian(idx, {
                    parentSearch: e.target.value,
                    existingParentId: '',
                  })
                }
                aria-invalid={Boolean(fieldErrors[`guardian-${idx}-existing`])}
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-xl bg-white min-h-[44px] ${
                  fieldErrors[`guardian-${idx}-existing`]
                    ? FORM_CONTROL_ERROR_CLASS
                    : 'border-slate-200'
                }`}
              />
              {fieldErrors[`guardian-${idx}-existing`] && (
                <p className="mt-1 text-xs text-rose-600" role="alert">
                  {fieldErrors[`guardian-${idx}-existing`]}
                </p>
              )}
              {activeSearchIdx === idx && searchResults.length > 0 && (
                <div className="absolute z-10 inset-x-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectExistingParent(idx, p)}
                      className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-slate-50 last:border-0"
                    >
                      <p className="text-sm font-bold text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.phone}</p>
                      <p className="text-[10px] text-indigo-600">
                        자녀: {getParentChildNames(p).join(', ') || '없음'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  id={STUDENT_FORM_FIELD_IDS.guardianName(idx)}
                  type="text"
                  placeholder={`${contactLabel} 이름 *`}
                  value={g.name}
                  onChange={(e) => onUpdateGuardian(idx, { name: e.target.value })}
                  aria-invalid={Boolean(fieldErrors[`guardian-${idx}-name`])}
                  className={`w-full px-3 py-2 text-sm border rounded-xl bg-white min-h-[44px] ${
                    fieldErrors[`guardian-${idx}-name`] ? FORM_CONTROL_ERROR_CLASS : 'border-slate-200'
                  }`}
                />
                {fieldErrors[`guardian-${idx}-name`] && (
                  <p className="mt-1 text-xs text-rose-600" role="alert">
                    {fieldErrors[`guardian-${idx}-name`]}
                  </p>
                )}
              </div>
              <div>
                <input
                  id={STUDENT_FORM_FIELD_IDS.guardianPhone(idx)}
                  type="tel"
                  placeholder="전화번호 *"
                  value={g.phone}
                  onChange={(e) => onUpdateGuardian(idx, { phone: e.target.value })}
                  aria-invalid={Boolean(fieldErrors[`guardian-${idx}-phone`])}
                  className={`w-full px-3 py-2 text-sm border rounded-xl bg-white min-h-[44px] ${
                    fieldErrors[`guardian-${idx}-phone`] ? FORM_CONTROL_ERROR_CLASS : 'border-slate-200'
                  }`}
                />
                {fieldErrors[`guardian-${idx}-phone`] && (
                  <p className="mt-1 text-xs text-rose-600" role="alert">
                    {fieldErrors[`guardian-${idx}-phone`]}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">관계</label>
              <select
                value={g.relationship}
                onChange={(e) =>
                  onUpdateGuardian(idx, { relationship: e.target.value as GuardianRelationship })
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
              >
                {RELATIONSHIP_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {GUARDIAN_RELATIONSHIP_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> 이메일
              </label>
              <input
                id={STUDENT_FORM_FIELD_IDS.guardianEmail(idx)}
                type="email"
                value={g.email}
                onChange={(e) => onUpdateGuardian(idx, { email: e.target.value })}
                aria-invalid={Boolean(fieldErrors[`guardian-${idx}-email`])}
                className={`w-full px-3 py-2 text-sm border rounded-xl bg-white min-h-[44px] ${
                  fieldErrors[`guardian-${idx}-email`] ? FORM_CONTROL_ERROR_CLASS : 'border-slate-200'
                }`}
              />
              {fieldErrors[`guardian-${idx}-email`] && (
                <p className="mt-1 text-xs text-rose-600" role="alert">
                  {fieldErrors[`guardian-${idx}-email`]}
                </p>
              )}
            </div>
          </div>

          {canInviteParent && g.mode === 'new' && (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={g.invite}
                onChange={(e) => onUpdateGuardian(idx, { invite: e.target.checked })}
                disabled={!g.email.trim()}
              />
              등록과 동시에 {contactLabel} 포털 초대
            </label>
          )}
        </div>
      ))}
    </div>
  </section>
  );
};
