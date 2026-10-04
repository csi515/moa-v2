import React, { useState, useMemo } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { getIndustryPlugin } from '@/core/industry/registry';
import { isSkinClinicIndustry } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { studentUsesShuttleService } from '@/core/transport';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { STORAGE_REFRESH_DOMAINS } from '@/hooks/useStorageRefresh';
import { getPrimaryGuardian, studentMatchesGuardianQuery } from '@/core/parent/guardianHelpers';
import { StorageService } from '@/services/storage';
import { StudentService } from '@/core/students';
import { ScheduleService } from '@/core/services/scheduleService';
import type { DayOfWeek, Student } from '@/types';
import { todayIsoLocal } from '@/shared/utils/localDate';
import { enrollmentModeLabel } from './form/enrollmentFormCopy';
import { StudentFormModal } from './StudentFormModal';
import { StudentDetailModal } from './StudentDetailModal';
import { getStudentStatusBadge } from '@/utils/formatters';
import { FilterBar, SearchField, EmptyState } from '@/shared/components';
import { DENSITY } from '@/shared/styles/density';
import {
  Users,
  UserPlus,
  ArrowUpDown,
  ChevronRight,
  Bus,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import { StudentBulkImportModal } from './StudentBulkImportModal';
import {
  WEEKDAY_FILTER_OPTIONS,
  buildAttendanceByStudentToday,
  buildBillingByStudent,
  getClassLabel,
  getCurrentYearMonth,
  getMonthBillingSignal,
  getPianoBillingModeLabel,
  getPianoSessionPassColumnLabel,
  getTodayAttendanceSignal,
  studentHasWeekday,
} from './studentListHelpers';

const signalClass = (tone: 'ok' | 'warn' | 'muted') => {
  if (tone === 'ok') return 'text-emerald-700';
  if (tone === 'warn') return 'text-rose-600';
  return 'text-slate-400';
};

export const StudentListView: React.FC = () => {
  const {
    selectedStudentId,
    setSelectedStudentId,
    selectedStudentDetailTab,
    setSelectedStudentDetailTab,
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
  const labels = useModuleLabels();
  const skin = isSkinClinicIndustry(industry);
  const isPiano = industry === 'piano';
  const endedLabel = skin ? '종료' : '퇴원';
  const { isScoped, staffId, scopeStudents } = useStaffScope();

  const students = useMemo(
    () => scopeStudents(StudentService.getStudents()),
    [scopeStudents, refreshKey]
  );
  const teachers = StorageService.getTeachers();
  const classes = useMemo(
    () =>
      isScoped && staffId
        ? StorageService.getClasses().filter((c) => c.teacherId === staffId)
        : StorageService.getClasses(),
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
    () => buildAttendanceByStudentToday(StorageService.getAttendance(), today),
    [today, refreshKey]
  );
  const billingByStudent = useMemo(
    () => buildBillingByStudent(StorageService.getAllStudentsBillingSummary(yearMonth)),
    [yearMonth, refreshKey]
  );
  const sessionPasses = useMemo(
    () => (isPiano ? ScheduleService.getSessionPasses() : []),
    [isPiano, refreshKey]
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
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  /** 스코프 강사는 담당만 — draft와 중복 저장하지 않음 */
  const teacherFilter = isScoped && staffId ? staffId : teacherFilterDraft;
  const setTeacherFilter = setTeacherFilterDraft;

  /** 상세 모달 대상은 selectedStudentId + students 파생 (동기화 effect 없음) */
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

  const searchPlaceholder = isPiano
    ? '학생·학부모 이름 또는 전화번호'
    : `이름 · ${labels.contact.singular} · ${labels.contact.singular} 전화`;

  const advancedFilterColumns = [
    !isScoped,
    true, // 반
    true, // 요일
    showPickupFields, // 셔틀 — plugin(showPickupFields) 기준
    true, // 정렬
  ].filter(Boolean).length;

  const statusChips: Array<{ value: string; label: string; count: number }> = [
    { value: 'active', label: '재원', count: activeCount },
    { value: 'leave', label: '휴원', count: leaveCount },
    { value: 'withdrawn', label: endedLabel, count: withdrawnCount },
    { value: 'ALL', label: '전체', count: students.length },
  ];

  const isTrulyEmpty = students.length === 0;
  const isFilterEmpty = !isTrulyEmpty && filteredStudents.length === 0;

  return (
    <div className={DENSITY.pageStack}>
      {!isScoped && (
        <div className="flex justify-end gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsBulkImportOpen(true)}
            className="px-4 py-2.5 min-h-[44px] bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            엑셀/CSV 가져오기
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingStudent(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            {labels.customer.add}
          </button>
        </div>
      )}

      <FilterBar className="flex-col items-stretch gap-3">
        {/* 기본: 이름 검색 + 재원/휴원/퇴원(전체)만 노출 */}
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={searchPlaceholder}
          className="w-full"
        />

        <div className="flex flex-wrap items-center gap-2">
          {statusChips.map((chip) => {
            const isActive = statusFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatusFilter(chip.value)}
                className={`${
                  isPiano ? 'min-h-[44px]' : 'min-h-[36px]'
                } px-3 rounded-lg text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {chip.label} {chip.count}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={`${
              isPiano ? 'min-h-[44px]' : 'min-h-[36px]'
            } ml-auto px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
              showAdvancedFilters || advancedFilterCount > 0
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            aria-expanded={showAdvancedFilters}
            aria-label={
              isPiano
                ? '추가 필터 (담당 선생님, 반, 요일, 정렬)'
                : '추가 필터'
            }
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            필터
            {advancedFilterCount > 0 && (
              <span className="bg-white/20 px-1.5 rounded-md">{advancedFilterCount}</span>
            )}
          </button>
        </div>

        {showAdvancedFilters && (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 ${
              isPiano
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
                {isPiano ? (
                  <span className="text-[10px] font-bold text-slate-500 px-0.5">담당 선생님</span>
                ) : null}
                <select
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                  className="w-full px-3 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  aria-label={isPiano ? '담당 선생님' : labels.staff.singular}
                >
                  <option value="ALL">
                    {isPiano ? '담당 선생님 전체' : `${labels.staff.singular} 전체`}
                  </option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block min-w-0 space-y-1">
              {isPiano ? (
                <span className="text-[10px] font-bold text-slate-500 px-0.5">반</span>
              ) : null}
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full px-3 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                aria-label={isPiano ? '반' : labels.service.singular}
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
              {isPiano ? (
                <span className="text-[10px] font-bold text-slate-500 px-0.5">요일</span>
              ) : null}
              <select
                value={weekdayFilter}
                onChange={(e) => setWeekdayFilter(e.target.value as DayOfWeek | 'ALL')}
                className="w-full px-3 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
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
                <select
                  value={shuttleFilter}
                  onChange={(e) => setShuttleFilter(e.target.value as 'ALL' | 'SHUTTLE')}
                  className="w-full px-3 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-semibold"
                  aria-label="셔틀"
                >
                  <option value="ALL">셔틀 전체</option>
                  <option value="SHUTTLE">셔틀 이용 ({shuttleCount})</option>
                </select>
              </label>
            )}

            <label className="block min-w-0 space-y-1">
              {isPiano ? (
                <span className="text-[10px] font-bold text-slate-500 px-0.5">정렬</span>
              ) : null}
              <div className="flex items-center gap-1.5 px-3 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent w-full font-semibold focus:outline-none cursor-pointer"
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
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 w-full">
          <span>
            표시 중:{' '}
            <strong className="text-slate-800">{filteredStudents.length}명</strong>
            {statusFilter === 'active' && !hasSearchOrExtraFilters ? ' (재원)' : ''}
          </span>
          {hasSearchOrExtraFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="font-bold text-indigo-600 hover:text-indigo-700 min-h-[44px]"
            >
              초기화
            </button>
          )}
        </div>
      </FilterBar>

      {isTrulyEmpty ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title={`등록된 ${labels.customer.singular}이 없습니다`}
          description={`상단 '${labels.customer.add}'으로 첫 ${labels.customer.singular}을 등록하세요.`}
          action={
            !isScoped ? (
              <button
                type="button"
                onClick={() => {
                  setEditingStudent(null);
                  setIsFormModalOpen(true);
                }}
                className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl"
              >
                {labels.customer.add}
              </button>
            ) : undefined
          }
        />
      ) : isFilterEmpty ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title={`조건에 맞는 ${labels.customer.singular}이 없습니다`}
          description={
            skin
              ? `검색어나 필터를 바꿔보세요. 종료 ${labels.customer.singular}은 ‘종료’ 또는 ‘전체’에서 볼 수 있습니다.`
              : `${endedLabel} 상태의 ${labels.customer.singular}은 ‘${endedLabel}’ 또는 ‘전체’ 필터에서 볼 수 있습니다.`
          }
          action={
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl"
            >
              필터 초기화
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop: compact columns */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">{labels.customer.singular}</th>
                    <th className="py-2.5 px-3">{isPiano ? '반' : labels.service.singular}</th>
                    <th className="py-2.5 px-3">담당</th>
                    {isPiano && <th className="py-2.5 px-3">{enrollmentModeLabel(industry)}</th>}
                    {isPiano && <th className="py-2.5 px-3">회차권</th>}
                    <th className="py-2.5 px-3">오늘 출결</th>
                    <th className="py-2.5 px-3">이번 달 수납</th>
                    <th className="py-2.5 px-3 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((st) => {
                    const badge = getStudentStatusBadge(st.status);
                    const att = getTodayAttendanceSignal(st.id, todayAttendanceByStudent);
                    const bill = getMonthBillingSignal(billingByStudent.get(st.id));
                    const billingModeLabel = isPiano ? getPianoBillingModeLabel(st) : '';
                    const passLabel = isPiano
                      ? getPianoSessionPassColumnLabel(st.id, sessionPasses)
                      : '';
                    return (
                      <tr
                        key={st.id}
                        onClick={() => handleOpenDetail(st)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      >
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
                                    {skin && st.status === 'withdrawn' ? endedLabel : badge.label}
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
                        {isPiano && (
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
                        {isPiano && (
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
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 inline-block" />
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
            {filteredStudents.map((st) => {
              const badge = getStudentStatusBadge(st.status);
              const att = getTodayAttendanceSignal(st.id, todayAttendanceByStudent);
              const bill = getMonthBillingSignal(billingByStudent.get(st.id));
              const guardian = getPrimaryGuardian(st.id);
              const billingModeLabel = isPiano ? getPianoBillingModeLabel(st) : '';
              const passLabel = isPiano
                ? getPianoSessionPassColumnLabel(st.id, sessionPasses)
                : '';
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleOpenDetail(st)}
                  className="w-full text-left bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs active:bg-slate-50 transition-all space-y-2 min-h-[44px]"
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
                              {skin && st.status === 'withdrawn' ? endedLabel : badge.label}
                            </span>
                          )}
                          {isPiano && (
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
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] font-bold">
                    <span className={signalClass(att.tone)}>출결 {att.label}</span>
                    {isPiano && (
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
    </div>
  );
};
