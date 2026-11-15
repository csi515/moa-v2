import React, { useMemo, useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { memberMatchesQuery } from '../domain/mboVisibilityEngine';

export type PickerMember = {
  id: string;
  userId: string;
  displayName: string;
  departmentId?: string | null;
  departmentName?: string;
};

export type PickerDepartment = {
  id: string;
  name: string;
  parentId: string | null;
};

interface Props {
  open: boolean;
  departments: PickerDepartment[];
  members: PickerMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const OrganizationMemberPickerModal: React.FC<Props> = ({
  open,
  departments,
  members,
  selectedIds,
  onChange,
  onClose,
  onConfirm,
}) => {
  const [query, setQuery] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const filtered = useMemo(() => {
    return members.filter((member) => {
      if (departmentId && member.departmentId !== departmentId) return false;
      return memberMatchesQuery(member.displayName, query);
    });
  }, [members, departmentId, query]);

  const selectedMembers = members.filter((m) => selectedIds.includes(m.id));

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`사내 공개 대상자 선택 (${selectedIds.length}명)`}
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <button
            type="button"
            className="min-h-11 px-4 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            className="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 transition-colors shadow-xs"
            onClick={onConfirm}
          >
            선택 완료
          </button>
        </div>
      }
    >
      <div className="space-y-3 overflow-auto max-h-[60vh] py-1">
        <label className="block text-sm font-medium text-slate-700">
          부서
          <select
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 bg-white text-sm"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">전체 부서</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          이름 / 초성 검색
          <input
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 김민수 또는 ㄱㅁ"
          />
        </label>

        {selectedMembers.length > 0 ? (
          <ul className="flex flex-wrap gap-2 pt-1">
            {selectedMembers.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  className="min-h-9 rounded-full bg-indigo-50 border border-indigo-100 px-3 text-xs font-semibold text-indigo-700 flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                  onClick={() => onChange(selectedIds.filter((id) => id !== member.id))}
                >
                  {member.displayName} ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
          {filtered.map((member) => {
            const checked = selectedIds.includes(member.id);
            return (
              <li key={member.id} className="hover:bg-slate-50 transition-colors">
                <label className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    checked={checked}
                    onChange={() => {
                      onChange(
                        checked
                          ? selectedIds.filter((id) => id !== member.id)
                          : [...selectedIds, member.id],
                      );
                    }}
                  />
                  <span className="flex-1 font-medium text-slate-800">{member.displayName}</span>
                  <span className="text-xs text-slate-500">{member.departmentName || '미배정'}</span>
                </label>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-slate-500">검색 결과가 없습니다.</li>
          ) : null}
        </ul>
      </div>
    </Modal>
  );
};
