import { useMemo } from 'react';
import { StorageService } from '@/services/storage';
import { useStorageRefresh } from '@/hooks';
import type { Student } from '@/types';
import { Section } from './shared';
import { EmptyState } from '@/shared/components';

function formatWhen(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ParentIncidentView({ student }: { student: Student }) {
  const refreshKey = useStorageRefresh();
  const incidents = useMemo(
    () =>
      StorageService.getCareIncidents()
        .filter((item) => item.studentId === student.id)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [student.id, refreshKey]
  );

  return (
    <Section title={`${student.name} 사고 안내`}>
      {incidents.length === 0 ? (
        <EmptyState title="전달된 사고 기록이 없습니다" className="!bg-transparent !border-none !p-4" />
      ) : (
        <div className="space-y-3">
          {incidents.map((item) => (
            <article key={item.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/80">
              <p className="text-sm font-bold text-slate-900 font-mono">{formatWhen(item.occurredAt)}</p>
              <p className="text-xs text-slate-700 mt-2 whitespace-pre-wrap">{item.content}</p>
              <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">조치 · {item.actionTaken}</p>
              <p className="text-[11px] text-slate-400 mt-2">알림 {formatWhen(item.parentNotifiedAt)}</p>
            </article>
          ))}
        </div>
      )}
    </Section>
  );
};
