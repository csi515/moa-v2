import type { FC } from 'react';
import { EmptyState } from '@/shared/components';
import { Megaphone, Trash2, Send } from 'lucide-react';
import type { AppNotification } from '@/types';
import { PARENT_NOTICE_KIND_LABEL, type ParentNoticeKind } from '../types';
import { NOTICE_COPY } from '../noticeUi';

interface NoticeListProps {
  items: AppNotification[];
  softClass: string;
  editClass: string;
  btnClass: string;
  btnHoverClass: string;
  targetLabel: (item: AppNotification) => string;
  onCreate: () => void;
  onEdit: (item: AppNotification) => void;
  onPublish: (item: AppNotification) => void | Promise<void>;
  onDelete: (item: AppNotification) => void;
  canWrite?: boolean;
  canDelete?: boolean;
}

export const NoticeList: FC<NoticeListProps> = ({
  items,
  softClass,
  editClass,
  btnClass,
  btnHoverClass,
  targetLabel,
  onCreate,
  onEdit,
  onPublish,
  onDelete,
  canWrite = true,
  canDelete = true,
}) => {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Megaphone className="w-10 h-10" />}
        title={NOTICE_COPY.emptyTitle}
        description={NOTICE_COPY.emptyDescription}
        action={
          canWrite ? (
          <button
            type="button"
            onClick={onCreate}
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl ${btnClass} ${btnHoverClass} text-white text-xs font-bold`}
          >
            작성
          </button>
          ) : undefined
        }
        className="border-0 shadow-none rounded-none"
      />
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => {
        const published = item.status === 'sent';
        return (
          <div key={item.id} className="p-4 sm:p-5 space-y-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${softClass}`}>
                  {PARENT_NOTICE_KIND_LABEL[item.type as ParentNoticeKind] || '안내'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                    published
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {published ? '게시됨' : '임시저장'}
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {targetLabel(item)}
                  {item.recipientCount != null ? ` · ${item.recipientCount}명` : ''}
                </span>
              </div>
              <p className="font-bold text-slate-900 text-sm mt-1.5">{item.title}</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                {item.message}
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                {published
                  ? `게시 ${(item.sentAt || '').slice(0, 16).replace('T', ' ')}`
                  : `작성 ${(item.createdAt || '').slice(0, 16).replace('T', ' ')}`}
              </p>
            </div>
            {(canWrite || canDelete) && (
            <div className="flex flex-wrap gap-2">
              {canWrite && !published && (
                <button
                  type="button"
                  onClick={() => onPublish(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100"
                >
                  <Send className="w-4 h-4" />
                  게시
                </button>
              )}
              {canWrite && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold ${editClass}`}
              >
                수정
              </button>
              )}
              {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                aria-label="안내 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              )}
            </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
