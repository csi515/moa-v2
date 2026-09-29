import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { StudentService } from '@/core/students';
import { LessonService } from '@/core/lessons';
import { PageHeader, FilterBar, SearchField } from '@/shared/components';
import { LessonRecord } from '@/types';
import { removeById, upsertById } from '@/shared/utils/listUpdate';
import {
  Piano,
  Plus,
  Calendar,
  User,
  BookOpen,
  Sparkles,
  Edit,
  Trash2,
  X,
  Save,
  Award,
  ChevronRight,
} from 'lucide-react';
import { syncLessonHomeworkToWeeklyAssignment } from '../../services/lessonHomeworkSync';
import { todayIsoLocal } from '@/shared/utils/localDate';

export const LessonRecordsView: React.FC = () => {
  const { showToast, openConfirmDialog, currentUser, setSelectedStudentId, setActiveTab } = useApp();
  const refreshKey = useStorageRefresh();
  const { staffId, scopeStudents, scopeLessons } = useStaffScope();

  const [lessons, setLessons] = useState<LessonRecord[]>(() =>
    scopeLessons(LessonService.getLessonRecords())
  );
  const students = useMemo(
    () => scopeStudents(StudentService.getStudents()),
    [scopeStudents, refreshKey]
  );
  const teachers = useMemo(() => StorageService.getTeachers(), [refreshKey]);

  useEffect(() => {
    setLessons(scopeLessons(LessonService.getLessonRecords()));
  }, [refreshKey, scopeLessons]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonRecord | null>(null);

  const [formData, setFormData] = useState({
    studentId: students[0]?.id || '',
    date: todayIsoLocal(),
    songTitle: '',
    progress: '',
    lessonContent: '',
    strengths: '',
    weaknesses: '',
    homework: '',
    memo: '',
  });

  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      if (selectedStudentFilter !== 'ALL' && l.studentId !== selectedStudentFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchStudent = l.studentName.toLowerCase().includes(q);
        const matchSong = l.songTitle.toLowerCase().includes(q);
        const matchContent = l.lessonContent.toLowerCase().includes(q);
        if (!matchStudent && !matchSong && !matchContent) return false;
      }
      return true;
    });
  }, [lessons, selectedStudentFilter, searchQuery]);

  const handleOpenCreate = () => {
    setEditingLesson(null);
    setFormData({
      studentId: students[0]?.id || '',
      date: todayIsoLocal(),
      songTitle: '',
      progress: '',
      lessonContent: '',
      strengths: '',
      weaknesses: '',
      homework: '',
      memo: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lesson: LessonRecord) => {
    setEditingLesson(lesson);
    setFormData({
      studentId: lesson.studentId,
      date: lesson.date,
      songTitle: lesson.songTitle,
      progress: lesson.progress,
      lessonContent: lesson.lessonContent,
      strengths: lesson.strengths || '',
      weaknesses: lesson.weaknesses || '',
      homework: lesson.homework || '',
      memo: lesson.memo || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (lesson: LessonRecord) => {
    openConfirmDialog({
      title: '수업 일지 삭제',
      message: `${lesson.studentName} 학생의 ${lesson.date} 수업 일지를 삭제하시겠습니까?`,
      isDestructive: true,
      confirmText: '삭제하기',
      onConfirm: () => {
        LessonService.deleteLessonRecord(lesson.id);
        setLessons((prev) => removeById(prev, lesson.id));
        showToast('수업 일지가 삭제되었습니다.', 'info');
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === formData.studentId);
    if (!st) {
      showToast('학생을 선택해주세요.', 'warning');
      return;
    }
    if (!formData.songTitle.trim()) {
      showToast('수업 곡/진도를 입력해주세요.', 'warning');
      return;
    }

    const saved = LessonService.saveLessonRecord({
      ...(editingLesson ? { id: editingLesson.id } : {}),
      studentId: st.id,
      studentName: st.name,
      teacherId: staffId || StorageService.getTeachers()[0]?.id || '',
      teacherName: currentUser.name,
      date: formData.date,
      songTitle: formData.songTitle.trim(),
      progress: formData.progress.trim(),
      lessonContent: formData.lessonContent.trim(),
      strengths: formData.strengths.trim(),
      weaknesses: formData.weaknesses.trim(),
      homework: formData.homework.trim(),
      memo: formData.memo.trim(),
    });
    setLessons((prev) => upsertById(prev, saved));

    syncLessonHomeworkToWeeklyAssignment({
      studentId: st.id,
      songTitle: formData.songTitle,
      homework: formData.homework,
      staffId,
    });

    showToast(
      editingLesson
        ? '수업 일지가 수정되었습니다.'
        : formData.homework.trim()
          ? '수업 일지와 주간 과제가 등록되었습니다.'
          : '새 수업 일지가 등록되었습니다.',
      'success'
    );
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<Piano className="w-6 h-6" />}
        title="수업 일지 및 진도 관리"
        description="학생별 피아노 수업 진도, 강점 및 보완점, 과제 기록"
        actions={
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            수업 일지 작성
          </button>
        }
      />

      <FilterBar>
        <select
          value={selectedStudentFilter}
          onChange={(e) => setSelectedStudentFilter(e.target.value)}
          className="px-3.5 py-2 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
        >
          <option value="ALL">전체 학생</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.level})
            </option>
          ))}
        </select>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="학생, 수업 곡명, 내용 검색..."
          className="flex-1 min-w-[200px]"
        />
        <span className="text-xs text-slate-500 font-medium shrink-0">
          총 <strong className="text-indigo-600">{filteredLessons.length}개</strong>
        </span>
      </FilterBar>

      {/* Lesson Records List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredLessons.map((l) => (
          <div
            key={l.id}
            className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm">
                    {l.studentName.slice(0, 1)}
                  </div>
                  <div>
                    <h4
                      onClick={() => {
                        setSelectedStudentId(l.studentId);
                        setActiveTab('students');
                      }}
                      className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer"
                    >
                      {l.studentName}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">{l.date} | {l.teacherName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(l)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(l)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs">
                <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <MusicIcon className="w-3.5 h-3.5 text-indigo-600" />
                  {l.songTitle}
                </p>
                <p className="text-indigo-700 font-medium mt-0.5">진도 상태: {l.progress}</p>
              </div>

              <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                <p>{l.lessonContent}</p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                  {l.strengths && (
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-900">
                      <strong className="text-emerald-700 block mb-0.5">👏 잘한 점</strong>
                      {l.strengths}
                    </div>
                  )}
                  {l.weaknesses && (
                    <div className="p-2 bg-amber-50 rounded-xl text-amber-900">
                      <strong className="text-amber-700 block mb-0.5">💡 보완할 점</strong>
                      {l.weaknesses}
                    </div>
                  )}
                </div>

                {l.homework && (
                  <div className="p-2.5 bg-purple-50 rounded-xl text-purple-900 text-xs">
                    <strong>📝 숙제:</strong> {l.homework}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lesson Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {editingLesson ? '수업 일지 수정' : '새 수업 일지 작성'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">학생 선택</label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.school} {s.grade})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">수업 일자</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">수업 곡 / 교재</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 체르니 100번 25번"
                    value={formData.songTitle}
                    onChange={(e) => setFormData({ ...formData, songTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">진도 상태</label>
                  <input
                    type="text"
                    placeholder="예: 양손 완성, 페달 연습 중"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">수업 지도 내용</label>
                <textarea
                  rows={3}
                  required
                  placeholder="오늘 지도한 테크닉, 리듬, 터치, 음악적 표현 등..."
                  value={formData.lessonContent}
                  onChange={(e) => setFormData({ ...formData, lessonContent: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">잘한 점 (칭찬)</label>
                  <input
                    type="text"
                    placeholder="예: 강약 조절이 매우 돋보임"
                    value={formData.strengths}
                    onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">보완할 점</label>
                  <input
                    type="text"
                    placeholder="예: 손목에 힘 빼고 가볍게 타건"
                    value={formData.weaknesses}
                    onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">홈워크 / 과제</label>
                <input
                  type="text"
                  placeholder="예: 매일 오른손 따로 3번, 양손 5번 연습"
                  value={formData.homework}
                  onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                  <Save className="w-3.5 h-3.5" />
                  일지 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const MusicIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
  </svg>
);
