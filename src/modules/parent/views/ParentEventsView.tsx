import { useMemo } from 'react';
import { useList } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import { ACADEMY_EVENT_TYPE_LABEL, PERFORMANCE_VIDEO_TYPE_LABEL } from '@/industries/piano/config/eventLabels';
import { getIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryType } from '@/core/industry/types';
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
  const { currentOrganization } = useOrganization();
  const plugin = getIndustryPlugin(industryType);
  const { showsPerformanceVideos, parentEventsSectionTitle } = plugin;

  const data = useList<any>({
    resource: 'events',
    meta: { schema: 'core' },
    filters: [{ field: 'organization_id', operator: 'eq', value: currentOrganization?.id }],
    queryOptions: { enabled: !!currentOrganization?.id },
  });
  const rawEvents = (data as any).data?.data || (data as any).data || (data as any).query?.data?.data || [];

  const events = useMemo(() => {
    return rawEvents
      .filter((e: any) => {
        const participantIds = e.metadata?.participantIds || [];
        if (participantIds.length === 0) return true;
        return participantIds.includes(student.id);
      })
      .map((e: any) => ({
        id: e.id,
        title: e.title,
        type: e.event_type,
        startDate: e.start_date,
        endDate: e.end_date,
        description: e.description,
      }))
      .sort((a: any, b: any) => b.startDate.localeCompare(a.startDate));
  }, [rawEvents, student.id]);

  const videos =
    showsPerformanceVideos
      ? StorageService.getPerformanceVideosByStudentId(student.id).slice(0, 12)
      : [];

  const sectionTitle = parentEventsSectionTitle || '일정';

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

      {showsPerformanceVideos && (
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
