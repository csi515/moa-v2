import React, { useState } from 'react';
import {
  Printer,
  Share2,
  QrCode,
  CheckCircle,
  Copy,
  ArrowLeft,
  GraduationCap,
  Briefcase,
  Award,
  Sparkles,
  Phone,
  MapPin,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  InstructorProfile,
  generatePrintableLeafletData,
  PrintableLeafletData,
} from '../domain/instructorMatchEngine';

export interface InstructorPrintableLeafletProps {
  profile: InstructorProfile;
  centerInfo?: {
    centerName?: string;
    phone?: string;
    location?: string;
  };
  onBack?: () => void;
}

export const InstructorPrintableLeaflet: React.FC<InstructorPrintableLeafletProps> = ({
  profile,
  centerInfo,
  onBack,
}) => {
  const [viewMode, setViewMode] = useState<'a4_poster' | 'mobile_card'>('a4_poster');
  const [copied, setCopied] = useState(false);

  const leafletData: PrintableLeafletData = generatePrintableLeafletData(profile, centerInfo);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(leafletData.footer.qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      {/* 화면 조작 툴바 (인쇄 시 숨김: no-print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200 print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {profile.staffName} 강사 안내 리플릿
            </h2>
            <p className="text-xs text-slate-500">
              A4 단면 인쇄 포스터 및 수강생 모바일 웹 카드 지원
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 뷰 모드 전환 버튼 */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('a4_poster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'a4_poster'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              A4 포스터 모드
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile_card')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'mobile_card'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              모바일 카드 모드
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '복사됨!' : '모바일 링크 복사'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>A4 포스터 인쇄하기</span>
          </button>
        </div>
      </div>

      {/* 인쇄 전용 CSS 주입 */}
      <style>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .a4-print-canvas {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* 1. A4 포스터 레이아웃 */}
      {viewMode === 'a4_poster' && (
        <div className="max-w-[210mm] mx-auto bg-white border border-slate-300 rounded-xl shadow-lg p-8 a4-print-canvas text-slate-900">
          {/* 상단 브랜드 & 타이틀 바 */}
          <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-4 mb-6">
            <div>
              <span className="text-[11px] font-extrabold tracking-widest text-indigo-700 uppercase">
                {leafletData.footer.centerName}
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
                {leafletData.header.headlineTitle}
              </h1>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>전문 강사진 특강</span>
            </div>
          </div>

          {/* 프로필 헤더 섹션: 사진 + 이름 + 전문분야 */}
          <div className="flex items-start gap-6 mb-6">
            <div className="w-32 h-40 rounded-xl overflow-hidden border border-slate-200 shadow-xs shrink-0 bg-slate-100">
              <img
                src={leafletData.header.profileImageUrl}
                alt={leafletData.header.instructorName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400';
                }}
              />
            </div>

            <div className="flex-1">
              <div className="flex items-baseline gap-2.5 mb-2">
                <h2 className="text-2xl font-black text-slate-900">
                  {leafletData.header.instructorName}
                </h2>
                <span className="text-sm font-semibold text-slate-500">전임 강사</span>
              </div>

              {/* 전문 분야 뱃지 */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {leafletData.header.specialtiesBadge.map((spec, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200"
                  >
                    #{spec}
                  </span>
                ))}
              </div>

              {/* 강사 소개글 */}
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                "{leafletData.introduction}"
              </p>
            </div>
          </div>

          {/* 핵심 스펙 그리드: 학력 / 경력 / 자격증 */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200 mb-6 text-xs">
            {/* 학력 */}
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-2 border-b border-slate-200 pb-1">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>학력 사항</span>
              </div>
              <div className="text-slate-600 leading-snug">
                {leafletData.credentials.academic}
              </div>
            </div>

            {/* 주요 경력 */}
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-2 border-b border-slate-200 pb-1">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span>주요 경력</span>
              </div>
              <ul className="space-y-1 text-slate-600">
                {leafletData.credentials.careers.slice(0, 4).map((car, i) => (
                  <li key={i} className="truncate">• {car}</li>
                ))}
              </ul>
            </div>

            {/* 자격 및 면허 */}
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-2 border-b border-slate-200 pb-1">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>자격 및 수상</span>
              </div>
              <ul className="space-y-1 text-slate-600">
                {leafletData.credentials.certifications.concat(leafletData.credentials.awards).slice(0, 4).map((cert, i) => (
                  <li key={i} className="truncate">• {cert}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 개설 강좌 및 시간표 섹션 */}
          <div className="mb-6">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 mb-3">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>개설 강좌 & 수강 일정</span>
            </h3>

            <div className="space-y-3">
              {leafletData.courses.map((course, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white rounded-xl border border-indigo-100 shadow-xs flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{course.courseName}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                        {course.targetAudience}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {course.scheduleSummary}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-4 border-l border-slate-100">
                    <span className="text-xs font-bold text-indigo-600 block">수강 신청 접수 중</span>
                    <span className="text-[11px] text-slate-400">선착순 마감</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 하단 푸터 및 수강 신청 안내 */}
          <div className="pt-4 border-t-2 border-slate-200 flex items-center justify-between text-xs">
            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-sm">
                수강 신청 및 문의처: {leafletData.footer.centerName}
              </div>
              <div className="text-slate-500 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {leafletData.footer.contactPhone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {leafletData.footer.locationInfo}
                </span>
              </div>
            </div>

            {/* 모바일 간이 QR 코드 (SVG) */}
            <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <div className="w-12 h-12 bg-white p-1 rounded-md border border-slate-300 flex items-center justify-center">
                <svg viewBox="0 0 33 33" className="w-full h-full text-slate-900 fill-current">
                  <rect x="0" y="0" width="10" height="10" />
                  <rect x="2" y="2" width="6" height="6" fill="#fff" />
                  <rect x="3" y="3" width="4" height="4" />
                  <rect x="23" y="0" width="10" height="10" />
                  <rect x="25" y="2" width="6" height="6" fill="#fff" />
                  <rect x="26" y="3" width="4" height="4" />
                  <rect x="0" y="23" width="10" height="10" />
                  <rect x="2" y="25" width="6" height="6" fill="#fff" />
                  <rect x="3" y="26" width="4" height="4" />
                  <rect x="14" y="2" width="5" height="5" />
                  <rect x="14" y="14" width="5" height="5" />
                  <rect x="23" y="14" width="5" height="5" />
                  <rect x="14" y="26" width="5" height="5" />
                  <rect x="26" y="26" width="5" height="5" />
                </svg>
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                <span className="font-bold text-slate-800 block">모바일 접수</span>
                스마트폰 카메라로<br />QR 스캔
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. 모바일 수강생 웹 카드 뷰 */}
      {viewMode === 'mobile_card' && (
        <div className="max-w-sm mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 text-slate-900">
          {/* 모바일 상단 커버 이미지 */}
          <div className="relative h-48 bg-slate-900 overflow-hidden">
            <img
              src={leafletData.header.profileImageUrl}
              alt={leafletData.header.instructorName}
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-600/90 text-white mb-1.5 inline-block">
                {leafletData.footer.centerName}
              </span>
              <h2 className="text-xl font-black">{leafletData.header.instructorName} 강사</h2>
              <p className="text-xs text-indigo-200 font-medium truncate">
                {leafletData.header.headlineTitle}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* 전문 분야 태그 */}
            <div className="flex flex-wrap gap-1">
              {leafletData.header.specialtiesBadge.map((spec, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md"
                >
                  #{spec}
                </span>
              ))}
            </div>

            {/* 강사 소개 */}
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              "{leafletData.introduction}"
            </p>

            {/* 학력 및 경력 요약 */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-800">대표 약력</div>
              <div className="text-slate-600 space-y-1">
                <div>🎓 {leafletData.credentials.academic}</div>
                {leafletData.credentials.careers.slice(0, 2).map((c, i) => (
                  <div key={i}>💼 {c}</div>
                ))}
              </div>
            </div>

            {/* 개설 강좌 리스트 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="font-bold text-slate-800 text-xs">수강 신청 가능 강좌</div>
              {leafletData.courses.map((course, idx) => (
                <div key={idx} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <div className="text-xs font-bold text-slate-900">{course.courseName}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{course.scheduleSummary}</div>
                  <div className="text-[11px] font-semibold text-indigo-700 mt-1">
                    정원 및 대상: {course.targetAudience}
                  </div>
                </div>
              ))}
            </div>

            {/* 모바일 하단 수강 신청 버튼 */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => alert(`[수강 신청 안내] ${leafletData.footer.contactPhone}으로 전화 연결하거나 안내데스크를 방문해주세요.`)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone className="w-4 h-4" />
                <span>수강 신청 및 상담 문의</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
