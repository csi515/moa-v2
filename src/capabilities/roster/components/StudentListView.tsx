import React, { useState, useMemo } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { getIndustryPlugin } from '@/core/industry/registry';
import {
  getRosterListPresentation,
  rosterFilterEmptyDescription,
  rosterSearchPlaceholder,
} from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { useTerminology } from '@/core/terminology';
import { useTenantTerms } from '@/core/i18n';
import { studentUsesShuttleService } from '@/capabilities/transport';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { STORAGE_REFRESH_DOMAINS } from '@/hooks/useStorageRefresh';
import { getPrimaryGuardian, studentMatchesGuardianQuery } from '@/core/parent/guardianHelpers';
import { rosterStorage } from '@/capabilities/roster/infrastructure/rosterStorage';
import { attendanceStorage } from '@/capabilities/attendance/infrastructure/attendanceStorage';
import { commerceStorage } from '@/capabilities/commerce/infrastructure/commerceStorage';
import { StudentService } from '@/core/students';
import { ScheduleService } from '@/core/services/scheduleService';
import type { Student } from '@/types/customer';
import type { DayOfWeek } from '@/core/staff/workWindow';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { enrollmentModeLabel } from './form/enrollmentFormCopy';
import { StudentFormModal } from './StudentFormModal';
import { StudentDetailModal } from './StudentDetailModal';
import { getStudentStatusBadge } from '@/utils/formatters';
import { PageHeader, FilterBar, SearchField, EmptyState, PaginationBar, BulkActionToolbar, ListToolbar } from '@/shared/components';
import { exportStudentsToCsv } from '../helpers/studentExcelHelpers';
import { DENSITY } from '@/shared/styles/density';
import {
  Users,
  UserPlus,
  ArrowUpDown,
  ChevronRight,
  Bus,
  SlidersHorizontal,
  FileSpreadsheet,
  Download,
  CalendarClock,
  Share2,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { StudentBulkImportModal } from './StudentBulkImportModal';
import { BulkScheduleAssignModal } from './schedule/BulkScheduleAssignModal';
import { ParentInviteShareModal } from './ParentInviteShareModal';
import {
  WEEKDAY_FILTER_OPTIONS,
  buildAttendanceByStudentToday,
  buildBillingByStudent,
  getClassLabel,
  getCurrentYearMonth,
  getMonthBillingSignal,
  getSessionBillingModeLabel,
  getSessionPassColumnLabel,
  getTodayAttendanceSignal,
  studentHasWeekday,
} from './studentListHelpers';

const signalClass = (tone: 'ok' | 'warn' | 'muted') => {
  if (tone === 'ok') return 'text-emerald-700';
  if (tone === 'warn') return 'text-rose-600';
  return 'text-slate-400';
};

export const StudentListView: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const {
    selectedStudentId,
    setSelectedStudentId,
    selectedStudentDetailTab,
    setSelectedStudentDetailTab,
    setActiveTab,
  } = useApp();
  const refreshKey = useStorageRefresh([
    ...STORAGE_REFRESH_DOMAINS.students,
    ...STORAGE_REFRESH_DOMAINS.attendance,
    ...STORAGE_REFRESH_DOMAINS.finance,
    ...STORAGE_REFRESH_DOMAINS.sessionPasses,
    ...STORAGE_REFRESH_DOMAINS.classes,
  ]);
  const { industry } = usePermissions();
  const showPickupFields = getIndustryPlugin(industry).showPickupFields;
  const rosterList = getRosterListPresentation(industry);
  const showSessionColumns = rosterList.showSessionColumns;
  const labels = useModuleLabels();
  const { t } = useTerminology();
  const { t: termT } = useTenantTerms();
  const activeStatusLabel = t('customer.statusActive', '재원');
  const leaveStatusLabel = t('customer.statusPaused', '휴원');
  const endedLabel = t('customer.statusWithdrawn', rosterList.withdrawnLabel);
  const staffFilterName = rosterList.staffFilterLabel ?? labels.staff.singular;
  const controlMinClass = rosterList.controlMinHeight === 44 ? 'min-h-[44px]' : 'min-h-[36px]';
  const { isScoped, staffId, scopeStudents } = useStaffScope();

  const students = useMemo(
    () => scopeStudents(StudentService.getStudents()),
    [scopeStudents, refreshKey]
  );
  const teachers = rosterStorage.getTeachers();
  const classes = useMemo(
    () =>
      isScoped && staffId
        ? rosterStorage.getClasses().filter((c) => c.teacherId === staffId)
        : rosterStorage.getClasses(),
    [isScoped, staffId, refreshKey]
  );
  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [classes]);
  const classById = useMemo(() => {
    const map = new Map<string, any>(classes.map((c) => [c.id, c]));
    return map;
  }, [classes]);

  const today = todayIsoLocal();
  const yearMonth = getCurrentYearMonth();

  const todayAttendanceByStudent = useMemo(
    () => buildAttendanceByStudentToday(attendanceStorage.getAttendance(), today),
    [today, refreshKey]
  );
  const billingByStudent = useMemo(
    () => buildBillingByStudent(commerceStorage.getAllStudentsBillingSummary(yearMonth)),
    [yearMonth, refreshKey]
  );
  const sessionPasses = useMemo(
    () => (showSessionColumns ? ScheduleService.getSessionPasses() : []),
    [showSessionColumns, refreshKey]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [teacherFilterDraft, setTeacherFilterDraft] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [weekdayFilter, setWeekdayFilter] = useState<DayOfWeek | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [shuttleFilter, setShuttleFilter] = useState<'ALL' | 'SHUTTLE'>('ALL');
  const [sortBy, setSortBy] = useState<'joinDateDesc' | 'joinDateAsc' | 'name' | 'paymentDay'>(
    'joinDateDesc'
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkScheduleModalOpen, setIsBulkScheduleModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [inviteTargetStudents, setInviteTargetStudents] = useState<Student[]>([]);
  const [isInviteShareModalOpen, setIsInviteShareModalOpen] = useState(false);

  const handleOpenInviteShare = (student: Student, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setInviteTargetStudents([student]);
    setIsInviteShareModalOpen(true);
  };

  /** 스코프 강사는 담당만 — draft와 중복 저장하지 않음 */
  const teacherFilter = isScoped && staffId ? staffId : teacherFilterDraft;
  const setTeacherFilter = setTeacherFilterDraft;

  /** 상세 모달 대상은 selectedStudentId + students 파생 (동기화 effect 없음) */
  const selectedStudentsForBulk = useMemo(
    () => students.filter((s) => selectedIds.includes(s.id)),
    [students, selectedIds]
  );

  const detailStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [selectedStudentId, students]);

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (teacherFilter !== 'ALL' && s.teacherId !== teacherFilter) return false;
        if (classFilter !== 'ALL' && !(s.classIds || []).includes(classFilter)) return false;
        if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
        if (shuttleFilter === 'SHUTTLE' && !studentUsesShuttleService(s)) return false;
        if (weekdayFilter !== 'ALL' && !studentHasWeekday(s, weekdayFilter, classById)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (s.name || '').toLowerCase().includes(q);
          const matchGuardian = studentMatchesGuardianQuery(s.id, searchQuery);
          const matchLegacyParent =
            (s.parentName || '').toLowerCase().includes(q) ||
            (s.parentPhone || '').includes(searchQuery.trim());
          if (!matchName && !matchGuardian && !matchLegacyParent) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'joinDateDesc') return (b.joinDate || '').localeCompare(a.joinDate || '');
        if (sortBy === 'joinDateAsc') return (a.joinDate || '').localeCompare(b.joinDate || '');
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '', 'ko-KR');
        if (sortBy === 'paymentDay') return (a.paymentDay || 0) - (b.paymentDay || 0);
        return 0;
      });
  }, [
    students,
    searchQuery,
    teacherFilter,
    classFilter,
    statusFilter,
    shuttleFilter,
    weekdayFilter,
    sortBy,
    classById,
  ]);

  const activeCount = students.filter((s) => s.status === 'active').length;
  const leaveCount = students.filter((s) => s.status === 'leave').length;
  const withdrawnCount = students.filter((s) => s.status === 'withdrawn').length;
  const shuttleCount = students.filter((s) => studentUsesShuttleService(s)).length;

  const hasSearchOrExtraFilters =
    Boolean(searchQuery.trim()) ||
    teacherFilter !== 'ALL' ||
    classFilter !== 'ALL' ||
    weekdayFilter !== 'ALL' ||
    statusFilter !== 'active' ||
    shuttleFilter !== 'ALL';

  const advancedFilterCount = [
    !isScoped && teacherFilter !== 'ALL',
    classFilter !== 'ALL',
    weekdayFilter !== 'ALL',
    shuttleFilter !== 'ALL',
    sortBy !== 'joinDateDesc',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery('');
    setTeacherFilterDraft(isScoped && staffId ? staffId : 'ALL');
    setClassFilter('ALL');
    setWeekdayFilter('ALL');
    setStatusFilter('active');
    setShuttleFilter('ALL');
    setSortBy('joinDateDesc');
    setCurrentPage(1);
  };

  const handleOpenDetail = (student: Student) => setSelectedStudentId(student.id);

  const handleCloseDetail = () => {
    setSelectedStudentId(null);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setIsFormModalOpen(true);
    setSelectedStudentId(null);
  };

  const searchPlaceholder = rosterSearchPlaceholder(rosterList, labels.contact.singular);

  const advancedFilterColumns = [
    !isScoped,
    true, // 반
    true, // 요일
    showPickupFields, // 셔틀 — plugin(showPickupFields) 기준
    true, // 정렬
  ].filter(Boolean).length;

  const statusChips: Array<{ value: string; label: string; count: number }> = [
    { value: 'active', label: activeStatusLabel, count: activeCount },
    { value: 'leave', label: leaveStatusLabel, count: leaveCount },
    { value: 'withdrawn', label: endedLabel, count: withdrawnCount },
    { value: 'ALL', label: '전체', count: students.length },
  ];

  const isTrulyEmpty = students.length === 0;
  const isFilterEmpty = !isTrulyEmpty && filteredStudents.length === 0;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, teacherFilter, classFilter, weekdayFilter, statusFilter, shuttleFilter, sortBy]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);


  return (
    <div className={DENSITY.pageStack}>
      {/* 1. 상단 단일 헤더: 페이지 제목 + 우측 주요 액션 버튼 일원화 */}
      <PageHeader
        icon={<Users className="w-5 h-5 text-slate-700" strokeWidth={1.5} />}
        title={labels.customer.section || `${labels.customer.singular} 관리`}
        density="compact"
        actions={
          !isScoped ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => exportStudentsToCsv(filteredStudents, `${labels.customer.singular}명부_${getCurrentYearMonth()}.csv`)}
                className="px-3 py-1.5 min-h-[36px] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                title="현재 필터된 목록 엑셀 다운로드"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
                <span>엑셀 내보내기</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBulkImportOpen(true)}
                className="px-3 py-1.5 min-h-[36px] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
                <span>엑셀/CSV 가져오기</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingStudent(null);
                  setIsFormModalOpen(true);
                }}
                className="px-3.5 py-1.5 min-h-[36px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>신규 {labels.customer.singular} 등록</span>
              </button>
            </div>
          ) : undefined
        }
      />

      {/* 2. 압축된 검색 & 필터 바 (Toolbar): 상태 세그먼트 탭 + 인라인 검색창 + [필터] 버튼 */}
      <ListToolbar
        tabs={statusChips.map((c) => ({ key: c.value, label: c.label, count: c.count }))}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={searchPlaceholder}
        summaryText={
          <span>
            표시 중: <strong className="text-slate-900 font-semibold tabular-nums">{filteredStudents.length}명</strong>
            {statusFilter === 'active' && !hasSearchOrExtraFilters ? ` (${activeStatusLabel})` : ''}
          </span>
        }
        filterButton={{
          isOpen: showAdvancedFilters,
          onToggle: () => setShowAdvancedFilters((prev) => !prev),
          activeCount: advancedFilterCount,
          ariaLabel: rosterList.filterButtonAriaLabel,
          buttonLabel: '필터',
        }}
        extraActions={
          hasSearchOrExtraFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            >
              초기화
            </button>
          ) : null
        }
      >
        {/* 확장 상세 필터 패널 */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 ${
            rosterList.fitAdvancedFilterGrid
              ? advancedFilterColumns >= 5
                ? 'lg:grid-cols-5'
                : advancedFilterColumns === 4
                  ? 'lg:grid-cols-4'
                  : 'lg:grid-cols-3'
              : 'lg:grid-cols-5'
          }`}
        >
          {!isScoped && (
            <label className="block min-w-0 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 px-0.5">{staffFilterName}</span>
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 min-h-[36px] text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                aria-label={staffFilterName}
              >
                <option value="ALL">{staffFilterName} 전체</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block min-w-0 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 px-0.5">{labels.service.singular}</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 min-h-[36px] text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
              aria-label={labels.service.singular}
            >
              <option value="ALL">반 전체</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 px-0.5">요일</span>
            <select
              value={weekdayFilter}
              onChange={(e) => setWeekdayFilter(e.target.value as DayOfWeek | 'ALL')}
              className="w-full px-2.5 py-1.5 min-h-[36px] text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
              aria-label="요일"
            >
              <option value="ALL">요일 전체</option>
              {WEEKDAY_FILTER_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}요일
                </option>
              ))}
            </select>
          </label>

          {showPickupFields && (
            <label className="block min-w-0 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 px-0.5">셔틀</span>
              <select
                value={shuttleFilter}
                onChange={(e) => setShuttleFilter(e.target.value as 'ALL' | 'SHUTTLE')}
                className="w-full px-2.5 py-1.5 min-h-[36px] text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-medium"
                aria-label="셔틀"
              >
                <option value="ALL">셔틀 전체</option>
                <option value="SHUTTLE">셔틀 이용 ({shuttleCount})</option>
              </select>
            </label>
          )}

          <label className="block min-w-0 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 px-0.5">정렬</span>
            <div className="flex items-center gap-1.5 px-2.5 min-h-[36px] bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.5} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-transparent w-full text-xs focus:outline-none cursor-pointer"
                aria-label="정렬"
              >
                <option value="joinDateDesc">등록일 최신순</option>
                <option value="joinDateAsc">등록일 과거순</option>
                <option value="name">이름 가나다순</option>
                <option value="paymentDay">수납일순</option>
              </select>
            </div>
          </label>
        </div>
      </ListToolbar>

      {/* 3. Empty State (단정하고 컴팩트한 안내) */}
      {isTrulyEmpty ? (
        <EmptyState
          icon={<Users className="w-6 h-6 text-slate-500" strokeWidth={1.5} />}
          title={`등록된 ${labels.customer.singular}이 없습니다`}
          description={`신규 ${labels.customer.singular}을 등록하고 ${termT('lesson', '수업')} 배정, 출결, ${termT('pass', '이용권')} 관리를 시작하세요.`}
          action={
            !isScoped ? (
              <button
                type="button"
                onClick={() => {
                  setEditingStudent(null);
                  setIsFormModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>+ {labels.customer.singular} 등록</span>
              </button>
            ) : undefined
          }
        />
      ) : isFilterEmpty ? (
        <EmptyState
          icon={<Users className="w-6 h-6 text-slate-400" strokeWidth={1.5} />}
          title={`조건에 맞는 ${labels.customer.singular}이 없습니다`}
          description={rosterFilterEmptyDescription(rosterList, labels.customer.singular)}
          action={
            <button
              type="button"
              onClick={resetFilters}
              className="px-3.5 py-1.5 min-h-[36px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              필터 초기화
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop: compact columns */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        aria-label="전체 선택"
                        checked={paginatedStudents.length > 0 && paginatedStudents.every((s) => selectedIds.includes(s.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newIds = Array.from(new Set([...selectedIds, ...paginatedStudents.map((s) => s.id)]));
                            setSelectedIds(newIds);
                          } else {
                            const pageSet = new Set(paginatedStudents.map((s) => s.id));
                            setSelectedIds(selectedIds.filter((id) => !pageSet.has(id)));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer align-middle"
                      />
                    </th>
                    <th className="py-2.5 px-3">{labels.customer.singular}</th>
                    <th className="py-2.5 px-3">{labels.service.singular}</th>
                    <th className="py-2.5 px-3">담당</th>
                    {showSessionColumns && <th className="py-2.5 px-3">{enrollmentModeLabel(industry)}</th>}
                    {showSessionColumns && <th className="py-2.5 px-3">회차권</th>}
                    <th className="py-2.5 px-3">오늘 출결</th>
                    <th className="py-2.5 px-3">이번 달 수납</th>
                    <th className="py-2.5 px-3 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStudents.map((st) => {
                    const badge = getStudentStatusBadge(st.status);
                    const att = getTodayAttendanceSignal(st.id, todayAttendanceByStudent);
                    const bill = getMonthBillingSignal(billingByStudent.get(st.id));
                    const billingModeLabel = showSessionColumns ? getSessionBillingModeLabel(st) : '';
                    const passLabel = showSessionColumns
                      ? getSessionPassColumnLabel(st.id, sessionPasses)
                      : '';
                    return (
                      <tr
                        key={st.id}
                        onClick={() => handleOpenDetail(st)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`${st.name} 선택`}
                            checked={selectedIds.includes(st.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedIds((prev) =>
                                prev.includes(st.id) ? prev.filter((id) => id !== st.id) : [...prev, st.id]
                              );
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer align-middle"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0"
                              style={{ backgroundColor: st.avatarColor || '#4f46e5' }}
                            >
                              {(st.name || '?').slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 group-hover:text-indigo-600">
                                  {st.name}
                                </span>
                                {st.status !== 'active' && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${badge.bg}`}
                                  >
                                    {st.status === 'withdrawn' && endedLabel !== badge.label ? endedLabel : badge.label}
                                  </span>
                                )}
                                {showPickupFields && studentUsesShuttleService(st) && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold inline-flex items-center gap-0.5">
                                    <Bus className="w-3 h-3" />
                                    셔틀
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium truncate max-w-[10rem]">
                          {getClassLabel(st, classNameById)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {st.teacherName || '-'}
                        </td>
                        {showSessionColumns && (
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                billingModeLabel === '회차권'
                                  ? 'bg-violet-50 text-violet-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {billingModeLabel}
                            </span>
                          </td>
                        )}
                        {showSessionColumns && (
                          <td
                            className={`py-2.5 px-3 font-bold ${
                              passLabel === '해당 없음' ? 'text-slate-400' : 'text-indigo-700'
                            }`}
                          >
                            {passLabel}
                          </td>
                        )}
                        <td className={`py-2.5 px-3 font-bold ${signalClass(att.tone)}`}>
                          {att.label}
                        </td>
                        <td className={`py-2.5 px-3 font-bold ${signalClass(bill.tone)}`}>
                          {bill.label}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleOpenInviteShare(st, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                              title="학부모 앱 초대장 복사/공유"
                              aria-label="학부모 초대"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 inline-block" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: compact cards */}
          <div className="md:hidden space-y-2">
            {paginatedStudents.map((st) => {
              const badge = getStudentStatusBadge(st.status);
              const att = getTodayAttendanceSignal(st.id, todayAttendanceByStudent);
              const bill = getMonthBillingSignal(billingByStudent.get(st.id));
              const guardian = getPrimaryGuardian(st.id);
              const billingModeLabel = showSessionColumns ? getSessionBillingModeLabel(st) : '';
              const passLabel = showSessionColumns
                ? getSessionPassColumnLabel(st.id, sessionPasses)
                : '';
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleOpenDetail(st)}
                  className="w-full text-left bg-white p-3 rounded-xl border border-slate-200 shadow-2xs active:bg-slate-50 transition-colors space-y-2 min-h-[44px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl text-white font-extrabold text-sm flex items-center justify-center shrink-0"
                        style={{ backgroundColor: st.avatarColor || '#4f46e5' }}
                      >
                        {(st.name || '?').slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900">{st.name}</h4>
                          {st.status !== 'active' && (
                            <span
                              className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${badge.bg}`}
                            >
                              {st.status === 'withdrawn' && endedLabel !== badge.label ? endedLabel : badge.label}
                            </span>
                          )}
                          {showSessionColumns && (
                            <span
                              className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${
                                billingModeLabel === '회차권'
                                  ? 'bg-violet-50 text-violet-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {billingModeLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {getClassLabel(st, classNameById)}
                          {st.teacherName ? ` · ${st.teacherName}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleOpenInviteShare(st, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="학부모 앱 초대장 복사/공유"
                          aria-label="학부모 초대"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] font-bold">
                    <span className={signalClass(att.tone)}>출결 {att.label}</span>
                    {showSessionColumns && (
                      <span
                        className={
                          passLabel === '해당 없음' ? 'text-slate-400' : 'text-indigo-700'
                        }
                      >
                        {passLabel}
                      </span>
                    )}
                    <span className={signalClass(bill.tone)}>{bill.label}</span>
                  </div>
                  {guardian?.parentName && (
                    <p className="text-[10px] text-slate-400 truncate">
                      {labels.contact.singular} {guardian.parentName}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <PaginationBar
            currentPage={currentPage}
            totalItems={filteredStudents.length}
            pageSize={pageSize}
            pageSizeOptions={[15, 30, 50]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </>
      )}

      <StudentFormModal
        student={editingStudent}
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingStudent(null);
        }}
        onSaved={(saved, options) => {
          setSelectedStudentId(saved.id);
          if (options?.openTab) {
            setSelectedStudentDetailTab(options.openTab);
          }
        }}
      />

      <StudentDetailModal
        student={detailStudent}
        isOpen={Boolean(detailStudent)}
        onClose={handleCloseDetail}
        onEdit={handleOpenEdit}
        initialTab={selectedStudentDetailTab || undefined}
        onInitialTabApplied={() => setSelectedStudentDetailTab(null)}
      />

      <StudentBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onCompleted={() => setIsBulkImportOpen(false)}
      />
      <BulkActionToolbar
        selectedCount={selectedIds.length}
        totalCount={filteredStudents.length}
        itemName={labels.customer.singular}
        onClearSelection={() => setSelectedIds([])}
        actions={[
          {
            key: 'parent_invite',
            label: '선택 학부모 초대장 생성',
            icon: <Share2 className="w-4 h-4" />,
            onClick: () => {
              setInviteTargetStudents(selectedStudentsForBulk);
              setIsInviteShareModalOpen(true);
            },
          },
          {
            key: 'schedule_assign',
            label: '시간표 일괄 배정',
            icon: <CalendarClock className="w-4 h-4" />,
            variant: 'primary',
            onClick: () => setIsBulkScheduleModalOpen(true),
          },
          {
            key: 'export_selected',
            label: '선택 엑셀 내보내기',
            icon: <Download className="w-4 h-4" />,
            onClick: () => {
              exportStudentsToCsv(
                selectedStudentsForBulk,
                `${labels.customer.singular}_선택내보내기_${getCurrentYearMonth()}.csv`
              );
            },
          },
        ]}
      />
      <BulkScheduleAssignModal
        isOpen={isBulkScheduleModalOpen}
        onClose={() => setIsBulkScheduleModalOpen(false)}
        selectedStudents={selectedStudentsForBulk}
        onAssigned={(msg) => {
          showToast(msg, 'success');
          setSelectedIds([]);
        }}
        onNavigateToTimetable={() => setActiveTab('classes')}
      />
      <ParentInviteShareModal
        isOpen={isInviteShareModalOpen}
        onClose={() => {
          setIsInviteShareModalOpen(false);
          setInviteTargetStudents([]);
        }}
        students={inviteTargetStudents}
      />
    </div>
  );
};
