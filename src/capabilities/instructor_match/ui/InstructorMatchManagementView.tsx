import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Printer,
  Edit,
  GraduationCap,
  Sparkles,
  BookOpen,
  Award,
  Calendar,
  Share2,
} from 'lucide-react';
import { InstructorProfile } from '../domain/instructorMatchEngine';
import { InstructorProfileModal } from './InstructorProfileModal';
import { InstructorPrintableLeaflet } from './InstructorPrintableLeaflet';

const SAMPLE_INSTRUCTORS: InstructorProfile[] = [
  {
    staffId: 'inst-baking-01',
    staffName: '이지은 파티시에',
    headlineTitle: '프랑스 르꼬르동블루 정통 홈베이킹 마스터 12주',
    academicBackground: '프랑스 르 꼬르동 블루 제과 디플로마 수석 졸업',
    careerHistory: [
      '전) 호텔신라 베이커리 선임 파티시에',
      '전) 파리 라뒤레(Ladurée) 제과 인턴십',
      '현) 아뜰리에 브레드 대표원장',
    ],
    certifications: ['국가공인 제과기능장', '제빵기능사 1급', 'SCA 국제 바리스타'],
    awards: ['2023 대한민국 베이커리 페스티벌 금상', 'KBS 생생정보 제과 명인 출연'],
    introduction:
      '초보자도 집에서 쉽게 오븐으로 프로 수준의 바게트와 크루아상을 구울 수 있도록 원리와 테크닉을 꼼꼼히 전수합니다.',
    profileImageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=500',
    specialties: ['홈베이킹', '천연발효종', '디저트 플레이팅', '마카롱'],
    majorCourses: [
      {
        courseName: '홈베이킹 제과제빵 초급 12주',
        targetAudience: '성인 입문/취미 (정원 16명)',
        scheduleSummary: '매주 화/목 10:00~11:30 (301호 조리실습실)',
        curriculumHighlights: ['1주: 오븐 기초 & 식빵', '2주: 크루아상 & 페이스트리', '3주: 스콘 & 마들렌'],
      },
      {
        courseName: '주말 천연발효 사워도우 특강',
        targetAudience: '직장인 주말반 (정원 12명)',
        scheduleSummary: '매주 토 14:00~17:00 (301호 조리실습실)',
        curriculumHighlights: ['르방 배양법', '깜빠뉴 굽기'],
      },
    ],
    rating: 4.9,
    totalReviews: 42,
  },
  {
    staffId: 'inst-ballet-02',
    staffName: '박세연 무용수',
    headlineTitle: '바른 체형과 코어 근력을 깨우는 성인 힐링 발레',
    academicBackground: '한국예술종합학교 무용원 실기과 학사',
    careerHistory: [
      '전) 국립발레단 정단원 활동',
      '현) 세연 발레 아카데미 예술감독',
    ],
    certifications: ['PBT 발레티칭 자격증', '국제 필라테스 지도자 자격'],
    awards: ['동아무용콩쿠르 일반부 은상'],
    introduction:
      '유연성이 부족해도 괜찮습니다. 클래식 발레의 기본 바(Barre) 동작을 통해 굳은 목과 어깨를 펴고 우아한 라인을 되찾아드립니다.',
    profileImageUrl: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=500',
    specialties: ['성인취미발레', '자세교정', '체형교정', '스트레칭'],
    majorCourses: [
      {
        courseName: '힐링 성인 취미 발레 초급',
        targetAudience: '성인 여성 (정원 20명)',
        scheduleSummary: '매주 월/수 19:30~20:40 (201호 무용실)',
        curriculumHighlights: ['1주: 기본 턴아웃 & 플리에', '2주: 탄듀 & 롱드잠'],
      },
    ],
    rating: 4.8,
    totalReviews: 35,
  },
  {
    staffId: 'inst-art-03',
    staffName: '최진호 화가',
    headlineTitle: '퇴근 후 물드는 감성 유화 & 아크릴 풍경화',
    academicBackground: '홍익대학교 미술대학 회화과 석사',
    careerHistory: ['개인전 5회 개최', '서울시립미술관 신진작가 선정'],
    certifications: ['중등 정교사 2급(미술)'],
    awards: ['대한민국 미술대전 서양화 부문 입선'],
    introduction:
      '그림을 전혀 못 그리셔도 붓 터치 하나부터 친절히 안내합니다. 나만의 캔버스에 사계절의 색채를 담아보세요.',
    profileImageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500',
    specialties: ['유화', '아크릴화', '어반스케치'],
    majorCourses: [
      {
        courseName: '나만의 유화 풍경화 8주 완성',
        targetAudience: '성인 누구나 (정원 15명)',
        scheduleSummary: '매주 금 14:00~16:00 (202호 미술실)',
        curriculumHighlights: ['1주: 유화 물감 다루기', '2주: 노을빛 하늘 묘사'],
      },
    ],
    rating: 5.0,
    totalReviews: 19,
  },
];

