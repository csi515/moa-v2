import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useStorageRefresh, useStudentNavigation, useStaffScope, useStaffGrants } from '@/hooks';
import { RecitalService } from '@/industries/piano/services/recitalService';
import { ACADEMY_EVENT_TYPE_LABEL } from '@/industries/piano/config/eventLabels';
import { studentMatchesGuardianQuery } from '@/core/parent/guardianHelpers';
import { AcademyEvent } from '@/types';
import {
  EmptyState,
  FilterTabs,
  Modal,
  PageHeader,
  SearchField,
  SummaryMetricCard,
  type FilterTabItem,
} from '@/shared/components';
import { formatPhone } from '@/utils/formatters';
import { getYouTubeWatchUrl } from '@/utils/youtube';
import { todayIsoLocal } from '@/shared/utils/localDate';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Music2,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';

type EventFilter = 'upcoming' | 'past' | 'all';

const FILTER_TABS: FilterTabItem<EventFilter>[] = [
  { id: 'upcoming', label: '예정' },
  { id: 'past', label: '지난 행사' },
  { id: 'all', label: '전체' },
];

export const RecitalManagementView: React.FC = () => {
  const { showToast, openConfirmDialog } = useApp();
  const { openStudent } = useStudentNavigation();
  const refreshKey = useStorageRefresh();
  const { allow } = useStaffGrants();
  const canManageRecitals = allow('recitals');
  const { scopeRecitalEvents, scopeStudents, getMyStudentIds, isScoped } = useStaffScope();

  const [filter, setFilter] = useState<EventFilter>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(todayIsoLocal);
  const [formType, setFormType] = useState<'concert' | 'competition'>('concert');
  const [formDescription, setFormDescription] = useState('');

  const today = todayIsoLocal();
  const allStudents = RecitalService.getActiveStudents();
  const students = useMemo(() => scopeStudents(allStudents), [allStudents, scopeStudents]);
  const events = useMemo(
    () => scopeRecitalEvents(RecitalService.getRecitalEvents(), allStudents),
    [allStudents, scopeRecitalEvents, refreshKey]
  );

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filter === 'upcoming' && ev.startDate < today) return false;
      if (filter === 'past' && ev.startDate >= today) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return ev.title.toLowerCase().includes(q) || (ev.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [events, filter, searchQuery, today, refreshKey]);

  const selectedEvent = selectedEventId ? RecitalService.getEventById(selectedEventId) : null;
  const participants = useMemo(() => {
    const raw = selectedEvent ? RecitalService.getParticipantSummaries(selectedEvent.id) : [];
    if (!isScoped) return raw;
    const ids = getMyStudentIds(allStudents);
    return raw.filter((p) => ids.has(p.studentId));
  }, [selectedEvent, isScoped, getMyStudentIds, allStudents, refreshKey]);
  const eventVideos = selectedEvent ? RecitalService.getVideosByEventId(selectedEvent.id) : [];

  const stats = useMemo(() => {
    const upcoming = events.filter((e) => e.startDate >= today).length;
    const totalParticipants = events.reduce((sum, e) => sum + (e.participantIds?.length || 0), 0);
    const withVideos = events.reduce(
      (sum, e) => sum + RecitalService.getVideosByEventId(e.id).length,
      0
    );
    return { upcoming, totalParticipants, withVideos };
  }, [events, today, refreshKey]);

  const availableStudents = useMemo(() => {
    const selectedIds = new Set(selectedEvent?.participantIds || []);
    return students.filter((s) => {
      if (selectedIds.has(s.id)) return false;
      if (!participantSearch.trim()) return true;
      const q = participantSearch.toLowerCase();
      return s.name.toLowerCase().includes(q) || studentMatchesGuardianQuery(s.id, participantSearch);
    });
  }, [students, selectedEvent, participantSearch]);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const saved = RecitalService.saveEvent({
      title: formTitle.trim(),
      startDate: formDate,
      type: formType,
      description: formDescription.trim() || undefined,
      color: formType === 'concert' ? '#4f46e5' : '#d97706',
      participantIds: [],
    });

    showToast(`'${saved.title}' 일정이 등록되었습니다.`, 'success');
    setSelectedEventId(saved.id);
    setIsCreateOpen(false);
    setFormTitle('');
    setFormDescription('');
  };

  const handleDeleteEvent = (event: AcademyEvent) => {
    openConfirmDialog({
      title: '일정 삭제',
      message: `'${event.title}' 일정을 삭제하시겠습니까?\n참가자·영상 연결 정보는 유지되지만 일정에서 제거됩니다.`,
      isDestructive: true,
      confirmText: '삭제하기',
      onConfirm: () => {
        RecitalService.deleteEvent(event.id);
        if (selectedEventId === event.id) setSelectedEventId(null);
        showToast('일정이 삭제되었습니다.', 'info');
      },
    });
  };

  const handleAddParticipant = (studentId: string) => {
    if (!selectedEvent) return;
    RecitalService.addParticipant(selectedEvent.id, studentId);
    showToast('참가 학생이 추가되었습니다.', 'success');
    setParticipantSearch('');
  };

  const handleRemoveParticipant = (studentId: string, studentName: string) => {
    if (!selectedEvent) return;
    openConfirmDialog({
      title: '참가자 제외',
      message: `${studentName} 학생을 참가 명단에서 제외하시겠습니까?`,
      isDestructive: true,
      confirmText: '제외하기',
      onConfirm: () => {
        RecitalService.removeParticipant(selectedEvent.id, studentId);
        showToast('참가 명단에서 제외되었습니다.', 'info');
      },
    });
  };

  const videoCompletionRate =
    participants.length > 0
      ? Math.round((participants.filter((p) => p.hasVideo).length / participants.length) * 100)
      : 0;

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<Award className="w-6 h-6" />}
        iconClassName="text-purple-600"
        title="연주회·콩쿠르 관리"
        description="행사 일정, 참가 학생 명단, 연주 영상 등록 현황을 한곳에서 관리합니다"
        actions={
          canManageRecitals ? (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            행사 등록
          </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryMetricCard label="예정 행사" value={`${stats.upcoming}건`} variant="purple" />
        <SummaryMetricCard label="총 참가 등록" value={`${stats.totalParticipants}명`} />
        <SummaryMetricCard label="행사 연결 영상" value={`${stats.withVideos}개`} variant="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <FilterTabs tabs={FILTER_TABS} active={filter} onChange={setFilter} />
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="행사명 검색..."
            />
          </div>

          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={<Music2 className="w-10 h-10" />}
              title="등록된 행사가 없습니다"
              className="rounded-2xl p-8"
            />
          ) : (
            filteredEvents.map((ev) => {
              const count = ev.participantIds?.length || 0;
              const videos = RecitalService.getVideosByEventId(ev.id);
              const isSelected = selectedEventId === ev.id;
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEventId(ev.id)}
                  className={`w-full text-left bg-white rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-sm'
                      : 'border-slate-200/80 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            ev.type === 'concert'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {ACADEMY_EVENT_TYPE_LABEL[ev.type]}
                        </span>
                        {ev.startDate >= today && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                            D-day
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 mt-1 text-sm">{ev.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {ev.startDate}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`} />
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {count}명
                    </span>
                    <span className="flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" /> {videos.length}개 영상
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div
          className={`lg:col-span-3 ${
            selectedEvent
              ? 'fixed inset-0 z-50 lg:static lg:z-auto flex flex-col bg-white lg:bg-transparent overflow-hidden lg:overflow-visible'
              : 'hidden lg:block'
          }`}
        >
          {!selectedEvent ? (
            <EmptyState
              icon={<Award className="w-12 h-12" />}
              title="왼쪽에서 행사를 선택하세요"
              description="참가 학생 명단과 영상 등록 현황을 확인할 수 있습니다"
              className="h-full flex flex-col items-center justify-center min-h-[320px]"
            />
          ) : (
            <>
              <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedEventId(null)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600"
                  aria-label="목록으로"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-sm text-slate-900 truncate flex-1">{selectedEvent.title}</span>
              </div>

              <div className="flex-1 overflow-y-auto lg:overflow-visible">
            <div className="bg-white rounded-3xl lg:border border-slate-200/80 lg:shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        selectedEvent.type === 'concert'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {ACADEMY_EVENT_TYPE_LABEL[selectedEvent.type]}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-2">{selectedEvent.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{selectedEvent.startDate}</p>
                    {selectedEvent.description && (
                      <p className="text-xs text-slate-600 mt-2">{selectedEvent.description}</p>
                    )}
                  </div>
                  {canManageRecitals && (
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                    title="일정 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  )}
                </div>

                <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-700">영상 등록률</span>
                    <span className="font-black text-indigo-700">{videoCompletionRate}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${videoCompletionRate}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {participants.filter((p) => p.hasVideo).length}/{participants.length}명 영상 등록
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-indigo-600" />
                    참가 학생 ({participants.length}명)
                  </h4>

                  {participants.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-xl">
                      아직 참가 학생이 없습니다. 아래에서 추가하세요.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((p) => (
                        <div
                          key={p.studentId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900">{p.studentName}</span>
                              {p.level && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500">
                                  {p.level}
                                </span>
                              )}
                              {p.hasVideo ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" /> 영상 등록
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                                  영상 미등록
                                </span>
                              )}
                            </div>
                            {p.parentPhone && (
                              <a
                                href={`tel:${p.parentPhone}`}
                                className="text-[11px] text-indigo-600 font-semibold mt-0.5 inline-flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" /> {formatPhone(p.parentPhone)}
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {p.hasVideo && p.videoId && (
                              <a
                                href={
                                  getYouTubeWatchUrl(
                                    eventVideos.find((v) => v.id === p.videoId)?.youtubeUrl || ''
                                  ) || '#'
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 text-[11px] font-bold bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" /> 영상
                              </a>
                            )}
                            <button
                              onClick={() => openStudent(p.studentId, 'videos')}
                              className="px-2.5 py-1.5 text-[11px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                              {p.hasVideo ? '학생 보기' : '영상 등록'}
                            </button>
                            <button
                              onClick={() => handleRemoveParticipant(p.studentId, p.studentName)}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    참가 학생 추가
                  </h4>
                  <SearchField
                    value={participantSearch}
                    onChange={setParticipantSearch}
                    placeholder="학생명 검색..."
                    className="mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {availableStudents.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">추가 가능한 학생이 없습니다</p>
                    ) : (
                      availableStudents.slice(0, 8).map((st) => (
                        <button
                          key={st.id}
                          onClick={() => handleAddParticipant(st.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
                        >
                          <span className="font-semibold text-slate-800">{st.name}</span>
                          <Plus className="w-3.5 h-3.5 text-indigo-600" />
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {eventVideos.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                      <Video className="w-4 h-4 text-purple-600" />
                      등록된 연주 영상 ({eventVideos.length})
                    </h4>
                    <div className="space-y-2">
                      {eventVideos.map((video) => (
                        <div
                          key={video.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{video.studentName}</p>
                            <p className="text-slate-600 mt-0.5">{video.title}</p>
                            {video.songTitle && (
                              <p className="text-indigo-700 font-semibold mt-0.5">🎵 {video.songTitle}</p>
                            )}
                          </div>
                          <a
                            href={getYouTubeWatchUrl(video.youtubeUrl) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-indigo-600 hover:bg-white rounded-lg"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="연주회·콩쿠르 등록">
        <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">행사명 *</label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="예: 2025 가을 정기 연주회"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">일정 *</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">유형 *</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as 'concert' | 'competition')}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              >
                <option value="concert">연주회</option>
                <option value="competition">콩쿠르</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">설명</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              placeholder="장소, 프로그램, 준비 사항 등"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
          >
            등록
          </button>
        </form>
      </Modal>
    </div>
  );
};
