import { useMemo, useState, type FC, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { EmptyState, Modal } from '@/shared/components';
import { FormField, FORM_CONTROL_CLASS } from '@/shared/components/ui';
import { Plus, Save, Video } from 'lucide-react';
import type { CctvViewRequest, CctvViewStatus } from './types';
import { CCTV_VIEW_STATUS_LABEL } from './types';

function formatWhen(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}

export const CctvViewRequestView: FC = () => {
  const { showToast, currentUser } = useApp();
  const { isOwner } = usePermissions();
  const refreshKey = useStorageRefresh();
  const requests = useMemo(() => {
    const list = StorageService.getCctvViewRequests().sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    if (isOwner) return list;
    const staffId = currentUser.staffId;
    return list.filter((item) => item.applicantTeacherId && item.applicantTeacherId === staffId);
  }, [refreshKey, isOwner, currentUser.staffId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [purpose, setPurpose] = useState('');

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) {
      showToast('열람 목적을 입력해 주세요.', 'error');
      return;
    }
    StorageService.saveCctvViewRequest({
      requestedAt: new Date().toISOString(),
      purpose: purpose.trim(),
      applicantName: currentUser.name,
      applicantTeacherId: currentUser.staffId || undefined,
      status: 'requested',
    });
    showToast('열람 신청이 저장되었습니다.', 'success');
    setIsModalOpen(false);
  };

  const review = (item: CctvViewRequest, status: Extract<CctvViewStatus, 'approved' | 'rejected'>) => {
    StorageService.saveCctvViewRequest({
      ...item,
      status,
      reviewedAt: new Date().toISOString(),
      reviewedBy: currentUser.name,
    });
    showToast(status === 'approved' ? '열람을 승인했습니다.' : '열람을 반려했습니다.', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setPurpose('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          열람 신청
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {requests.length === 0 ? (
          <EmptyState
            icon={<Video className="w-10 h-10" />}
            title="열람 이력이 없습니다"
            description="신청과 승인 기록만 남깁니다. 영상은 연결하지 않습니다."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">{item.applicantName}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                    {CCTV_VIEW_STATUS_LABEL[item.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1">{item.purpose}</p>
                <p className="text-[11px] text-slate-500 mt-1">신청 {formatWhen(item.requestedAt)}</p>
                {item.reviewedAt && (
                  <p className="text-[11px] text-slate-400">처리 {formatWhen(item.reviewedAt)} · {item.reviewedBy}</p>
                )}
                {isOwner && item.status === 'requested' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => review(item, 'approved')}
                      className="px-3 py-2 min-h-[44px] rounded-xl bg-sky-600 text-white text-xs font-bold"
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      onClick={() => review(item, 'rejected')}
                      className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 text-xs font-bold"
                    >
                      반려
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="CCTV 열람 신청">
        <form onSubmit={handleSave} className="space-y-3">
          <FormField label="열람 목적">
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              className={FORM_CONTROL_CLASS}
              required
            />
          </FormField>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
          >
            <Save className="w-4 h-4" />
            신청
          </button>
        </form>
      </Modal>
    </div>
  );
};
