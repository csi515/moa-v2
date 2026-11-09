import React from 'react';
import { X, ExternalLink, Play, Calendar, Music } from 'lucide-react';
import { getYouTubeEmbedUrl, getYouTubeWatchUrl } from '@/utils/youtube';

interface PianoInlineVideoModalProps {
  isOpen: boolean;
  video: {
    title: string;
    youtubeUrl: string;
    studentName?: string;
    songTitle?: string;
    recordedDate?: string;
    memo?: string;
  } | null;
  onClose: () => void;
}

/**
 * 피아노 원생 360도 뷰: 연주 영상 인라인 퀵 프리뷰 모달
 *
 * 외부 사이트로 이동하지 않고, 모달 내에서 학생의 연주를 즉시 감상/상담.
 */
export const PianoInlineVideoModal: React.FC<PianoInlineVideoModalProps> = ({
  isOpen,
  video,
  onClose,
}) => {
  if (!isOpen || !video) return null;

  const embedUrl = getYouTubeEmbedUrl(video.youtubeUrl);
  const watchUrl = getYouTubeWatchUrl(video.youtubeUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 bg-indigo-600 text-white rounded-lg">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm truncate">{video.title}</h3>
              <p className="text-[11px] text-slate-500 truncate">
                {video.studentName ? `${video.studentName} 원생 · ` : ''}
                {video.recordedDate || '연주 영상'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                title="YouTube에서 새 창으로 열기"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 영상 재생 프레임 */}
        <div className="relative aspect-video bg-black w-full">
          {embedUrl ? (
            <iframe
              src={`${embedUrl}?autoplay=1`}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/70 p-6 text-center">
              <p className="text-sm font-semibold">재생할 수 없는 영상 링크입니다.</p>
              {watchUrl && (
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                >
                  외부 링크로 열기
                </a>
              )}
            </div>
          )}
        </div>

        {/* 하단 상세 정보 */}
        {(video.songTitle || video.memo) && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-1">
            {video.songTitle && (
              <p className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                곡명: {video.songTitle}
              </p>
            )}
            {video.memo && <p className="text-xs text-slate-600 leading-relaxed">{video.memo}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
