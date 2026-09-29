import { useEffect, useMemo, useState } from 'react';
import { StorageService } from '@/services/storage';
import type { Student } from '@/types';
import {
  practiceRoomReservationService,
  seoulDateFromIso,
  seoulTimeFromIso,
  type RoomReservationRow,
} from '@/core/customer/services/practiceRoomReservationService';
import { Section } from './shared';
import {
  getTodayClasses,
  getUpcomingWeekOccurrences,
} from '../utils/parentScheduleHelpers';
import { todayIsoLocal } from '@/shared/utils/localDate';

/** 등록 반·오늘/이번 주·연습실 예약 (canonical room_reservations) */
export function ParentScheduleView({
  student,
  organizationId,
}: {
  student: Student;
  organizationId: string;
}) {
  const classes = useMemo(() => {
    const ids = new Set(student.classIds || []);
    return StorageService.getClasses()
      .filter((c) => ids.has(c.id))
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.name.localeCompare(b.name, 'ko'));
  }, [student.classIds]);

  const todayClasses = useMemo(() => getTodayClasses(classes), [classes]);
  const weekOccurrences = useMemo(() => getUpcomingWeekOccurrences(classes), [classes]);

  const [practiceBookings, setPracticeBookings] = useState<RoomReservationRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const today = todayIsoLocal();
    void practiceRoomReservationService
      .listForCustomer(organizationId, student.id, { fromDate: today, limit: 10 })
      .then((rows) => {
        if (!cancelled) setPracticeBookings(rows);
      })
      .catch(() => {
        // RLS/마이그레이션 미적용 시 레거시 로컬 캐시 폴백
        if (cancelled) return;
        const legacy = StorageService.getPracticeRoomBookings(student.id)
          .filter((b) => b.status === 'scheduled' && b.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
          .slice(0, 10)
          .map(
            (b): RoomReservationRow => ({
              id: b.id,
              organization_id: organizationId,
              room_id: '',
              customer_id: student.id,
              requested_by: '',
              starts_at: `${b.date}T${b.startTime}:00+09:00`,
              ends_at: `${b.date}T${b.endTime}:00+09:00`,
              status: 'approved',
              memo: b.memo,
              practice_rooms: { name: b.room },
              customers: { name: student.name },
            })
          );
        setPracticeBookings(legacy);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, student.id, student.name]);

  const today = todayIsoLocal();
  const todayPractice = practiceBookings.filter((b) => seoulDateFromIso(b.starts_at) === today);

  if (classes.length === 0 && practiceBookings.length === 0) {
    return (
      <Section title={`${student.name} 수업 일정`}>
        <p className="text-sm text-slate-400 text-center py-6">
          등록된 수업 반이 없습니다. 학원에 문의해 주세요.
        </p>
      </Section>
    );
  }

  return (
    <div className="space-y-4">
      <Section title="오늘">
        {todayClasses.length === 0 && todayPractice.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">오늘 예정된 수업·연습이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {todayClasses.map((cls) => (
              <li
                key={cls.id}
                className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50"
              >
                <p className="font-extrabold text-base text-slate-900">
                  {cls.startTime}–{cls.endTime}
                </p>
                <p className="font-bold text-sm text-slate-900 mt-1">{cls.name}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {[cls.teacherName, cls.room].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
            {todayPractice.map((b) => (
              <li
                key={b.id}
                className="p-4 rounded-2xl border border-amber-100 bg-amber-50/50"
              >
                <p className="font-extrabold text-base text-slate-900">
                  {seoulTimeFromIso(b.starts_at)}–{seoulTimeFromIso(b.ends_at)}
                </p>
                <p className="font-bold text-sm text-slate-900 mt-1">
                  연습실 · {b.practice_rooms?.name || '연습실'}
                  <span className="ml-2 text-[10px] font-bold text-amber-800">
                    {b.status === 'pending' ? '승인 대기' : b.status === 'approved' ? '승인' : b.status}
                  </span>
                </p>
                {b.memo && <p className="text-[11px] text-slate-500 mt-1">{b.memo}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {practiceBookings.length > 0 && (
        <Section title="연습실 예약">
          <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
            연습실 예약 신청·변경은 학원에 요청해 주세요. (성인 수강생 앱에서는 본인 신청 가능)
          </p>
          <ul className="space-y-2">
            {practiceBookings.map((b) => (
              <li
                key={b.id}
                className="flex items-start justify-between gap-2 p-3 rounded-xl border border-amber-100 bg-amber-50/40 min-h-[52px]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {seoulDateFromIso(b.starts_at)} {seoulTimeFromIso(b.starts_at)}–
                    {seoulTimeFromIso(b.ends_at)} · {b.practice_rooms?.name || '연습실'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {b.status === 'pending'
                      ? '승인 대기'
                      : b.status === 'approved'
                        ? '승인됨'
                        : b.status}
                    {b.memo ? ` · ${b.memo}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {classes.length > 0 && (
        <>
          <Section title="이번 주">
            <ul className="space-y-2">
              {weekOccurrences.map((occ) => (
                <li
                  key={`${occ.date}-${occ.classItem.id}`}
                  className="flex items-start justify-between gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/80 min-h-[52px]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {occ.dayLabel} {occ.classItem.startTime} · {occ.classItem.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {occ.date}
                      {occ.classItem.room ? ` · ${occ.classItem.room}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="등록 반 (매주)">
            <ul className="space-y-3">
              {classes.map((cls) => (
                <li
                  key={cls.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-white"
                >
                  <p className="font-bold text-sm text-slate-900">{cls.name}</p>
                  <p className="text-xs text-slate-600 mt-1.5">
                    {cls.daysOfWeek.join('·')} · {cls.startTime}–{cls.endTime}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {cls.teacherName}
                    {cls.room ? ` · ${cls.room}` : ''}
                  </p>
                  {cls.memo && (
                    <p className="text-[11px] text-slate-400 mt-2 whitespace-pre-wrap">{cls.memo}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}
