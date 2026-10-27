import React from 'react';
import { AcademyEvent, PerformanceVideo } from '@/types';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl, getYouTubeWatchUrl } from '@/utils/youtube';
import { ExternalLink, Play, Plus, Trash2, Video } from 'lucide-react';

interface StudentDetailVideosTabProps {
  allVideos: PerformanceVideo[];
  recitalEvents: AcademyEvent[];
  videoTypeLabel: Record<PerformanceVideo['eventType'], string>;
  isAddVideoOpen: boolean;
  setIsAddVideoOpen: (open: boolean) => void;
  newVideoTitle: string;
  setNewVideoTitle: (title: string) => void;
  newVideoUrl: string;
  setNewVideoUrl: (url: string) => void;
  newVideoDate: string;
  setNewVideoDate: (date: string) => void;
  newVideoType: PerformanceVideo['eventType'];
  setNewVideoType: (type: PerformanceVideo['eventType']) => void;
  newVideoEventId: string;
  setNewVideoEventId: (id: string) => void;
  newVideoSong: string;
  setNewVideoSong: (song: string) => void;
  newVideoMemo: string;
  setNewVideoMemo: (memo: string) => void;
  previewVideoId: string | null;
  setPreviewVideoId: (id: string | null) => void;
  onSaveVideo: (e: React.FormEvent) => void;
  onVideoEventChange: (eventId: string) => void;
  onDeleteVideo: (video: PerformanceVideo) => void;
}

export const StudentDetailVideosTab: React.FC<StudentDetailVideosTabProps> = ({
  allVideos,
  recitalEvents,
  videoTypeLabel,
  isAddVideoOpen,
  setIsAddVideoOpen,
  newVideoTitle,
  setNewVideoTitle,
  newVideoUrl,
  setNewVideoUrl,
  newVideoDate,
  setNewVideoDate,
  newVideoType,
  setNewVideoType,
  newVideoEventId,
  newVideoSong,
  setNewVideoSong,
  newVideoMemo,
  setNewVideoMemo,
  previewVideoId,
  setPreviewVideoId,
  onSaveVideo,
  onVideoEventChange,
  onDeleteVideo,
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-bold text-slate-900">연주 영상 아카이브</h4>
        <p className="text-xs text-slate-500">YouTube 링크로 연주회·콩쿠르·수업 영상을 관리합니다</p>
      </div>
      <button
        onClick={() => setIsAddVideoOpen(true)}
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> 영상 추가
      </button>
    </div>

    {isAddVideoOpen && (
      <form onSubmit={onSaveVideo} className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-3">
        <h5 className="text-xs font-bold text-indigo-900">새 연주 영상 등록</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">영상 제목 *</label>
            <input
              type="text"
              required
              placeholder="예: 2025 가을 정기 연주회 - Für Elise"
              value={newVideoTitle}
              onChange={(e) => setNewVideoTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">YouTube 링크 *</label>
            <input
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=..."
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">연주회·콩쿠르 일정 (선택)</label>
            <select
              value={newVideoEventId}
              onChange={(e) => onVideoEventChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            >
              <option value="">일정 없음 / 직접 입력</option>
              {recitalEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.startDate} · {ev.title} ({ev.type === 'concert' ? '연주회' : '콩쿠르'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">연주일</label>
            <input
              type="date"
              value={newVideoDate}
              onChange={(e) => setNewVideoDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">분류</label>
            <select
              value={newVideoType}
              onChange={(e) => setNewVideoType(e.target.value as PerformanceVideo['eventType'])}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            >
              <option value="recital">연주회</option>
              <option value="competition">콩쿠르</option>
              <option value="lesson">수업</option>
              <option value="practice">연습</option>
              <option value="other">기타</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">연주곡</label>
            <input
              type="text"
              placeholder="예: Für Elise, Op.66"
              value={newVideoSong}
              onChange={(e) => setNewVideoSong(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">메모</label>
            <input
              type="text"
              placeholder="연주회 장소, 심사위원 코멘트 등"
              value={newVideoMemo}
              onChange={(e) => setNewVideoMemo(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsAddVideoOpen(false)}
            className="px-3 py-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-1 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            저장
          </button>
        </div>
      </form>
    )}

    {previewVideoId && (() => {
      const video = allVideos.find((v) => v.id === previewVideoId);
      const embedUrl = video ? getYouTubeEmbedUrl(video.youtubeUrl) : null;
      if (!video || !embedUrl) return null;
      return (
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-video">
          <iframe
            src={embedUrl}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    })()}

    {allVideos.length === 0 ? (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
        <Video className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="font-bold text-slate-600 text-sm">등록된 연주 영상이 없습니다</p>
        <p className="text-xs text-slate-400">YouTube 링크로 연주회·콩쿠르 영상을 보관해 보세요</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allVideos.map((video) => {
          const thumb = getYouTubeThumbnailUrl(video.youtubeUrl);
          const watchUrl = getYouTubeWatchUrl(video.youtubeUrl);
          return (
            <div
              key={video.id}
              className="rounded-2xl border border-slate-200 overflow-hidden bg-white hover:border-indigo-200 transition-colors"
            >
              <button
                type="button"
                onClick={() => setPreviewVideoId(previewVideoId === video.id ? null : video.id)}
                className="relative w-full aspect-video bg-slate-900 group cursor-pointer"
              >
                {thumb && (
                  <img src={thumb} alt={video.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 text-indigo-600 ml-0.5" />
                  </div>
                </div>
                <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/60 text-white">
                  {videoTypeLabel[video.eventType]}
                </span>
              </button>
              <div className="p-3 space-y-1">
                <h5 className="text-sm font-bold text-slate-900 leading-snug">{video.title}</h5>
                {video.eventTitle && (
                  <p className="text-[11px] text-purple-700 font-semibold">📅 {video.eventTitle}</p>
                )}
                {video.songTitle && (
                  <p className="text-xs text-indigo-700 font-semibold">🎵 {video.songTitle}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {video.recordedDate || '날짜 미입력'}
                  </span>
                  <div className="flex items-center gap-1">
                    {watchUrl && (
                      <a
                        href={watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                        aria-label="YouTube에서 보기"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => onDeleteVideo(video)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {video.memo && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">{video.memo}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
