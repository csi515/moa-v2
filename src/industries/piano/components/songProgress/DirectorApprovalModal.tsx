import { useEffect, useMemo, useState, type FC } from 'react';
import { Check, Loader2, Stamp } from 'lucide-react';
import { Modal } from '@/shared/components';
import { StudentService } from '@/core/students';
import { songProgressService } from './songProgressService';
import { SONG_PROGRESS_COPY, type SongProgressRow } from './songProgressTypes';

interface DirectorApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onApproved?: () => void;
}

function formatRequestedAt(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 원장/강사 — 완곡 승인 대기 모달 */
export const DirectorApprovalModal: FC<DirectorApprovalModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  onToast,
  onApproved,
}) => {
  const [rows, setRows] = useState<SongProgressRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of StudentService.getStudents()) {
      map.set(s.id, s.name);
    }
    return map;
  }, [isOpen, rows.length]);

  const reload = async () => {
    setLoading(true);
    try {
      const list = await songProgressService.listPending(organizationId);
      setRows(list);
      setSelected(new Set());
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '목록 불러오기 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void reload();
  }, [isOpen, organizationId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const approveOne = async (id: string) => {
    setBusyId(id);
    try {
      await songProgressService.approve(id, 1);
      onToast?.(SONG_PROGRESS_COPY.approveCta.replace('!', '') + ' 완료!', 'success');
      await reload();
      onApproved?.();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '승인 실패', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const approveSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) {
      onToast?.('승인할 항목을 선택해 주세요.', 'warning');
      return;
    }
    setBulkBusy(true);
    try {
      const n = await songProgressService.approveBulk(ids, 1);
      onToast?.(`${n}건 승인했습니다.`, 'success');
      await reload();
      onApproved?.();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '일괄 승인 실패', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="완곡 승인" maxWidth="2xl">
      <div className="p-4 sm:p-5 space-y-4">
        <p className="text-sm text-slate-600">
          학생이 신청한 완곡에 스탬프를 찍어 주세요. 승인 즉시 학생 스탬프판에 반영됩니다.
        </p>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8 inline-flex items-center gap-2 justify-center w-full">
            <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중...
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">{SONG_PROGRESS_COPY.pendingEmpty}</p>
        ) : (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={bulkBusy || selected.size === 0}
                onClick={() => void approveSelected()}
                className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-indigo-600 text-white disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {SONG_PROGRESS_COPY.approveBulkCta} ({selected.size})
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-auto max-h-[50vh]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-10" />
                    <th className="px-3 py-2 font-bold text-slate-600">학생</th>
                    <th className="px-3 py-2 font-bold text-slate-600">교재</th>
                    <th className="px-3 py-2 font-bold text-slate-600">곡명</th>
                    <th className="px-3 py-2 font-bold text-slate-600">신청</th>
                    <th className="px-3 py-2 font-bold text-slate-600" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                          className="rounded border-slate-300 text-indigo-600 min-h-[20px] min-w-[20px]"
                          aria-label="선택"
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        {nameById.get(r.customer_id) || '학생'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.book_name}</td>
                      <td className="px-3 py-2 text-slate-800 font-medium">{r.song_title}</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                        {formatRequestedAt(r.requested_at)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => void approveOne(r.id)}
                          className="min-h-[44px] px-2.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          {busyId === r.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Stamp className="w-3 h-3" />
                          )}
                          {SONG_PROGRESS_COPY.approveCta}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
