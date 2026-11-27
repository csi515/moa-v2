import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Send,
  Sparkles,
} from 'lucide-react';
import { useOptionalOrganization } from '../../organizations/OrganizationProvider';
import { getCoreClient } from '../../../lib/supabase';
import {
  listActivities,
  recordActivity,
  type ActivityItem,
} from '../services/activityService';

export interface UniversalActivityTimelineViewProps {
  targetType: string;
  targetId: string;
  title?: string;
  onActivityAdded?: (item: ActivityItem) => void;
}

export const UniversalActivityTimelineView: React.FC<UniversalActivityTimelineViewProps> = ({
  targetType,
  targetId,
  title = '활동 타임라인 & 이력',
  onActivityAdded,
}) => {
  const orgContext = useOptionalOrganization();
  const organizationId = orgContext?.currentOrganization?.id || 'default_org';
  const currentUser = orgContext?.currentStaffId || 'current_user';

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabaseClient = getCoreClient();

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await listActivities(organizationId, targetType, targetId, supabaseClient);
      setActivities(list);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, targetType, targetId, supabaseClient]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const added = await recordActivity(
        {
          organizationId,
          targetType,
          targetId,
          actorName: '관리자',
          activityType: 'comment_added',
          title: '내부 메모 추가',
          content: newComment.trim(),
        },
        supabaseClient
      );

      setActivities((prev) => [added, ...prev]);
      setNewComment('');
      onActivityAdded?.(added);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment_added':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-600" />;
      case 'status_changed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'created':
        return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-800" />
          <span>{title}</span>
        </h3>
        <span className="text-xs text-slate-400">총 {activities.length}건</span>
      </div>

      {/* 신규 메모 작성 폼 */}
      <form onSubmit={handleAddComment} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="진행 상황이나 메모를 남겨보세요..."
          className="flex-1 text-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition flex items-center gap-1"
        >
          <Send className="w-3.5 h-3.5" />
          <span>등록</span>
        </button>
      </form>

      {/* 타임라인 피드 */}
      {isLoading ? (
        <div className="py-6 text-center text-xs text-slate-400">이력을 불러오는 중...</div>
      ) : activities.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">기록된 활동 이력이 없습니다.</div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {activities.map((item) => (
            <div key={item.id} className="relative group">
              <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-xs">
                {getActivityIcon(item.activityType)}
              </span>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-800">{item.title}</span>
                  <span>{item.createdAt ? new Date(item.createdAt).toLocaleString('ko-KR') : ''}</span>
                </div>
                {item.content && <p className="text-slate-600 whitespace-pre-wrap">{item.content}</p>}
                {item.actorName && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                    <User className="w-3 h-3" />
                    <span>작성자: {item.actorName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
