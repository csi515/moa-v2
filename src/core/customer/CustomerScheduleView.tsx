import React, { useEffect, useMemo, useState } from 'react';
import { StorageService } from '@/services/storage';
import {
  practiceRoomReservationService,
  seoulDateFromIso,
  seoulTimeFromIso,
  type RoomReservationRow,
} from './services/practiceRoomReservationService';
import {
  getTodayClasses,
  getUpcomingWeekOccurrences,
} from '@/core/academy/utils/classOccurrenceHelpers';
import { todayIsoLocal } from '@/shared/utils/localDate';

function statusLabel(status: string): string {
  if (status === 'pending') return '승인 대기';
  if (status === 'approved') return '승인';
  return status;
}

/** 성인 수강생 — 등록 반 + 연습실 일정 */
export function CustomerScheduleView({
  customerId,
  organizationId,
  displayName,
}: {
  customerId: string;
  organizationId: string;
  displayName: string;
}) {
  const student = useMemo(() => {
    return StorageService.getStudents().find((s) => s.id === customerId) || null;
  }, [customerId]);

  const classes = useMemo(() => {
    const ids = new Set(student?.classIds || []);
    return StorageService.getClasses()
      .filter((c) => ids.has(c.id))
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.name.localeCompare(b.name, 'ko'));
  }, [student?.classIds]);

  const todayClasses = useMemo(() => getTodayClasses(classes), [classes]);
  const weekOccurrences = useMemo(() => getUpcomingWeekOccurrences(classes), [classes]);

  const [practiceBookings, setPracticeBookings] = useState<RoomReservationRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void practiceRoomReservationService
      .listForCustomer(organizationId, customerId, { fromDate: todayIsoLocal(), limit: 10 })
      .then((rows) => {
        if (!cancelled) setPracticeBookings(rows);
      })
      .catch(() => {
        if (!cancelled) setPracticeBookings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, customerId]);

  const today = todayIsoLocal();
  const todayPractice = practiceBookings.filter((b) => seoulDateFromIso(b.starts_at) === today);

  if (classes.length === 0 && practiceBookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <p className="text-sm text-slate-400">
          {displayName}님의 등록된 수업·연습 일정이 없습니다. 사업장에 문의해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-black text-slate-900">오늘</h2>
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
                    {statusLabel(b.status)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {practiceBookings.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <h2 className="text-sm font-black text-slate-900">연습실 예약</h2>
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
                  <p className="text-[11px] text-slate-500 mt-0.5">{statusLabel(b.status)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {classes.length > 0 && (
        <>
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <h2 className="text-sm font-black text-slate-900">이번 주</h2>
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
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-black text-slate-900">등록 반</h2>
            <ul className="space-y-3">
              {classes.map((cls) => (
                <li key={cls.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <p className="font-bold text-sm text-slate-900">{cls.name}</p>
                  <p className="text-xs text-slate-600 mt-1.5">
                    {cls.daysOfWeek.join('·')} · {cls.startTime}–{cls.endTime}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {cls.teacherName}
                    {cls.room ? ` · ${cls.room}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
