import React, { useState } from 'react';
import { X, User, Award, BookOpen, GraduationCap, Briefcase, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { InstructorProfile, validateInstructorProfile } from '../domain/instructorMatchEngine';

export interface InstructorProfileModalProps {
  initialProfile?: Partial<InstructorProfile> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: InstructorProfile) => void;
}

export const InstructorProfileModal: React.FC<InstructorProfileModalProps> = ({
  initialProfile,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [staffName, setStaffName] = useState(initialProfile?.staffName || '');
  const [headlineTitle, setHeadlineTitle] = useState(initialProfile?.headlineTitle || '');
  const [academicBackground, setAcademicBackground] = useState(initialProfile?.academicBackground || '');
  const [careerText, setCareerText] = useState((initialProfile?.careerHistory || []).join('\n'));
  const [certText, setCertText] = useState((initialProfile?.certifications || []).join('\n'));
  const [awardsText, setAwardsText] = useState((initialProfile?.awards || []).join('\n'));
  const [introduction, setIntroduction] = useState(initialProfile?.introduction || '');
  const [profileImageUrl, setProfileImageUrl] = useState(
    initialProfile?.profileImageUrl || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=500'
  );
  const [specialtiesText, setSpecialtiesText] = useState(
    (initialProfile?.specialties || ['홈베이킹', '디저트', '천연발효종']).join(', ')
  );

  // 대표 강좌 목록
  const [courses, setCourses] = useState(
    initialProfile?.majorCourses || [
      {
        courseName: '홈베이킹 제과제빵 초급 12주',
        targetAudience: '성인 입문/취미 (정원 16명)',
        scheduleSummary: '매주 화/목 10:00~11:30 (301호 조리실습실)',
        curriculumHighlights: ['1주: 오븐 기초 & 식빵', '2주: 크루아상 & 페이스트리', '3주: 스콘 & 마들렌'],
      },
    ]
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddCourse = () => {
    setCourses([
      ...courses,
      {
        courseName: '신규 개설 강좌',
        targetAudience: '누구나',
        scheduleSummary: '매주 1회',
        curriculumHighlights: ['기초 과정'],
      },
    ]);
  };

  const handleRemoveCourse = (index: number) => {
    setCourses(courses.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const profileToSave: InstructorProfile = {
      staffId: initialProfile?.staffId || `inst-${Date.now()}`,
      staffName,
      headlineTitle,
      academicBackground,
      careerHistory: careerText.split('\n').map((s) => s.trim()).filter(Boolean),
      certifications: certText.split('\n').map((s) => s.trim()).filter(Boolean),
      awards: awardsText.split('\n').map((s) => s.trim()).filter(Boolean),
      introduction,
      profileImageUrl,
      specialties: specialtiesText.split(',').map((s) => s.trim()).filter(Boolean),
      majorCourses: courses,
      rating: initialProfile?.rating || 4.9,
      totalReviews: initialProfile?.totalReviews || 28,
    };

    const validation = validateInstructorProfile(profileToSave);
    if (!validation.isValid) {
      setErrorMessage(validation.errors[0]);
      return;
    }

    setErrorMessage(null);
    onSave(profileToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">강사 스펙 & 프로필 등록</h3>
              <p className="text-xs text-slate-500">문화센터 A4 홍보 포스터 및 모바일 수강생 안내장에 반영됩니다.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-sm">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">강사 성명 *</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="예: 이지은 파티시에"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">대표 강의 타이틀 *</label>
              <input
                type="text"
                value={headlineTitle}
                onChange={(e) => setHeadlineTitle(e.target.value)}
                placeholder="예: 프랑스 정통 홈베이킹 마스터 12주"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">프로필 사진 URL</label>
            <input
              type="text"
              value={profileImageUrl}
              onChange={(e) => setProfileImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">전문 강의 분야 (쉼표 구분) *</label>
            <input
              type="text"
              value={specialtiesText}
              onChange={(e) => setSpecialtiesText(e.target.value)}
              placeholder="예: 홈베이킹, 천연발효종, 디저트 플레이팅"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              학력 사항
            </label>
            <input
              type="text"
              value={academicBackground}
              onChange={(e) => setAcademicBackground(e.target.value)}
              placeholder="예: 프랑스 르 꼬르동 블루 제과 디플로마 수석 졸업"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                대표 경력 (줄바꿈 구분)
              </label>
              <textarea
                rows={3}
                value={careerText}
                onChange={(e) => setCareerText(e.target.value)}
                placeholder="전) 호텔신라 베이커리 선임 파티시에&#10;현) 아뜰리에 브레드 대표원장"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                보유 자격증 & 면허 (줄바꿈 구분)
              </label>
              <textarea
                rows={3}
                value={certText}
                onChange={(e) => setCertText(e.target.value)}
                placeholder="국가공인 제과기능장&#10;제빵기능사 1급&#10;SCA 국제 바리스타 자격"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">수상 및 주요 활동 이력 (줄바꿈 구분)</label>
            <textarea
              rows={2}
              value={awardsText}
              onChange={(e) => setAwardsText(e.target.value)}
              placeholder="2023 대한민국 베이커리 페스티벌 금상 수상&#10;KBS 생생정보 제과 명인 출연"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">강사 소개글 & 교육 철학 *</label>
            <textarea
              rows={3}
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              placeholder="수강생들이 집에서도 빵집 수준의 퀄리티를 구현할 수 있도록 친절하고 세심하게 원리를 짚어드립니다..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 text-xs"
            />
          </div>

          {/* 대표 개설 강좌 관리 */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                A4 포스터에 표기할 대표 강좌 ({courses.length}개)
              </span>
              <button
                type="button"
                onClick={handleAddCourse}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> 강좌 추가
              </button>
            </div>

            <div className="space-y-3">
              {courses.map((course, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">강좌 #{idx + 1}</span>
                    {courses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCourse(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="강좌명"
                      value={course.courseName}
                      onChange={(e) => {
                        const updated = [...courses];
                        updated[idx].courseName = e.target.value;
                        setCourses(updated);
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="수강 대상 (예: 성인 취미, 정원 16명)"
                      value={course.targetAudience}
                      onChange={(e) => {
                        const updated = [...courses];
                        updated[idx].targetAudience = e.target.value;
                        setCourses(updated);
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="시간표 (예: 매주 화/목 10:00~11:30)"
                      value={course.scheduleSummary}
                      onChange={(e) => {
                        const updated = [...courses];
                        updated[idx].scheduleSummary = e.target.value;
                        setCourses(updated);
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg md:col-span-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 font-semibold text-xs transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            저장 및 프로필 반영
          </button>
        </div>
      </div>
    </div>
  );
};
