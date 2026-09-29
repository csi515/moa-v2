import { useEffect, useState } from 'react';
import { Calendar, ChevronRight, Clock, Users } from 'lucide-react';
import type { BookableSchedule } from '@/types';
import { coreScheduleService } from '@/core/schedules';
import { ReservationModal } from './ReservationModal';

interface PublicBookingSectionProps {
  organizationId: string;
  isConsultationMode: boolean;
  isAuthenticated: boolean;
}

function toDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateTime(isoString: string) {
  return new Date(isoString).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateLabel(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function formatTimeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * 예약 가능 슬롯 조회·표시. organizationId가 확정된 뒤에만 마운트되어야 한다.
 */
export function PublicBookingSection({
  organizationId,
  isConsultationMode,
  isAuthenticated,
}: PublicBookingSectionProps) {
  const [bookableSchedules, setBookableSchedules] = useState<BookableSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<BookableSchedule | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBookableSchedules() {
      try {
        setLoadingSchedules(true);
        const schedules = await coreScheduleService.listBookableSchedules(organizationId);
        if (!cancelled) setBookableSchedules(schedules);
      } catch (err) {
        console.error('Failed to load bookable schedules:', err);
        // Silent fail - bookable schedules are optional
      } finally {
        if (!cancelled) setLoadingSchedules(false);
      }
    }

    loadBookableSchedules();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const handleOpenBookingForm = (schedule: BookableSchedule) => {
    if (!isAuthenticated) {
      alert('슬롯 예약은 로그인이 필요합니다. 로그인 없이 아래 상담 문의 양식을 이용할 수 있습니다.');
      return;
    }
    setSelectedSchedule(schedule);
    setShowBookingForm(true);
  };

  const dateKeys = (
    Array.from(new Set(bookableSchedules.map((s) => toDateKey(s.starts_at)))) as string[]
  ).sort();

  const effectiveDateKey = selectedDateKey || dateKeys[0] || '';
  const slotsForDate = bookableSchedules.filter((s) => {
    if (!effectiveDateKey) return true;
    return toDateKey(s.starts_at) === effectiveDateKey;
  });

  if (!(bookableSchedules.length > 0 || isConsultationMode)) {
    return null;
  }

  return (
    <>
      <section className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-600" />
          {isConsultationMode ? '희망 날짜 · 시간' : '예약 가능한 일정'}
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          {isConsultationMode
            ? '가능한 날짜와 시간을 선택해 주세요'
            : '원하시는 시간대를 선택하여 예약하세요'}
        </p>

        {loadingSchedules ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-slate-600">일정을 불러오는 중...</p>
          </div>
        ) : bookableSchedules.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            현재 예약 가능한 시간이 없습니다. 아래 문의 양식을 이용해 주세요.
          </p>
        ) : isConsultationMode ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">희망 날짜</p>
              <div className="flex flex-wrap gap-2">
                {dateKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDateKey(key)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                      effectiveDateKey === key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {formatDateLabel(key)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">희망 시간</p>
              <div className="flex flex-wrap gap-2">
                {slotsForDate.map((schedule) => (
                  <button
                    key={schedule.id}
                    type="button"
                    disabled={schedule.available_slots === 0}
                    onClick={() => handleOpenBookingForm(schedule)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      schedule.available_slots === 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                    }`}
                  >
                    {formatTimeOnly(schedule.starts_at)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {bookableSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 mb-1">{schedule.title}</h3>
                    {schedule.description && (
                      <p className="text-sm text-slate-600 mb-2">{schedule.description}</p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDateTime(schedule.starts_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>잔여 {schedule.available_slots}자리</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenBookingForm(schedule)}
                    disabled={schedule.available_slots === 0}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1 transition-colors min-h-[44px] ${
                      schedule.available_slots === 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    예약
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showBookingForm && selectedSchedule && (
        <ReservationModal
          schedule={selectedSchedule}
          isAuthenticated={isAuthenticated}
          onClose={() => setShowBookingForm(false)}
          formatDateTime={formatDateTime}
        />
      )}
    </>
  );
}
