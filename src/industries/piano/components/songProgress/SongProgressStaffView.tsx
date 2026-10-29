import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Music2, Stamp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { PageHeader } from '@/shared/components';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { StudentService } from '@/core/students';
import { isSupabaseConfigured } from '@/lib/supabase';
import { songProgressService } from './songProgressService';
import { DirectorApprovalModal } from './DirectorApprovalModal';
import { TeacherDirectPassModal } from './TeacherDirectPassModal';
import { SONG_PROGRESS_COPY } from './songProgressTypes';

/** 스태프 — 완곡 수동 수여 + 승인 허브 */
export const SongProgressStaffView: FC = () => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const { scopeStudents } = useStaffScope();
  const refreshKey = useStorageRefresh();
  const orgId = currentOrganization?.id;
  const supabaseReady = isSupabaseConfigured();
  const [pendingCount, setPendingCount] = useState(0);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');

  const students = useMemo(() => {
    void refreshKey;
    return scopeStudents(StudentService.getActiveStudents());
  }, [refreshKey, scopeStudents]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, studentQuery]);

  /** 필터 결과 안에서 선택 — 동기화 effect 없이 파생 */
  const selectedStudentId = useMemo(() => {
    if (filteredStudents.length === 0) return '';
    if (filteredStudents.some((s) => s.id === studentId)) return studentId;
    return filteredStudents[0].id;
  }, [filteredStudents, studentId]);

  const selected = students.find((s) => s.id === selectedStudentId);

  const reloadCount = useCallback(async () => {
    if (!orgId || !supabaseReady) {
      setPendingCount(0);
      return;
    }
    try {
      const list = await songProgressService.listPending(orgId);
      setPendingCount(list.length);
    } catch {
      setPendingCount(0);
    }
  }, [orgId, supabaseReady]);

  useEffect(() => {
    void reloadCount();
    const t = window.setInterval(() => void reloadCount(), 20_000);
    return () => window.clearInterval(t);
  }, [reloadCount]);

  if (!orgId) {
    return <p className="text-sm text-slate-400 text-center py-8">조직을 선택해 주세요.</p>;
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        icon={<Music2 className="w-6 h-6" />}
        title="완곡 스탬프"
        />

      {!supabaseReady && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          Supabase 연결 후 스탬프 수여·승인을 사용할 수 있습니다.
        </p>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h3 className="text-sm font-black text-slate-900">{SONG_PROGRESS_COPY.grantCta}</h3>
        <label className="block text-xs font-bold text-slate-600">
          학생 검색
          <input
            type="search"
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            placeholder="이름 검색"
            className={`mt-1 ${FORM_CONTROL_CLASS}`}
            autoComplete="off"
          />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          학생
          <select
            className={`mt-1 ${FORM_CONTROL_CLASS}`}
            value={selectedStudentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {filteredStudents.length === 0 && (
              <option value="">{students.length === 0 ? '등록된 학생 없음' : '검색 결과 없음'}</option>
            )}
            {filteredStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!selected || !supabaseReady}
          onClick={() => setGrantOpen(true)}
          className="w-full sm:w-auto min-h-[48px] px-5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-sm inline-flex items-center justify-center gap-2"
        >
          <Stamp className="w-4 h-4" />
          {SONG_PROGRESS_COPY.grantCta}
        </button>
      </section>

      <button
        type="button"
        disabled={!supabaseReady}
        onClick={() => setApprovalOpen(true)}
        className="w-full sm:w-auto min-h-[52px] px-5 rounded-2xl bg-indigo-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-40"
      >
        <Stamp className="w-5 h-5" />
        승인 대기 {pendingCount}건 보기
      </button>

      <DirectorApprovalModal
        isOpen={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        organizationId={orgId}
        onToast={showToast}
        onApproved={() => void reloadCount()}
      />

      {selected && (
        <TeacherDirectPassModal
          isOpen={grantOpen}
          onClose={() => setGrantOpen(false)}
          organizationId={orgId}
          customerId={selected.id}
          studentName={selected.name}
          onToast={showToast}
          onGranted={() => void reloadCount()}
        />
      )}
    </div>
  );
};
