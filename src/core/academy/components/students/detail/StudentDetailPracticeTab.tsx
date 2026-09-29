import React from 'react';
import { LessonRecord, PracticeRecord } from '@/types';
import { Plus } from 'lucide-react';

interface StudentDetailPracticeTabProps {
  allPractice: PracticeRecord[];
  allLessons: LessonRecord[];
  totalPracticeMinutes: number;
  isAddPrOpen: boolean;
  setIsAddPrOpen: (open: boolean) => void;
  newPrDate: string;
  setNewPrDate: (date: string) => void;
  newPrMinutes: number;
  setNewPrMinutes: (minutes: number) => void;
  newPrSong: string;
  setNewPrSong: (song: string) => void;
  newPrDifficulty: string;
  setNewPrDifficulty: (difficulty: string) => void;
  onSavePractice: (e: React.FormEvent) => void;
}

export const StudentDetailPracticeTab: React.FC<StudentDetailPracticeTabProps> = ({
  allPractice,
  allLessons,
  totalPracticeMinutes,
  isAddPrOpen,
  setIsAddPrOpen,
  newPrDate,
  setNewPrDate,
  newPrMinutes,
  setNewPrMinutes,
  newPrSong,
  setNewPrSong,
  newPrDifficulty,
  setNewPrDifficulty,
  onSavePractice,
}) => (
  <div className="space-y-6">
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">연습 · 진도</h4>
          <p className="text-xs text-slate-500">누적 연습시간: {totalPracticeMinutes}분 · 수업 노트는 아래에서 확인</p>
        </div>
        <button
          onClick={() => setIsAddPrOpen(true)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> 연습 기록 추가
        </button>
      </div>

      {isAddPrOpen && (
        <form onSubmit={onSavePractice} className="p-4 bg-teal-50/70 rounded-2xl border border-teal-200 space-y-3 mb-4">
          <h5 className="text-xs font-bold text-teal-900">새 연습 기록 등록</h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">연습일</label>
              <input
                type="date"
                value={newPrDate}
                onChange={(e) => setNewPrDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">연습 시간 (분)</label>
              <input
                type="number"
                value={newPrMinutes}
                onChange={(e) => setNewPrMinutes(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">연습곡/교재</label>
              <input
                type="text"
                placeholder="예: 체르니 100번 38번, 하농 5번"
                value={newPrSong}
                onChange={(e) => setNewPrSong(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">어려운 부분 / 집중 포인트</label>
              <input
                type="text"
                placeholder="예: 4번 손가락 독립 및 왼손 반주 리듬"
                value={newPrDifficulty}
                onChange={(e) => setNewPrDifficulty(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddPrOpen(false)}
              className="px-3 py-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-1 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700"
            >
              저장
            </button>
          </div>
        </form>
      )}

      {allPractice.length === 0 ? (
        <p className="text-xs text-slate-500 p-4 text-center bg-slate-50 rounded-2xl">연습 기록이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {allPractice.map((pr) => (
            <div key={pr.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{pr.date} ({pr.minutes}분 연습)</span>
                <span className="text-amber-600 font-bold">{pr.teacherEvaluation || '평가 완료'}</span>
              </div>
              <p className="text-indigo-700 font-semibold mt-1">🎵 {pr.songTitle}</p>
              {pr.difficultyPart && (
                <p className="text-slate-600 text-[11px] mt-1">포인트: {pr.difficultyPart}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="pt-4 border-t border-slate-200">
      <h4 className="text-sm font-bold text-slate-900 mb-3">선생님 수업 기록</h4>
      {allLessons.length === 0 ? (
        <p className="text-xs text-slate-500 p-4 text-center bg-slate-50 rounded-2xl">수업 일지가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {allLessons.map((ls) => (
            <div key={ls.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{ls.date} 수업</span>
                <span className="text-slate-500">{ls.teacherName}</span>
              </div>
              <p className="font-bold text-indigo-700">진도: {ls.songTitle} ({ls.progress})</p>
              <p className="text-slate-700 leading-relaxed">{ls.lessonContent}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/60 mt-2">
                <div>
                  <strong className="text-emerald-700">잘한 점:</strong> {ls.strengths}
                </div>
                <div>
                  <strong className="text-rose-700">보완점:</strong> {ls.weaknesses}
                </div>
              </div>
              {ls.homework && (
                <p className="text-[11px] text-purple-700 font-semibold mt-1">
                  📝 숙제: {ls.homework}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
