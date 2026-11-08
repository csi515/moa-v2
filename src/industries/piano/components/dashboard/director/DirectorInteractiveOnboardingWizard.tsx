import React, { useEffect,  useState } from 'react';
import {
  type OnboardingOperatingHours,
  type OnboardingStudentDraft,
  type OnboardingTimetablePlacement,
  DEFAULT_OPERATING_HOURS,
  DEFAULT_STUDENT_DRAFT,
  DEFAULT_PLACEMENT_DRAFT,
  validateOperatingHours,
  validateStudentDraft,
  validatePlacementDraft,
  generateAvailableLessonTimeSlots,
  getOnboardingStorageKey,
} from './directorOnboardingHelpers';
import { Clock, UserPlus, Calendar, CheckCircle2, Sparkles, ArrowRight, ArrowLeft, X, FileSpreadsheet } from 'lucide-react';
import { rosterStorage } from '@/capabilities/roster/infrastructure/rosterStorage';
import { StorageService } from '@/services/storage';
import { showToast } from '@/shared/feedback/uiFeedback';
import { StudentBulkImportModal } from '@/capabilities/roster/components/StudentBulkImportModal';
import type { DayOfWeek } from '@/core/staff/workWindow';

export interface DirectorInteractiveOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId?: string;
  onCompleted?: () => void;
}

