import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Music2,
  Search,
  Sparkles,
  Stamp,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { EmptyState, PageHeader } from '@/shared/components';
import { StudentService } from '@/core/students';
import { isSupabaseConfigured } from '@/lib/supabase';
import { songProgressService } from './songProgressService';
import { DirectorApprovalModal } from './DirectorApprovalModal';
import { TeacherDirectPassModal } from './TeacherDirectPassModal';
import { StudentStampBoard } from './StudentStampBoard';
import { Modal } from '@/shared/components/ui/Modal';
import type { Student } from '@/types';

/** 피아노 완곡 스탬프 & 명예의 전당 관리 뷰 */
export const SongProgressStaffView: FC = () => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const { scopeStudents } = useStaffScope();
  const refreshKey = useStorageRefresh();
  const orgId = currentOrganization?.id;
  const supabaseReady = isSupabaseConfigured();

  const [pendingCount, setPendingCount] = useState(0);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [grantTarget, setGrantTarget] = useState<Student | null>(null);
  const [stampBoardStudent, setStampBoardStudent] = useState<Student | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');

  const students = useMemo(() => {
    void refreshKey;
    return scopeStudents(StudentService.getActiveStudents());
  }, [refreshKey, scopeStudents]);

  // 고유 레벨 목록 추출 (바이엘, 체르니 등)
  const availableLevels = useMemo(() => {
    const levels = new Set<string>();
    students.forEach((s) => {
      if (s.level?.trim()) levels.add(s.level.trim());
    });
    return Array.from(levels);
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return students.filter((s) => {
      const matchQuery = !q || s.name.toLowerCase().includes(q);
      const matchLevel = selectedLevel === 'ALL' || s.level === selectedLevel;
      return matchQuery && matchLevel;
    });
  }, [students, studentQuery, selectedLevel]);

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
    return (
      <div className="text-center py-12">
        <p className="text-sm font-bold text-slate-500">사업장을 먼저 선택해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* 상단 페이지 헤더 */}
      <PageHeader
        icon={<Music2 className="w-6 h-6" />}
        title="완곡 스탬프 & 진도"
      />

      {/* 상단 요약 및 승인 대기 알림 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 카드 1: 등록 원생 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">전체 원생</span>
            <span className="text-xl font-black text-slate-900 mt-1 block tabular-nums">
              {students.length}명
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* 카드 2: 완곡 축하 메시지 */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700 block flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>칭찬 스탬프</span>
            </span>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              한 곡을 마스터할 때마다 도장을 찍어주세요
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* 카드 3: 승인 대기 큐 버튼 */}
        <button
          type="button"
          disabled={!supabaseReady}
          onClick={() => setApprovalOpen(true)}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
            pendingCount > 0
              ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/70 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-500 block">완곡 신청 승인 대기</span>
            <span
              className={`text-xl font-black mt-1 block tabular-nums ${
                pendingCount > 0 ? 'text-rose-600' : 'text-slate-800'
              }`}
            >
              {pendingCount}건
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              pendingCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Stamp className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* 검색 및 레벨 필터 바 */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* 이름 검색창 */}
          <div className="relative w-full sm:w-72">
            <input
              type="search"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder="학생 이름 검색"
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 레벨 필터 칩 */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedLevel('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedLevel === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              전체 ({students.length})
            </button>
            {availableLevels.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedLevel === lvl
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* 학생 카드 목록 (그리드 레이아웃) */}
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={<Music2 className="w-10 h-10" />}
            title="해당하는 학생이 없습니다"
            description="검색어를 바꾸거나 다른 레벨 칩을 선택해 보세요."
            className="py-12 border-0 shadow-none"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex flex-col justify-between space-y-3 group"
              >
                {/* 상단 학생 기본 정보 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-700 font-black text-sm flex items-center justify-center shrink-0 transition-colors">
                      {student.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {student.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {student.level ? (
                          <span className="font-semibold text-indigo-600">{student.level}</span>
                        ) : (
                          '레벨 미지정'
                        )}
                        {student.school ? ` · ${student.school}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStampBoardStudent(student)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
                    title="스탬프판 열기"
                    aria-label="스탬프판 열기"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 하단 액션 버튼 그룹 */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStampBoardStudent(student)}
                    className="flex-1 py-2 px-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition text-center cursor-pointer"
                  >
                    스탬프판 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrantTarget(student)}
                    className="flex-1 py-2 px-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-2xs transition inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Stamp className="w-3.5 h-3.5" />
                    <span>완곡 수여</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 1. 완곡 승인 대기 심사 모달 */}
      <DirectorApprovalModal
        isOpen={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        organizationId={orgId}
        onToast={showToast}
        onApproved={() => void reloadCount()}
      />

      {/* 2. 교사 직접 완곡 스탬프 수여 모달 */}
      {grantTarget && (
        <TeacherDirectPassModal
          isOpen={!!grantTarget}
          onClose={() => setGrantTarget(null)}
          organizationId={orgId}
          customerId={grantTarget.id}
          studentName={grantTarget.name}
          onToast={showToast}
          onGranted={() => void reloadCount()}
        />
      )}

      {/* 3. 학생 스탬프판 전체 모달 팝업 */}
      {stampBoardStudent && (
        <Modal
          isOpen={!!stampBoardStudent}
          onClose={() => setStampBoardStudent(null)}
          title={`${stampBoardStudent.name}의 디지털 스탬프판`}
          maxWidth="lg"
        >
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[80vh]">
            <StudentStampBoard
              organizationId={orgId}
              customerId={stampBoardStudent.id}
              studentName={stampBoardStudent.name}
              canRequest={false}
              onToast={showToast}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
