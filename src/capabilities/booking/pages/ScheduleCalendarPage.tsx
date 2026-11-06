import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useList } from '@refinedev/core';
import { StorageService } from '@/services/storage';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Check,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import {
  SegmentedControl,
  Modal,
  FormField,
  FORM_CONTROL_CLASS,
} from '@/shared/components';
import {
  UnifiedScheduleCalendar,
  type CalendarEventItem,
  type CalendarSlotTarget,
  type CalendarViewMode,
} from '@/shared/components/calendar';
import { showToast } from '@/shared/feedback/uiFeedback';
export type DayOfWeek = '월' | '화' | '수' | '목' | '금' | '토' | '일';

export interface ClassItem {
  id: string;
  name: string;
  teacherId?: string;
  teacherName?: string;
  room?: string;
  daysOfWeek: DayOfWeek[];
  startTime: string;
  endTime?: string;
  capacity?: number;
  color?: string;
}

export interface Student {
  id: string;
  name: string;
  status: 'active' | 'leave' | 'withdrawn' | string;
  phone?: string;
  grade?: string;
  classIds?: string[];
}

const VIEW_OPTIONS: Array<{ value: CalendarViewMode; label: string }> = [
  { value: 'month', label: '월간' },
  { value: 'week', label: '주간' },
  { value: 'day', label: '일간' },
];

const DAY_MAP_KO: Record<number, DayOfWeek> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

function formatIsoYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoYmd(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function ScheduleCalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. 상태와 URL 동기화 (?view=week&date=YYYY-MM-DD&memberId=...)
  const viewParam = searchParams.get('view') as CalendarViewMode | null;
  const currentView: CalendarViewMode =
    viewParam === 'month' || viewParam === 'week' || viewParam === 'day'
      ? viewParam
      : 'week';

  const dateParam = searchParams.get('date');
  const currentDate = useMemo(() => {
    return dateParam ? parseIsoYmd(dateParam) : new Date();
  }, [dateParam]);

  const selectedMemberId = searchParams.get('memberId') || '';

  const updateUrlParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, val] of Object.entries(patch)) {
            if (val === null || val === undefined || val === '') {
              next.delete(key);
            } else {
              next.set(key, val);
            }
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const handleViewChange = (nextView: CalendarViewMode) => {
    updateUrlParams({ view: nextView });
  };

  const handleDateChange = (nextDate: Date) => {
    updateUrlParams({ date: formatIsoYmd(nextDate) });
  };

  const handleSelectMember = (memberId: string) => {
    if (selectedMemberId === memberId) {
      // 재클릭 시 필터 해제
      updateUrlParams({ memberId: null });
    } else {
      updateUrlParams({ memberId });
    }
  };

  const handleClearMemberFilter = () => {
    updateUrlParams({ memberId: null });
  };

  // 2. Refine useList 활용 (선언적 데이터 계층 및 로컬 스토리지 폴백 보장)
  const customersList = useList<any>({
    resource: 'customers',
    filters: [
      {
        field: 'status',
        operator: 'eq',
        value: 'active',
      },
    ],
    pagination: { mode: 'off' },
  });

  const classesList = useList<any>({
    resource: 'classes',
    pagination: { mode: 'off' },
  });

  const isLoadingCustomers =
    (customersList as any).isLoading || (customersList as any).query?.isLoading;
  const isLoadingClasses =
    (classesList as any).isLoading || (classesList as any).query?.isLoading;

  // 회원 목록: Refine 응답 우선 + StorageService 폴백
  const activeMembers: Student[] = useMemo(() => {
    const rawRefine =
      (customersList as any).data?.data || (customersList as any).query?.data?.data;
    if (rawRefine && rawRefine.length > 0) {
      return rawRefine.filter((c: any) => c.status === 'active');
    }
    return StorageService.getStudents().filter((s) => s.status === 'active');
  }, [customersList]);

  // 수업 목록: Refine 응답 우선 + StorageService 폴백
  const allClasses: ClassItem[] = useMemo(() => {
    const rawRefine =
      (classesList as any).data?.data || (classesList as any).query?.data?.data;
    if (rawRefine && rawRefine.length > 0) {
      return rawRefine as ClassItem[];
    }
    return StorageService.getClasses();
  }, [classesList]);

  const teachers = useMemo(() => StorageService.getTeachers(), []);

  // 우측 패널 회원 검색어 상태
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return activeMembers;
    const q = memberSearchQuery.trim().toLowerCase();
    return activeMembers.filter((m) => m.name.toLowerCase().includes(q));
  }, [activeMembers, memberSearchQuery]);

  // 선택된 회원 정보
  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return activeMembers.find((m) => m.id === selectedMemberId) || null;
  }, [activeMembers, selectedMemberId]);

  // 3. 캘린더 이벤트 매핑 (회원 필터 적용)
  const calendarEvents = useMemo(() => {
    const events: CalendarEventItem<{
      classItem: ClassItem;
      enrolledStudents: Student[];
    }>[] = [];

    // 기준 날짜를 중심으로 전후 45일 범위의 일자 생성 (월간/주간/일간 뷰 커버)
    const base = new Date(currentDate);
    const startRange = new Date(base);
    startRange.setDate(startRange.getDate() - 35);
    const endRange = new Date(base);
    endRange.setDate(endRange.getDate() + 35);

    const cur = new Date(startRange);
    while (cur <= endRange) {
      const ymd = formatIsoYmd(cur);
      const dayKo = DAY_MAP_KO[cur.getDay()];

      for (const cls of allClasses) {
        if (!cls.daysOfWeek?.includes(dayKo)) continue;

        // 해당 수업에 등록된 활성 회원 추출
        const enrolled = activeMembers.filter(
          (s) => s.classIds && s.classIds.includes(cls.id)
        );

        // 특정 회원 필터 활성화 시, 해당 회원이 참여하는 수업만 필터링
        if (selectedMemberId) {
          const isEnrolled = enrolled.some((s) => s.id === selectedMemberId);
          if (!isEnrolled) continue;
        }

        events.push({
          id: `${cls.id}_${ymd}`,
          title: cls.name,
          subtitle: `${cls.teacherName || '강사 미지정'} · ${cls.room || '강의실'}`,
          date: ymd,
          dayOfWeek: dayKo,
          startTime: cls.startTime,
          endTime: cls.endTime || '18:00',
          colorTheme: (cls.color as any) || 'indigo',
          capacity: {
            current: enrolled.length,
            max: cls.capacity || 6,
          },
          raw: {
            classItem: cls,
            enrolledStudents: enrolled,
          },
        });
      }

      cur.setDate(cur.getDate() + 1);
    }

    return events;
  }, [allClasses, activeMembers, currentDate, selectedMemberId]);

  // 4. 간이 신규 일정 생성 모달 상태
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newTeacherId, setNewTeacherId] = useState('');
  const [newRoom, setNewRoom] = useState('1강의실');
  const [newDayOfWeek, setNewDayOfWeek] = useState<DayOfWeek>('월');
  const [newStartTime, setNewStartTime] = useState('14:00');
  const [newEndTime, setNewEndTime] = useState('15:00');
  const [newCapacity, setNewCapacity] = useState(6);
  const [selectedStudentIdsForNew, setSelectedStudentIdsForNew] = useState<string[]>([]);

  const handleOpenCreateModal = (target?: CalendarSlotTarget) => {
    if (target?.dayOfWeek) {
      setNewDayOfWeek(target.dayOfWeek);
    } else if (target?.date) {
      const d = parseIsoYmd(target.date);
      setNewDayOfWeek(DAY_MAP_KO[d.getDay()] || '월');
    }
    if (target?.startTime) {
      setNewStartTime(target.startTime);
      const [h, m] = target.startTime.split(':').map(Number);
      const endH = String((h + 1) % 24).padStart(2, '0');
      setNewEndTime(`${endH}:${String(m).padStart(2, '0')}`);
    }
    setNewClassName('');
    setNewTeacherId(teachers[0]?.id || '');
    setSelectedStudentIdsForNew(selectedMemberId ? [selectedMemberId] : []);
    setCreateModalOpen(true);
  };

  const handleSaveNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      showToast('수업명을 입력해주세요.', 'warning');
      return;
    }

    const teacher = teachers.find((t) => t.id === newTeacherId);
    const newClass: ClassItem = {
      id: `cls_${Date.now()}`,
      name: newClassName.trim(),
      teacherId: newTeacherId,
      teacherName: teacher?.name || '강사 미지정',
      room: newRoom.trim() || '강의실',
      daysOfWeek: [newDayOfWeek],
      startTime: newStartTime,
      endTime: newEndTime,
      capacity: newCapacity,
      color: '#4f46e5',
    };

    StorageService.saveClass(newClass);

    // 선택된 학생들에게 classId 배정
    if (selectedStudentIdsForNew.length > 0) {
      const allStudents = StorageService.getStudents();
      for (const s of allStudents) {
        if (selectedStudentIdsForNew.includes(s.id)) {
          const currentClasses = s.classIds || [];
          if (!currentClasses.includes(newClass.id)) {
            StorageService.saveStudent({
              ...s,
              classIds: [...currentClasses, newClass.id],
            });
          }
        }
      }
    }

    showToast(`'${newClass.name}' 수업이 성공적으로 등록되었습니다.`, 'success');
    setCreateModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-6">
      {/* 상단 타이틀 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                일정 및 수업 시간표
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                월간/주간/일간 시간표 관리 및 활성 회원별 스케줄을 즉시 필터링합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <SegmentedControl
            value={currentView}
            options={VIEW_OPTIONS}
            onChange={handleViewChange}
            aria-label="캘린더 뷰 전환"
            className="shadow-2xs"
          />

          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>수업 개설</span>
          </button>
        </div>
      </div>

      {/* 모바일 전용: 상단 가로 스크롤 활성 회원 칩 목록 */}
      <div className="lg:hidden bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            활성 회원 퀵 필터 ({activeMembers.length}명)
          </span>
          {selectedMemberId && (
            <button
              type="button"
              onClick={handleClearMemberFilter}
              className="text-indigo-600 font-bold hover:underline"
            >
              전체 보기
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={handleClearMemberFilter}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              !selectedMemberId
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            전체 보기
          </button>
          {activeMembers.map((m) => {
            const isSelected = m.id === selectedMemberId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMember(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{m.name}</span>
                {isSelected && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 회원 필터 활성화 알림 배너 */}
      {selectedMember && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/90 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-indigo-950 font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <span>
              <strong>{selectedMember.name}</strong> 원생의 일정만 캘린더에 표시 중입니다.
              (총 {calendarEvents.length}개 일정)
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearMemberFilter}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>필터 해제 (전체 보기)</span>
          </button>
        </div>
      )}

      {/* 메인 2분할(Split) 레이아웃: 좌측 메인 캘린더 (72~75%) + 우측 회원 필터 패널 (25~28%) */}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        {/* 좌측 캘린더 영역 */}
        <div className="flex-1 min-w-0 w-full bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs">
          <UnifiedScheduleCalendar
            mode="appointment_timeline"
            currentDate={currentDate}
            onDateChange={handleDateChange}
            currentView={currentView}
            onViewChange={handleViewChange}
            availableViews={['month', 'week', 'day']}
            timeConfig={{
              startHour: 9,
              endHour: 22,
              slotInterval: 30,
            }}
            events={calendarEvents}
            onSlotClick={(slot) => handleOpenCreateModal(slot)}
            renderEventCard={(event) => {
              const { classItem, enrolledStudents } = event.raw;
              const isFilteredTarget =
                selectedMemberId &&
                enrolledStudents.some((s: any) => s.id === selectedMemberId);

              return (
                <div
                  className={`h-full rounded-xl p-2 text-xs flex flex-col justify-between transition-all border ${
                    isFilteredTarget
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400'
                      : 'bg-white text-slate-800 border-slate-200/90 shadow-2xs hover:border-indigo-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-black truncate text-xs sm:text-sm">
                        {event.title}
                      </p>
                      {event.capacity && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 tabular-nums ${
                            isFilteredTarget
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {event.capacity.current}/{event.capacity.max}명
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] truncate mt-0.5 ${
                        isFilteredTarget ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                    >
                      {event.subtitle}
                    </p>
                  </div>

                  <div
                    className={`mt-1.5 pt-1 border-t text-[10px] truncate ${
                      isFilteredTarget
                        ? 'border-white/20 text-indigo-100'
                        : 'border-slate-100 text-slate-600'
                    }`}
                  >
                    <span className="font-semibold">참여: </span>
                    {enrolledStudents.length > 0
                      ? enrolledStudents.map((s: any) => s.name).join(', ')
                      : '배치된 회원 없음'}
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* 우측 활성 회원 필터 패널 (데스크톱 25~28%) */}
        <aside className="hidden lg:flex w-72 xl:w-80 shrink-0 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex-col space-y-3.5 sticky top-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-black text-slate-900">활성 회원 필터</h2>
                <p className="text-[11px] text-slate-400">클릭하여 회원별 일정 조회</p>
              </div>
            </div>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {activeMembers.length}명
            </span>
          </div>

          {/* 검색 인풋 */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="회원 이름 검색..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[38px]"
            />
            {memberSearchQuery && (
              <button
                type="button"
                onClick={() => setMemberSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* [전체 보기] 기본 버튼 */}
          <button
            type="button"
            onClick={handleClearMemberFilter}
            className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer min-h-[42px] ${
              !selectedMemberId
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              전체 일정 보기
            </span>
            <span className="text-[11px] opacity-80">전체</span>
          </button>

          {/* 회원 목록 */}
          <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
            {isLoadingCustomers ? (
              <p className="text-xs text-slate-400 text-center py-6">회원 목록 로딩 중...</p>
            ) : filteredMembers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                검색된 활성 회원이 없습니다.
              </p>
            ) : (
              filteredMembers.map((member) => {
                const isSelected = member.id === selectedMemberId;
                const enrolledClassesCount = (member.classIds || []).length;

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelectMember(member.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer min-h-[46px] ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                        : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {member.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs truncate">{member.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {member.phone || member.grade || '일반 회원'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                        수업 {enrolledClassesCount}개
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* 수업 개설 간이 모달 */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="새 수업 일정 개설"
        maxWidth="md"
      >
        <form onSubmit={handleSaveNewClass} className="space-y-4 p-5">
          <FormField label="수업명" required>
            <input
              type="text"
              placeholder="예: 초등 피아노 기초반"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              className={FORM_CONTROL_CLASS}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="담당 선생님" required>
              <select
                value={newTeacherId}
                onChange={(e) => setNewTeacherId(e.target.value)}
                className={FORM_CONTROL_CLASS}
                required
              >
                <option value="">선택</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="강의실/공간">
              <input
                type="text"
                placeholder="예: 1강의실"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                className={FORM_CONTROL_CLASS}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <FormField label="요일" required>
              <select
                value={newDayOfWeek}
                onChange={(e) => setNewDayOfWeek(e.target.value as DayOfWeek)}
                className={FORM_CONTROL_CLASS}
              >
                {(['월', '화', '수', '목', '금', '토'] as DayOfWeek[]).map((d) => (
                  <option key={d} value={d}>
                    {d}요일
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="시작 시간" required>
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className={FORM_CONTROL_CLASS}
                required
              />
            </FormField>

            <FormField label="종료 시간" required>
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className={FORM_CONTROL_CLASS}
                required
              />
            </FormField>
          </div>

          <FormField label="수강 정원 (명)">
            <input
              type="number"
              min={1}
              max={50}
              value={newCapacity}
              onChange={(e) => setNewCapacity(Number(e.target.value) || 6)}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>

          <FormField label="참여 회원 선택">
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
              {activeMembers.map((m) => {
                const checked = selectedStudentIdsForNew.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 text-xs p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIdsForNew((prev) => [...prev, m.id]);
                        } else {
                          setSelectedStudentIdsForNew((prev) =>
                            prev.filter((id) => id !== m.id)
                          );
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{m.name}</span>
                    <span className="text-[10px] text-slate-400">({m.phone || '연락처 없음'})</span>
                  </label>
                );
              })}
            </div>
          </FormField>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              수업 개설 완료
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