export const DirectorInteractiveOnboardingWizard: React.FC<DirectorInteractiveOnboardingWizardProps> = ({
  isOpen,
  onClose,
  organizationId,
  onCompleted,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // 1단계 상태: 운영 시간 & 레슨 규격
  const [hours, setHours] = useState<OnboardingOperatingHours>(DEFAULT_OPERATING_HOURS);

  // 2단계 상태: 첫 원생 정보
  const [student, setStudent] = useState<OnboardingStudentDraft>(DEFAULT_STUDENT_DRAFT);
  const [savedStudentId, setSavedStudentId] = useState<string | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // 3단계 상태: 시간표 배치
  const [placement, setPlacement] = useState<OnboardingTimetablePlacement>(DEFAULT_PLACEMENT_DRAFT);

  if (!isOpen) return null;

  // 1단계 -> 2단계 이동
  const handleStep1Next = () => {
    const val = validateOperatingHours(hours);
    if (!val.isValid) {
      showToast(val.message || '운영 시간을 확인해 주세요.', 'warning');
      return;
    }
    setStep(2);
  };

  // 2단계 -> 3단계 이동 (원생 실제 저장)
  const handleStep2Next = () => {
    const val = validateStudentDraft(student);
    if (!val.isValid) {
      showToast(val.message || '원생 정보를 확인해 주세요.', 'warning');
      return;
    }

    try {
      const saved = rosterStorage.saveStudent({
        studentNumber: '',
        name: student.name.trim(),
        gender: 'M',
        birthDate: '2016-05-15',
        school: '초등학교',
        grade: student.grade || '초2',
        parentName: student.parentName || `${student.name} 학부모`,
        parentPhone: student.parentPhone.trim(),
        phone: student.parentPhone.trim(),
        joinDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        teacherId: 't-director',
        teacherName: '원장님',
        classIds: [],
        level: student.courseSubject || '바이엘',
        tuitionFee: student.tuitionFee || 180000,
        paymentDay: 1,
      });

      setSavedStudentId(saved.id);
      showToast(`🎉 '${saved.name}' 원생이 등록되었습니다!`, 'success');
      setStep(3);
    } catch {
      showToast('원생 등록 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    }
  };

  // 3단계 -> 4단계 이동 (시간표 수업 실제 생성 & 배치)
  const handleStep3Next = () => {
    const val = validatePlacementDraft(placement);
    if (!val.isValid) {
      showToast(val.message || '시간표 배치를 확인해 주세요.', 'warning');
      return;
    }

    try {
      const [startH, startM] = placement.startTime.split(':').map(Number);
      const endTotalMin = (startH || 14) * 60 + (startM || 0) + (hours.lessonDurationMinutes || 50);
      const endH = Math.floor(endTotalMin / 60);
      const endM = endTotalMin % 60;
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      // 수업(Class) 생성
      const createdClass = StorageService.saveClass({
        name: `${placement.dayOfWeek}요일 ${placement.startTime} ${student.courseSubject || '레슨'}`,
        teacherId: 't-director',
        teacherName: placement.teacherName || '원장님',
        daysOfWeek: [placement.dayOfWeek as DayOfWeek],
        startTime: placement.startTime,
        endTime,
        capacity: 4,
        room: '1번 레슨실',
        level: student.courseSubject || '바이엘',
      });

      // 학생에 클래스 배정
      if (savedStudentId && createdClass?.id) {
        const existingStudent = rosterStorage.getStudentById(savedStudentId);
        if (existingStudent) {
          rosterStorage.saveStudent({
            ...existingStudent,
            classIds: [...(existingStudent.classIds || []), createdClass.id],
          });
        }
      }

      showToast('🎹 시간표 수업 배치가 완료되었습니다!', 'success');
      setStep(4);
    } catch {
      showToast('시간표 배치 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    }
  };

  // 최종 완료 및 닫기
  const handleFinish = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = getOnboardingStorageKey(organizationId);
        window.localStorage.setItem(key, JSON.stringify({ completed: true, completedAt: new Date().toISOString() }));
      }
    } catch {
      // ignore
    }
    onCompleted?.();
    onClose();
  };

  const timeSlots = generateAvailableLessonTimeSlots(hours.startTime, hours.endTime, 60);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(to right, #4f46e5, #6366f1)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🎹</span>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                3분 만에 끝내는 피아노 학원 기본 세팅
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#e0e7ff' }}>
                운영 시간, 첫 원생, 시간표 배치까지 3단계로 간편하게 완성합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기"
            style={{
              border: 'none',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4단계 스텝 프로그레스 바 */}
        <div style={{ background: '#f8fafc', padding: '12px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
          {[
            { num: 1, label: '운영시간·레슨', icon: Clock },
            { num: 2, label: '첫 원생 등록', icon: UserPlus },
            { num: 3, label: '시간표 첫 배치', icon: Calendar },
            { num: 4, label: '준비 완료!', icon: Sparkles },
          ].map((s) => {
            const isCurrent = step === s.num;
            const isPassed = step > s.num;
            const IconComp = s.icon;
            return (
              <div
                key={s.num}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#4f46e5' : isPassed ? '#10b981' : '#94a3b8',
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: isCurrent ? '#4f46e5' : isPassed ? '#d1fae5' : '#e2e8f0',
                    color: isCurrent ? '#ffffff' : isPassed ? '#059669' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {isPassed ? '✓' : s.num}
                </div>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* 스텝별 본문 */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* STEP 1: 운영시간 & 레슨 규격 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                  1단계: 학원 레슨 운영 시간을 알려주세요
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  선택하신 요일과 시간대를 바탕으로 최적의 수업 시간표 틀을 자동 구성합니다.
                </p>
              </div>

              {/* 요일 선택 칩 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  레슨 운영 요일
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['월', '화', '수', '목', '금', '토', '일'].map((day) => {
                    const isSelected = hours.operatingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setHours((prev) => ({
                            ...prev,
                            operatingDays: isSelected
                              ? prev.operatingDays.filter((d) => d !== day)
                              : [...prev.operatingDays, day],
                          }));
                        }}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: isSelected ? '#e0e7ff' : '#ffffff',
                          color: isSelected ? '#3730a3' : '#475569',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 시간대 선택 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    첫 수업 시작 시간
                  </label>
                  <select
                    value={hours.startTime}
                    onChange={(e) => setHours((prev) => ({ ...prev, startTime: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    {['12:00', '13:00', '14:00', '15:00'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    마지막 수업 종료 시간
                  </label>
                  <select
                    value={hours.endTime}
                    onChange={(e) => setHours((prev) => ({ ...prev, endTime: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    {['18:00', '19:00', '20:00', '21:00'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1회 레슨 시간 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  1회 레슨 시간 (수업 + 피아노 연습)
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[30, 40, 50, 60].map((mins) => {
                    const isSelected = hours.lessonDurationMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setHours((prev) => ({ ...prev, lessonDurationMinutes: mins }))}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: isSelected ? '#eef2ff' : '#ffffff',
                          color: isSelected ? '#4338ca' : '#64748b',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        {mins}분 수업
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: 첫 원생 등록 */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                    2단계: 우리 학원의 첫 원생을 등록해 주세요
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    원생 이름과 학부모 연락처만 입력하면 3초 만에 기본 등록이 완료됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBulkImportOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #c7d2fe',
                    background: '#eef2ff',
                    color: '#4338ca',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>기존 엑셀 복사 붙여넣기(Ctrl+V)</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    원생 이름 *
                  </label>
                  <input
                    type="text"
                    placeholder="예: 김민준"
                    value={student.name}
                    onChange={(e) => setStudent((prev) => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    학년 / 연령
                  </label>
                  <select
                    value={student.grade}
                    onChange={(e) => setStudent((prev) => ({ ...prev, grade: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    {['유치부', '초1', '초2', '초3', '초4', '초5', '초6', '중등', '성인반'].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    학부모 연락처 *
                  </label>
                  <input
                    type="text"
                    placeholder="010-0000-0000"
                    value={student.parentPhone}
                    onChange={(e) => setStudent((prev) => ({ ...prev, parentPhone: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    학부모 성함 (선택)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 김철수"
                    value={student.parentName}
                    onChange={(e) => setStudent((prev) => ({ ...prev, parentName: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    수강 과목 / 교재
                  </label>
                  <select
                    value={student.courseSubject}
                    onChange={(e) => setStudent((prev) => ({ ...prev, courseSubject: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    {['피아노 바이엘', '체르니 100', '체르니 30', '체르니 40', '성인 취미 피아노', '콩쿠르 입시반'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    월 수강료 (원)
                  </label>
                  <input
                    type="number"
                    step={10000}
                    value={student.tuitionFee}
                    onChange={(e) => setStudent((prev) => ({ ...prev, tuitionFee: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: 시간표 첫 배치 */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                  3단계: 방금 등록한 원생을 시간표에 배치해 보세요
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  {student.name || '원생'}의 주간 정규 레슨 시간대를 클릭 한 번으로 배정합니다.
                </p>
              </div>

              {/* 요일 선택 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  수업 요일
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {hours.operatingDays.map((day) => {
                    const isSelected = placement.dayOfWeek === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setPlacement((prev) => ({ ...prev, dayOfWeek: day }))}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: isSelected ? '#4f46e5' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#334155',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 시간대 슬롯 선택 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  레슨 시작 시간
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                  {timeSlots.map((time) => {
                    const isSelected = placement.startTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setPlacement((prev) => ({ ...prev, startTime: time }))}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: isSelected ? '#eef2ff' : '#ffffff',
                          color: isSelected ? '#3730a3' : '#475569',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 배정 미리보기 카드 */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700 }}>배정 예정 수업</span>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    {student.name} 원생 · {placement.dayOfWeek}요일 {placement.startTime}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {student.courseSubject} ({hours.lessonDurationMinutes}분 레슨) · 1번 레슨실
                  </div>
                </div>
                <span style={{ fontSize: '24px' }}>🎹</span>
              </div>
            </div>
          )}

          {/* STEP 4: 완료 축하 화면 */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 700, letterSpacing: '0.05em' }}>
                  ONBOARDING COMPLETE!
                </span>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0 8px 0' }}>
                  🎉 축하합니다! 우리 학원 기본 세팅이 끝났습니다
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
                  운영 시간표와 첫 원생 배치가 완료되었습니다. 이제 메인 대시보드에서 오늘 등원 출결 체크와 원비 수납을 편리하게 시작해 보세요!
                </p>
              </div>

              <div
                style={{
                  width: '100%',
                  maxWidth: '460px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>운영 시간:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {hours.operatingDays.join(', ')} {hours.startTime}~{hours.endTime} ({hours.lessonDurationMinutes}분 레슨)
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>첫 원생:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {student.name} ({student.grade}, {student.tuitionFee?.toLocaleString()}원)
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>첫 수업 배치:</span>
                  <strong style={{ color: '#4f46e5' }}>
                    매주 {placement.dayOfWeek}요일 {placement.startTime}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 네비게이션 액션 버튼 */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {step > 1 && step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>이전</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {step === 4 ? '' : '나중에 설정하기'}
            </button>
          )}

          {step === 1 && (
            <button
              type="button"
              onClick={handleStep1Next}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#4f46e5',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)',
              }}
            >
              <span>다음: 첫 원생 등록하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={handleStep2Next}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#4f46e5',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)',
              }}
            >
              <span>다음: 시간표에 배치하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleStep3Next}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#16a34a',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)',
              }}
            >
              <span>시간표에 배정 완료 🎉</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={handleFinish}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 28px',
                borderRadius: '10px',
                border: 'none',
                background: '#4f46e5',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)',
              }}
            >
              <span>우리 학원 대시보드 시작하기 🚀</span>
            </button>
          )}
        </div>
      </div>

      {/* 엑셀 복사/붙여넣기 대량 등록 모달 연동 */}
      {isBulkImportOpen && (
        <StudentBulkImportModal
          isOpen={true}
          onClose={() => setIsBulkImportOpen(false)}
          onCompleted={() => {
            setIsBulkImportOpen(false);
            setStep(3);
          }}
        />
      )}
    </div>
  );
};
