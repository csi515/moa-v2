import React from 'react';
import { StorageService } from '@/services/storage';
import type { Student } from '@/types';
import { MiniStat, Section } from './shared';

export function ParentReportsView({ student }: { student: Student }) {
  const reports = StorageService.getLearningReports(student.id, true);

  return (
    <div className="space-y-4">
      {reports.length === 0 ? (
        <Section title="학습 리포트">
          <p className="text-sm text-slate-400 text-center py-6">발행된 리포트가 없습니다.</p>
        </Section>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <p className="text-xs text-indigo-600 font-bold">{r.yearMonth} 월간 리포트</p>
            <h3 className="font-black text-lg mt-1">{student.name}</h3>
            {r.summary && <p className="text-sm text-slate-600 mt-2">{r.summary}</p>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <MiniStat label="출석률" value={`${r.attendanceRate ?? 0}%`} />
              <MiniStat label="연습 시간" value={`${r.practiceMinutes ?? 0}분`} />
              <MiniStat label="수업" value={`${r.lessonsCount ?? 0}회`} />
              <MiniStat label="완료 곡" value={`${r.songsCompleted ?? 0}곡`} />
            </div>
            {r.strengths && (
              <p className="text-xs mt-3"><strong>잘한 점:</strong> {r.strengths}</p>
            )}
            {r.improvements && (
              <p className="text-xs mt-1"><strong>보완점:</strong> {r.improvements}</p>
            )}
            {r.goalsNextMonth && (
              <p className="text-xs mt-1"><strong>다음 달 목표:</strong> {r.goalsNextMonth}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
