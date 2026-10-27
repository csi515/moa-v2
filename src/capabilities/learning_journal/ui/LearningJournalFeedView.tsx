import React, { useState } from 'react';
import { useList, useCreate } from '@refinedev/core';
import {
  calculateJournalStats,
  type LearningJournal,
} from '../domain/learningJournalEngine';

export const LearningJournalFeedView: React.FC = () => {
  const { query } = useList<LearningJournal>({
    resource: 'learning_journals',
    sorters: [{ field: 'lesson_date', order: 'desc' }],
    pagination: { pageSize: 50 },
  });
  const data = query?.data;
  const isLoading = query?.isLoading;
  const refetch = query?.refetch ?? (() => {});

  const { mutate: createJournal } = useCreate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [studentName, setStudentName] = useState('');
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().slice(0, 10));
  const [homework, setHomework] = useState('');

  const journals = data?.data ?? [];
  const stats = calculateJournalStats(journals);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !studentName) return;

    createJournal(
      {
        resource: 'learning_journals',
        values: {
          title,
          content,
          student_id: `std-${Date.now().toString(36)}`,
          author_staff_id: `staff-${Date.now().toString(36)}`,
          lesson_date: lessonDate,
          practice_homework: homework || null,
          media_urls: [],
          parent_acknowledgement: false,
        },
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          setTitle('');
          setContent('');
          setStudentName('');
          setHomework('');
          refetch();
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-6 text-slate-500">수업 일지 피드를 불러오는 중...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 상단 헤더 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">수업 일지 및 성장 알림장 피드</h1>
          <p className="text-sm text-slate-500 mt-1">
            원생별 수업 진도, 연습 과제, 칭찬 코멘트를 작성하고 학부모 포털 피드로 실시간 소통합니다.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-sm transition"
        >
          + 새 수업 일지 작성
        </button>
      </div>

      {/* 요약 통계 3대 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">누적 작성 일지</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalJournals}건</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600">학부모 확인 완료</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.acknowledgedCount}건</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-indigo-600">학부모 피드 확인율</div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">{stats.acknowledgementRate}%</div>
        </div>
      </div>

      {/* 피드 목록 */}
      <div className="space-y-4">
        {journals.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
            아직 등록된 수업 일지가 없습니다. 첫 번째 일지를 작성해보세요!
          </div>
        ) : (
          journals.map((journal) => (
            <div
              key={journal.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-slate-900">{journal.title}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                    {journal.lesson_date}
                  </span>
                </div>
                <div>
                  {journal.parent_acknowledgement ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ 학부모 확인 완료
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      ⏳ 학부모 확인 대기
                    </span>
                  )}
                </div>
              </div>

              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {journal.content}
              </div>

              {journal.practice_homework && (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 space-y-1">
                  <span className="font-bold text-indigo-700">📌 오늘의 보충 연습 과제:</span>
                  <div>{journal.practice_homework}</div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 새 일지 작성 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">새 수업 일지 작성</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">원생 이름</label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="예: 김민지"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">수업 일자</label>
                  <input
                    type="date"
                    required
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">일지 제목</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 체르니 100번 5번곡 양손 밸런스 지도"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">수업 내용 및 칭찬 피드백</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="오늘 집중 지도한 내용과 원생의 성장 포인트를 입력해주세요."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">보충 연습 과제 (선택)</label>
                <input
                  type="text"
                  value={homework}
                  onChange={(e) => setHomework(e.target.value)}
                  placeholder="예: 하루 15분씩 메트로놈 80에 맞춰 오른손 연습"
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
                  발행 및 피드 전송
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
