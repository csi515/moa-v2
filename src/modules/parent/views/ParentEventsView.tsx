import { useMemo } from 'react';
import { StorageService } from '@/services/storage';
import { ACADEMY_EVENT_TYPE_LABEL, PERFORMANCE_VIDEO_TYPE_LABEL } from '@/industries/piano/config/eventLabels';
import { normalizeIndustryType, type IndustryType } from '@/core/industry/types';
import type { Student } from '@/types';
import { Section } from './shared';

function isYoutubeUrl(url: string): boolean {
  return /youtu\.?be/i.test(url);
}

/** 학원 캘린더·연주회·연주 영상 (업종별) */
export function ParentEventsView({
  student,
  industryType = 'piano',
}: {
  student: Student;
  industryType?: IndustryType | string;
}) {
  const industry = normalizeIndustryType(industryType);

  const events = useMemo(() => {
    return StorageService.getEvents()
      .filter((e) => {
        if (!e.participantIds || e.participantIds.length === 0) return true;
        return e.participantIds.includes(student.id);
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [student.id]);

  const videos =
    industry === 'piano'
      ? StorageService.getPerformanceVideosByStudentId(student.id).slice(0, 12)
      : [];

  const sectionTitle =
    industry === 'gym' ? '체육관 일정' : industry === 'daycare' ? '원 일정' : '학원 일정·행사';

  return (
    <div className="space-y-4">
      <Section title={sectionTitle}>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">예정된 일정이 없습니다.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="py-3 border-b border-slate-50">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-sm text-slate-900">{ev.title}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                  {ACADEMY_EVENT_TYPE_LABEL[ev.type] || ev.type}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                {ev.startDate}
                {ev.endDate && ev.endDate !== ev.startDate ? ` ~ ${ev.endDate}` : ''}
              </p>
              {ev.description && (
                <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{ev.description}</p>
              )}
            </div>
          ))
        )}
      </Section>

      {industry === 'piano' && (
        <Section title="연주 영상">
          {videos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">등록된 연주 영상이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {videos.map((v) => (
                <li key={v.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/80">
                  <p className="font-bold text-sm text-slate-900">{v.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {PERFORMANCE_VIDEO_TYPE_LABEL[v.eventType]}
                    {v.songTitle ? ` · ${v.songTitle}` : ''}
                    {v.recordedDate ? ` · ${v.recordedDate}` : ''}
                  </p>
                  {isYoutubeUrl(v.youtubeUrl) ? (
                    <a
                      href={v.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex mt-2 text-xs font-bold text-indigo-600 min-h-[44px] items-center"
                    >
                      YouTube에서 보기
                    </a>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-2 truncate">{v.youtubeUrl}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}