export const InstructorMatchManagementView: React.FC = () => {
  const [instructors, setInstructors] = useState<InstructorProfile[]>(SAMPLE_INSTRUCTORS);
  const [selectedInstructorForLeaflet, setSelectedInstructorForLeaflet] = useState<InstructorProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<InstructorProfile | null>(null);

  const handleSaveProfile = (savedProfile: InstructorProfile) => {
    const existingIndex = instructors.findIndex((i) => i.staffId === savedProfile.staffId);
    if (existingIndex >= 0) {
      const updated = [...instructors];
      updated[existingIndex] = savedProfile;
      setInstructors(updated);
    } else {
      setInstructors([savedProfile, ...instructors]);
    }
  };

  // 인쇄 및 모바일 리플릿 모드 진입 시
  if (selectedInstructorForLeaflet) {
    return (
      <InstructorPrintableLeaflet
        profile={selectedInstructorForLeaflet}
        onBack={() => setSelectedInstructorForLeaflet(null)}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Culture Center Instructor Roster</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            문화센터 강사 스펙 관리 & 원클릭 홍보 포스터
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            강사 상세 약력과 개설 강좌를 관리하고, 원클릭으로 A4 단면 인쇄 포스터 및 수강생 모바일 QR 안내장을 발행합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingInstructor(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>신규 강사 스펙 등록</span>
        </button>
      </div>

      {/* 강사 프로필 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instructors.map((inst) => (
          <div
            key={inst.staffId}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:border-indigo-300 transition-all hover:shadow-md"
          >
            <div>
              {/* 카드 상단 이미지 및 타이틀 */}
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                <img
                  src={inst.profileImageUrl}
                  alt={inst.staffName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold mb-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>평점 {inst.rating} (수강후기 {inst.totalReviews}개)</span>
                  </div>
                  <h3 className="text-lg font-black">{inst.staffName}</h3>
                </div>
              </div>

              {/* 본문 정보 */}
              <div className="p-5 space-y-3">
                <div className="text-xs font-bold text-indigo-700 line-clamp-1">
                  {inst.headlineTitle}
                </div>

                <div className="flex flex-wrap gap-1">
                  {inst.specialties.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md"
                    >
                      #{s}
                    </span>
                  ))}
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{inst.academicBackground}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
                    <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">
                      {inst.certifications.slice(0, 2).join(', ')}
                    </span>
                  </div>
                </div>

                {/* 개설 강좌 요약 */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1 mb-1">
                    <BookOpen className="w-3 h-3 text-indigo-600" />
                    <span>대표 개설 강좌 ({inst.majorCourses.length}개)</span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium truncate">
                    {inst.majorCourses[0]?.courseName || '개설 강좌 준비 중'}
                  </div>
                </div>
              </div>
            </div>

            {/* 카드 액션 버튼 바 */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingInstructor(inst);
                  setIsModalOpen(true);
                }}
                className="flex-1 py-2 px-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>스펙 수정</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedInstructorForLeaflet(inst)}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>A4 인쇄 / 모바일</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 강사 스펙 등록/수정 모달 */}
      <InstructorProfileModal
        isOpen={isModalOpen}
        initialProfile={editingInstructor}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProfile}
      />
    </div>
  );
};
