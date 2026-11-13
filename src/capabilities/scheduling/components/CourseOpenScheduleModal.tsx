import { useEscapeKey } from '@/shared/hooks/useMoaHotkeys';

import { showToast } from '@/shared/feedback/uiFeedback';
import React, { useEffect,  useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  DoorOpen,
  User,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export interface CultureCourseSchedule {
  id: string;
  courseName: string;
  roomId: string;
  roomName: string;
  instructorId: string;
  instructorName: string;
  daysOfWeek: string[]; // ['화', '목']
  startTime: string; // '10:00'
  endTime: string; // '11:30'
  startDate: string; // '2026-11-01'
  endDate: string; // '2027-01-24' (12주 코스)
  durationWeeks: number;
  capacity: number; // 16
  enrolledCount: number; // 0
  tuitionFee: number; // 240000
  materialFee?: number; // 50000
  status: 'OPEN' | 'CLOSED' | 'IN_PROGRESS';
}

export interface CourseOpenScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (course: CultureCourseSchedule) => void;
  existingCourses?: CultureCourseSchedule[];
}

const DEFAULT_ROOMS = [
  { id: 'room-301', name: '301호 조리실습실 (개별 오븐 16대)', maxCapacity: 16 },
  { id: 'room-201', name: '201호 무용실 (클래식 발레 바/전면 거울)', maxCapacity: 20 },
  { id: 'room-202', name: '202호 미술실 (이젤/수도시설 완비)', maxCapacity: 15 },
  { id: 'room-101', name: '101호 대강의실 (빔프로젝터/음향)', maxCapacity: 50 },
];

const DEFAULT_INSTRUCTORS = [
  { id: 'inst-baking-01', name: '이지은 파티시에', specialty: '홈베이킹/제과제빵' },
  { id: 'inst-ballet-02', name: '박세연 무용수', specialty: '클래식/성인발레' },
  { id: 'inst-art-03', name: '최진호 화가', specialty: '유화/아크릴화' },
];

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

export const CourseOpenScheduleModal: React.FC<CourseOpenScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingCourses = [],
}) => {
  if (!isOpen) return null;

  const [courseName, setCourseName] = useState('');
  const [roomId, setRoomId] = useState(DEFAULT_ROOMS[0].id);
  const [instructorId, setInstructorId] = useState(DEFAULT_INSTRUCTORS[0].id);
  const [selectedDays, setSelectedDays] = useState<string[]>(['화', '목']);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [capacity, setCapacity] = useState(16);
  const [tuitionFee, setTuitionFee] = useState(240000);
  const [materialFee, setMaterialFee] = useState(50000);

  const selectedRoom = DEFAULT_ROOMS.find((r) => r.id === roomId) || DEFAULT_ROOMS[0];
  const selectedInstructor = DEFAULT_INSTRUCTORS.find((i) => i.id === instructorId) || DEFAULT_INSTRUCTORS[0];

  // 종강일 자동 계산 (시작일 + durationWeeks 주)
  const calculateEndDate = (start: string, weeks: number) => {
    const d = new Date(start);
    d.setDate(d.getDate() + weeks * 7 - 1);
    return d.toISOString().split('T')[0];
  };

  const endDate = calculateEndDate(startDate, durationWeeks);

  // 강의실 중복 점유(Room Conflict) 및 강사 일정 중복(Instructor Conflict) 사전 검증
  const hasConflict = existingCourses.some((c) => {
    if (c.status === 'CLOSED') return false;
    const sameRoom = c.roomId === roomId;
    const sameInstructor = c.instructorId === instructorId;
    if (!sameRoom && !sameInstructor) return false;

    // 요일 겹침 확인
    const dayOverlap = c.daysOfWeek.some((d) => selectedDays.includes(d));
    if (!dayOverlap) return false;

    // 시간대 겹침 확인: (StartA < EndB) && (EndA > StartB)
    return startTime < c.endTime && endTime > c.startTime;
  });

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // 최소 1일 선택
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) {
      showToast('강좌명을 입력해주세요.', 'warning');
      return;
    }

    if (hasConflict) {
      showToast('동시간대에 강의실 또는 강사 일정이 중복되어 등록됩니다.', 'warning');
    }

    const newCourse: CultureCourseSchedule = {
      id: `course-${Date.now()}`,
      courseName,
      roomId,
      roomName: selectedRoom.name,
      instructorId,
      instructorName: selectedInstructor.name,
      daysOfWeek: selectedDays,
      startTime,
      endTime,
      startDate,
      endDate,
      durationWeeks,
      capacity,
      enrolledCount: 0,
      tuitionFee,
      materialFee,
      status: 'OPEN',
    };

    onSave(newCourse);
    onClose();
  };

  useEscapeKey(onClose);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-6 cursor-default">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">문화센터 정규 강좌 개설</h3>
              <p className="text-xs text-slate-500">강의실 점유, 담당 강사 배정 및 12주 시간표를 스케줄링합니다.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
            aria-label="닫기"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {hasConflict && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>주의:</strong> 선택하신 강의실 또는 강사의 시간대에 이미 개설된 강좌가 존재합니다.
              </span>
            </div>
          )}

          {/* 강좌명 */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">강좌명 *</label>
            <input
              type="text"
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="예: 홈베이킹 제과제빵 초급반 (12주 코스)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm"
            />
          </div>

          {/* 강의실 배정 (seat_room) & 담당 강사 배정 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <DoorOpen className="w-3.5 h-3.5 text-indigo-600" />
                배정 강의실 (seat_room 자원) *
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
              >
                {DEFAULT_ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (최대 {r.maxCapacity}명)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                담당 강사 지정 *
              </label>
              <select
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
              >
                {DEFAULT_INSTRUCTORS.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.specialty})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 요일 선택 */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">강의 요일 (매주 반복) *</label>
            <div className="flex gap-1.5">
              {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 시간대 설정 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                시작 시각
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                종료 시각
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>

          {/* 개강일 및 코스 기간 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">개강일 *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">과정 기간 (주)</label>
              <input
                type="number"
                min={1}
                max={52}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">종강 예정일</label>
              <input
                type="date"
                disabled
                value={endDate}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50"
              />
            </div>
          </div>

          {/* 정원 및 수강료 */}
          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                모집 정원 (명)
              </label>
              <input
                type="number"
                min={1}
                max={selectedRoom.maxCapacity}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                수강료 (원)
              </label>
              <input
                type="number"
                step={10000}
                value={tuitionFee}
                onChange={(e) => setTuitionFee(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">별도 재료비 (원)</label>
              <input
                type="number"
                step={5000}
                value={materialFee}
                onChange={(e) => setMaterialFee(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>

          {/* 모달 하단 버튼 */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 font-semibold"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>강좌 시간표 개설 확정</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
