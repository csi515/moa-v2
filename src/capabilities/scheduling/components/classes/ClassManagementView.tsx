import React, { useMemo, useState } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useStorageRefresh } from '@/hooks';
import { usePermissions } from '@/core/auth/usePermissions';
import { getCustomerLabel, getPlaceLabel } from '@/core/industry/industryUi';
import { useModuleLabels } from '@/core/labels';
import { StorageService } from '@/services/storage';
import { PageHeader } from '@/shared/components';
import { ClassItem, DayOfWeek } from '@/types';
import {
  findClassConflicts,
  formatConflictSummary,
} from '../../utils/scheduleConflicts';
import { getRoomNames } from '@/core/organizations/utils/academyRooms';
import {
  GraduationCap,
  Plus,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  X,
  Save,
  BookOpen,
  CalendarDays
} from 'lucide-react';

const DAYS_OF_WEEK: DayOfWeek[] = ['월', '화', '수', '목', '금', '토'];

export const ClassManagementView: React.FC = () => {
  const { showToast, openConfirmDialog, setSelectedStudentId, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const serviceLabel = labels.service.singular;
  const customerLabel = labels.customer.singular || getCustomerLabel(industry);
  const placeLabel = getPlaceLabel(industry);
  const refreshKey = useStorageRefresh('classes');

  const classes = useMemo(() => StorageService.getClasses(), [refreshKey]);
  const teachers = useMemo(() => StorageService.getTeachers(), [refreshKey]);
  const students = useMemo(() => StorageService.getStudents(), [refreshKey]);
  const textbooks = useMemo(() => StorageService.getTextbooks(), [refreshKey]);

  const roomNames = useMemo(
    () =>
      getRoomNames({
        settings: StorageService.getSettings(),
        classes,
      }),
    [classes, refreshKey]
  );
  const defaultRoom = roomNames[0] || '';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    targetLevel: '바이엘',
    daysOfWeek: ['월', '수', '금'] as DayOfWeek[],
    startTime: '14:00',
    endTime: '14:50',
    capacity: 4,
    teacherId: teachers[0]?.id || '',
    room: defaultRoom,
    color: '#4f46e5',
    textbook: '',
    memo: ''
  });

  const handleOpenCreate = () => {
    setEditingClass(null);
    const rooms = getRoomNames({
      settings: StorageService.getSettings(),
      classes: StorageService.getClasses(),
    });
    setFormData({
      name: '',
      targetLevel: '바이엘 하',
      daysOfWeek: ['월', '수', '금'],
      startTime: '15:00',
      endTime: '15:50',
      capacity: 4,
      teacherId: teachers[0]?.id || '',
      room: rooms[0] || '',
      color: '#4f46e5',
      textbook: StorageService.getTextbooks()[0]?.title || '',
      memo: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      targetLevel: cls.targetLevel,
      daysOfWeek: cls.daysOfWeek,
      startTime: cls.startTime,
      endTime: cls.endTime,
      capacity: cls.capacity,
      teacherId: cls.teacherId,
      room: cls.room,
      color: cls.color || '#4f46e5',
      textbook: cls.textbook || '',
      memo: cls.memo || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (cls: ClassItem) => {
    openConfirmDialog({
      title: `${serviceLabel} 삭제`,
      message: `'${cls.name}' ${serviceLabel}을(를) 삭제하시겠습니까?\n배정된 ${customerLabel}의 해당 ${serviceLabel} 연결도 함께 해제됩니다.`,
      isDestructive: true,
      confirmText: '삭제하기',
      onConfirm: () => {
        StorageService.deleteClass(cls.id);
        showToast(`'${cls.name}' ${serviceLabel}이(가) 삭제되었습니다.`, 'info');
      }
    });
  };

  const handleDayToggle = (day: DayOfWeek) => {
    setFormData((prev) => {
      const exists = prev.daysOfWeek.includes(day);
      return {
        ...prev,
        daysOfWeek: exists
          ? prev.daysOfWeek.filter((d) => d !== day)
          : [...prev.daysOfWeek, day]
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast(`필수 항목: ${serviceLabel} 이름을 입력해 주세요`, 'warning');
      return;
    }
    if (formData.daysOfWeek.length === 0) {
      showToast('최소 1개 이상의 요일을 선택해 주세요', 'warning');
      return;
    }

    const targetTeacher = teachers.find((t) => t.id === formData.teacherId);
    const conflicts = findClassConflicts(classes, {
      teacherId: formData.teacherId,
      room: formData.room,
      daysOfWeek: formData.daysOfWeek,
      startTime: formData.startTime,
      endTime: formData.endTime,
      excludeId: editingClass?.id,
    });

    const save = () => {
      StorageService.saveClass({
        ...(editingClass ? { id: editingClass.id } : {}),
        name: formData.name.trim(),
        targetLevel: formData.targetLevel,
        daysOfWeek: formData.daysOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        capacity: Number(formData.capacity) || 4,
        teacherId: formData.teacherId,
        teacherName: targetTeacher ? targetTeacher.name : '미지정',
        room: formData.room,
        color: formData.color,
        textbook: formData.textbook.trim(),
        memo: formData.memo.trim(),
      } as any);

      showToast(
        editingClass
          ? `'${formData.name}' ${serviceLabel}이(가) 수정되었습니다.`
          : `'${formData.name}' ${serviceLabel}이(가) 개설되었습니다. 시간표에서 학생을 배치할 수 있습니다.`,
        'success'
      );
      setIsModalOpen(false);
      if (!editingClass) {
        setActiveTab('timetable');
      }
    };

    if (conflicts.length > 0) {
      openConfirmDialog({
        title: '일정 충돌 확인',
        message: `강사 또는 연습실이 겹칩니다. 그래도 저장할까요?\n\n${formatConflictSummary(conflicts)}`,
        confirmText: '그래도 저장',
        onConfirm: save,
      });
      return;
    }

    save();
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<GraduationCap className="w-6 h-6" />}
        title={labels.service.management}
        description={`등록된 ${serviceLabel} ${classes.length}개 · 요일·시간에 맞춰 오늘 일정에 자동 표시됩니다`}
        actions={
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {serviceLabel} 추가
          </button>
        }
      />

      {/* Class Cards Grid */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700 mb-2">등록된 {serviceLabel}이(가) 없습니다</p>
          <p className="text-sm text-slate-500 mb-4">
            예: 월·수 16:00 — 학생을 배정하면 해당 요일에 오늘 일정에 나타납니다
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 mx-auto min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            {serviceLabel} 추가
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => {
          const enrolled = students.filter((s) => s.status === 'active' && s.classIds?.includes(cls.id));
          const percent = Math.min(100, Math.round((enrolled.length / cls.capacity) * 100));

          return (
            <div
              key={cls.id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-2xs"
                      style={{ backgroundColor: cls.color || '#4f46e5' }}
                    />
                    <h3 className="font-bold text-base text-slate-900">{cls.name}</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {cls.room}
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>요일: <strong>{cls.daysOfWeek.join(', ')}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>시간: {cls.startTime} ~ {cls.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>담당: <strong>{cls.teacherName}</strong></span>
                  </div>
                  {cls.textbook && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>교재: {cls.textbook}</span>
                    </div>
                  )}
                </div>

                {/* Capacity progress bar */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">수강 {customerLabel} 현황</span>
                    <span className="font-bold text-slate-800">
                      {enrolled.length} / {cls.capacity}명 ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percent >= 100 ? 'bg-rose-500' : percent >= 75 ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Enrolled students chips */}
                {enrolled.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {enrolled.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setSelectedStudentId(st.id);
                          setActiveTab('students');
                        }}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 rounded-lg transition-colors cursor-pointer"
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(cls)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" /> 수정
                </button>
                <button
                  onClick={() => handleDelete(cls)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Class Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {editingClass ? `${serviceLabel} 수정` : `${serviceLabel} 추가`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {serviceLabel} 이름 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 월수 16시 개인반"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  수업 요일 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {DAYS_OF_WEEK.map((d) => {
                    const isChecked = formData.daysOfWeek.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => handleDayToggle(d)}
                        className={`py-2.5 min-h-[44px] text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d}요일
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">시작 시간</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">종료 시간</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">담당 선생님</label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">강의실 / 연습실</label>
                  {roomNames.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        등록된 실이 없습니다. {placeLabel} 설정에서 강의실·연습실을 먼저 등록해 주세요.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          setActiveTab('settings');
                        }}
                        className="text-xs font-bold text-indigo-600 min-h-[44px]"
                      >
                        {placeLabel} 설정으로 이동
                      </button>
                      <input
                        type="text"
                        value={formData.room}
                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                        placeholder="임시로 실 이름 입력"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <select
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {roomNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">최대 정원 (명)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">구분 색상</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">사용 교재</label>
                {textbooks.length > 0 && (
                  <select
                    value={textbooks.some((t) => t.title === formData.textbook) ? formData.textbook : ''}
                    onChange={(e) => setFormData({ ...formData, textbook: e.target.value })}
                    className="w-full mb-2 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">카탈로그에서 선택…</option>
                    {textbooks.map((tb) => (
                      <option key={tb.id} value={tb.title}>
                        {tb.title}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  placeholder={
                    textbooks.length > 0
                      ? '선택하거나 직접 입력 (여러 권은 쉼표로)'
                      : '예: 바이엘 상권 — 교재 관리에서 미리 등록할 수 있습니다'
                  }
                  value={formData.textbook}
                  onChange={(e) => setFormData({ ...formData, textbook: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">반 메모</label>
                <textarea
                  rows={2}
                  placeholder="반 특성 및 유의사항..."
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {editingClass ? '수정 내용 저장' : `${serviceLabel} 저장`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
