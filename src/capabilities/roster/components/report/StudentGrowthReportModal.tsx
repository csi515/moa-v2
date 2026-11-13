import { useEscapeKey } from '@/shared/hooks/useMoaHotkeys';

import React, { useState, useEffect } from 'react';
import { Printer, X, Sparkles, Award, Music, Clock, CheckCircle2, BookOpen, Edit3 } from 'lucide-react';
import type { StudentReportTarget } from './growthReportHelpers';
import { buildGrowthReportData, type StudentGrowthReportData } from './growthReportHelpers';

export interface StudentGrowthReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentReportTarget;
  academyName?: string;
}

export const StudentGrowthReportModal: React.FC<StudentGrowthReportModalProps> = ({
  isOpen,
  onClose,
  student,
  academyName = '모아 음악학원',
}) => {
  const [report, setReport] = useState<StudentGrowthReportData>(() =>
    buildGrowthReportData(student, { academyName })
  );
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(report.teacherComment);

  useEffect(() => {
    if (student) {
      const data = buildGrowthReportData(student, { academyName });
      setReport(data);
      setCommentDraft(data.teacherComment);
    }
  }, [student, academyName]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveComment = () => {
    setReport((prev) => ({ ...prev, teacherComment: commentDraft }));
    setIsEditingComment(false);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto cursor-pointer print:p-0 print:bg-white print:static"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] cursor-default print:max-h-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* 모달 툴바 (인쇄 시 숨김) */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {student.name} 월간 성장 리포트
              </h3>
              <p className="text-[11px] text-slate-500">A4 규격 인쇄 및 PDF 저장 지원</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>A4 인쇄 / PDF 저장</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              aria-label="닫기"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 리포트 본문 (A4 규격 프리뷰 & 인쇄 전용 영역) */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100/60 flex justify-center print:p-0 print:bg-white">
          <article className="w-full max-w-[210mm] bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 space-y-6 text-slate-800 print:shadow-none print:border-none print:p-6 print:rounded-none">
            {/* 리포트 헤더 */}
            <header className="border-b-2 border-indigo-600 pb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-extrabold text-indigo-600 tracking-wider uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> MONTHLY GROWTH REPORT
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5 tracking-tight">
                  피아노 레슨 종합 성장 리포트
                </h1>
                <p className="text-xs text-slate-500 mt-1">{report.academyName} · {report.period}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold block">성명</span>
                <span className="text-lg font-black text-slate-900">{report.studentName}</span>
                <span className="text-xs text-slate-500 block">담당 강사: {report.instructorName}</span>
              </div>
            </header>

            {/* 1. 학습 및 연습 성실도 지표 */}
            <section className="grid grid-cols-3 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="text-center">
                <span className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 출결률
                </span>
                <p className="text-xl font-black text-emerald-600 mt-1">{report.attendanceRate}%</p>
                <span className="text-[10px] text-slate-400">총 {report.totalLessons}회 중 {report.attendedLessons}회 출석</span>
              </div>
              <div className="text-center border-x border-slate-200">
                <span className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> 자율 연습 시간
                </span>
                <p className="text-xl font-black text-indigo-600 mt-1">{report.practiceHours}시간</p>
                <span className="text-[10px] text-slate-400">학원 연습실 이용 총계</span>
              </div>
              <div className="text-center">
                <span className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" /> 현재 레슨 진도
                </span>
                <p className="text-base sm:text-lg font-black text-purple-700 mt-1 truncate">
                  {report.currentLevel}
                </p>
                <span className="text-[10px] text-slate-400">맞춤 커리큘럼</span>
              </div>
            </section>

            {/* 2. 완곡 및 연습 레퍼토리 */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Award className="w-4 h-4 text-amber-500" /> 이번 달 마스터(완곡) 곡목
                </h4>
                <ul className="space-y-1.5 text-xs">
                  {report.completedSongs.map((song, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-700">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                        ✓
                      </span>
                      <span className="font-semibold">{song}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Music className="w-4 h-4 text-indigo-600" /> 현재 연습 중인 곡
                </h4>
                <ul className="space-y-1.5 text-xs">
                  {report.practicingSongs.map((song, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-700">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-semibold">{song}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 3. 담당 강사 종합 총평 */}
            <section className="border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>담당 강사 지도 총평 & 격려 말씀</span>
                </h4>
                {!isEditingComment && (
                  <button
                    type="button"
                    onClick={() => setIsEditingComment(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 print:hidden cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    총평 수정
                  </button>
                )}
              </div>

              {isEditingComment ? (
                <div className="space-y-2 print:hidden">
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    rows={4}
                    className="w-full text-xs p-3 rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingComment(false)}
                      className="px-3 py-1 text-xs text-slate-600 font-bold bg-white border border-slate-200 rounded-lg cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveComment}
                      className="px-3 py-1 text-xs text-white font-bold bg-indigo-600 rounded-lg cursor-pointer"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {report.teacherComment}
                </p>
              )}
            </section>

            {/* 리포트 푸터 (학원 직인란) */}
            <footer className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
              <span>{report.academyName} 교육지원팀 발송</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-600">{report.academyName} 원장</span>
                <div className="w-10 h-10 rounded-full border border-rose-300 bg-rose-50/60 text-rose-600 flex items-center justify-center font-serif text-[11px] font-bold">
                  (인)
                </div>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
};
