import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import {
  evaluateAssessment,
  generateCertificateNumber,
  generateCertificateSvg,
  type RubricItem,
} from '../domain/levelAssessmentEngine';

interface AssessmentRow {
  id: string;
  title: string;
  target_program: string;
  assessment_date: string;
  passing_score: number;
  rubric_items: RubricItem[];
  status: string;
}

const DEFAULT_RUBRICS: RubricItem[] = [
  { id: 'r1', name: '기본기 및 정확성', maxScore: 40, weight: 40 },
  { id: 'r2', name: '표현력 및 테크닉', maxScore: 30, weight: 30 },
  { id: 'r3', name: '수련 자세 및 태도', maxScore: 30, weight: 30 },
];

export const LevelAssessmentView: React.FC = () => {
  const { query } = useList<AssessmentRow>({
    resource: 'level_assessments',
    sorters: [{ field: 'assessment_date', order: 'desc' }],
  });
  const assessments = query?.data?.data ?? [];
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createAssessment } = useCreate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [program, setProgram] = useState('태권도');
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [passingScore, setPassingScore] = useState(70);

  // 전자 합격증 미리보기 모달 상태
  const [previewCertSvg, setPreviewCertSvg] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    createAssessment(
      {
        resource: 'level_assessments',
        values: {
          title,
          target_program: program,
          assessment_date: assessmentDate,
          passing_score: Number(passingScore),
          rubric_items: DEFAULT_RUBRICS,
          status: 'scheduled',
        },
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          setTitle('');
          refetch();
        },
      }
    );
  };

  const handleDemoCertificate = () => {
    const certNum = generateCertificateNumber(new Date().getFullYear(), Math.floor(Math.random() * 899) + 100);
    const svg = generateCertificateSvg({
      studentName: '김민지',
      targetLevel: '태권도 1품(검은띠)',
      certificateNumber: certNum,
      issueDate: new Date().toISOString().slice(0, 10),
      organizationName: '우리 매장 태권도장',
    });
    setPreviewCertSvg(svg);
  };

  if (isLoading) {
    return <div className="p-6 text-slate-500">승급 심사 정보를 불러오는 중...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">정기 승급 심사 및 모바일 합격증</h1>
          <p className="text-sm text-slate-500 mt-1">
            승품·승급 루브릭 채점표를 작성하고, 합격 원생에게 W3C 표준 0원 모바일 전자 합격증을 즉시 발급합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDemoCertificate}
            className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition"
          >
            📜 전자 합격증 샘플 미리보기
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm transition"
          >
            + 새 심사 회차 개설
          </button>
        </div>
      </div>

      {/* 심사 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assessments.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
            개설된 정기 승급 심사가 없습니다. 새 심사 회차를 개설해보세요!
          </div>
        ) : (
          assessments.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {item.target_program}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{item.title}</h3>
                </div>
                <span className="text-xs font-mono text-slate-500">{item.assessment_date}</span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600 pt-2 border-t border-slate-100">
                <span>합격 커트라인: <strong className="text-slate-900">{item.passing_score}점</strong></span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px]">
                  상태: {item.status === 'scheduled' ? '접수/예정' : '심사 완료'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 개설 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">새 정기 승급 심사 회차 개설</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">심사 명칭</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 2026년 하반기 태권도 정기 승품·승단 심사"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">심사 과목/종목</label>
                  <select
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="태권도">태권도</option>
                    <option value="피아노/음악">피아노/음악</option>
                    <option value="검도/유도">검도/유도</option>
                    <option value="수영">수영</option>
                    <option value="미술">미술</option>
                    <option value="어학/영어">어학/영어</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">심사 일자</label>
                  <input
                    type="date"
                    required
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">합격 기준 점수 (100점 만점)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  개설 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 전자 합격증 미리보기 모달 */}
      {previewCertSvg && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">모바일 전자 합격증 미리보기 (W3C 표준 SVG)</h3>
              <button
                onClick={() => setPreviewCertSvg(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕ 닫기
              </button>
            </div>
            <div
              className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner max-h-[480px] flex items-center justify-center p-2 bg-slate-50"
              dangerouslySetInnerHTML={{ __html: previewCertSvg }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  const blob = new Blob([previewCertSvg], { type: 'image/svg+xml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Certificate_${Date.now()}.svg`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-semibold"
              >
                SVG 파일로 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
