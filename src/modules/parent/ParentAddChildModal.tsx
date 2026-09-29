import React, { useEffect, useState } from 'react';
import { Loader2, Pencil, UserPlus, X } from 'lucide-react';
import {
  GUARDIAN_RELATIONSHIP_LABELS,
  type GuardianRelationship,
} from '@/core/parent/types';
import type { GlobalStudent } from '@/core/parent/types/globalParent';
import { registerParentChild, updateParentChild } from '@/core/parent/services/parentChildService';
import { BirthDateInput } from '@/shared/components/ui';

interface ParentAddChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    message: string,
    created?: {
      studentId: string;
      displayName: string;
      birthDate: string | null;
      gender: string | null;
      school: string | null;
      grade: string | null;
      relationship: GuardianRelationship;
    }
  ) => void;
  child?: GlobalStudent | null;
}

export const ParentAddChildModal: React.FC<ParentAddChildModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  child = null,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [relationship, setRelationship] = useState<GuardianRelationship>('mother');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(child);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(child?.displayName ?? '');
    setBirthDate(child?.birthDate ?? '');
    setGender(child?.gender ?? '');
    setSchool(child?.school ?? '');
    setGrade(child?.grade ?? '');
    setRelationship(child?.relationship ?? 'mother');
    setError(null);
  }, [isOpen, child]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      setError('자녀 이름을 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    const payload = {
      displayName: displayName.trim(),
      birthDate: birthDate || null,
      relationship,
      gender: gender || null,
      school: school.trim() || null,
      grade: grade.trim() || null,
      isPrimary: child?.isPrimary ?? true,
    };
    try {
      const saved = {
        studentId: child?.studentId ?? '',
        displayName: payload.displayName,
        birthDate: payload.birthDate,
        gender: payload.gender,
        school: payload.school,
        grade: payload.grade,
        relationship,
      };

      if (child) {
        await updateParentChild(child.studentId, payload);
        onSuccess('자녀 정보를 수정했습니다.', { ...saved, studentId: child.studentId });
        onClose();
        return;
      }

      const result = await registerParentChild(payload);
      const created = {
        studentId: result.studentId,
        displayName: result.displayName,
        birthDate: result.birthDate,
        gender: result.gender,
        school: result.school,
        grade: result.grade,
        relationship,
      };
      if (result.status === 'existing') {
        onSuccess('이미 등록된 자녀입니다. 정보를 바꾸려면 목록에서 수정해 주세요.', created);
        onClose();
        return;
      }

      onSuccess('자녀 정보가 등록되었습니다.', created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '자녀 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold flex items-center gap-2">
            {isEdit ? (
              <Pencil className="w-4 h-4 text-indigo-600" />
            ) : (
              <UserPlus className="w-4 h-4 text-indigo-600" />
            )}
            {isEdit ? '자녀 정보 수정' : '내 자녀 등록'}
          </h3>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          {isEdit
            ? '이름·생년월일·학교·학년을 고칠 수 있습니다. 학원 연결은 QR·연결 코드 또는 학원 연결하기로 진행합니다.'
            : '이름만 필수입니다. 생년월일을 넣으면 같은 이름의 자녀와 잘못 합쳐지는 일을 줄일 수 있습니다.'}
        </p>

        {error && (
          <div className="mb-3 p-2 rounded-lg bg-rose-50 text-xs text-rose-700">{error}</div>
        )}

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">이름</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl min-h-[44px]"
              placeholder="자녀 이름"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">생년월일 (권장)</span>
            <BirthDateInput
              className="mt-1"
              value={birthDate}
              onChange={setBirthDate}
            />
            {!isEdit && !birthDate.trim() && (
              <p className="mt-1.5 text-[11px] text-amber-700 leading-relaxed">
                생년월일이 없으면 같은 이름·생년월일 미입력 자녀가 이미 있을 때 기존 자녀로
                합쳐질 수 있습니다.
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">성별 (선택)</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl min-h-[44px]"
            >
              <option value="">선택 안 함</option>
              <option value="M">남</option>
              <option value="F">여</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">학교 (선택)</span>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl min-h-[44px]"
              placeholder="학교명"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">학년 (선택)</span>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl min-h-[44px]"
              placeholder="예: 초3"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">관계</span>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as GuardianRelationship)}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl min-h-[44px]"
            >
              {(Object.keys(GUARDIAN_RELATIONSHIP_LABELS) as GuardianRelationship[]).map((key) => (
                <option key={key} value={key}>
                  {GUARDIAN_RELATIONSHIP_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="mt-5 w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? <Pencil className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {isEdit ? '저장' : '등록하기'}
        </button>
      </div>
    </div>
  );
};
