import React, { useMemo } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import type { RevisionRow } from '../services/riskAssessmentApprovalService';
import { countHazardsInSnapshot } from '../domain/sopStepDocument';

type Props = {
  open: boolean;
  currentVersion: number;
  revisions: RevisionRow[];
  onClose: () => void;
};

function hazardCount(snapshot: Record<string, unknown>): number {
  return countHazardsInSnapshot(snapshot);
}

export const RevisionHistoryModal: React.FC<Props> = ({
  open,
  currentVersion,
  revisions,
  onClose,
}) => {
  const pair = useMemo(() => {
    if (revisions.length < 2) {
      return { left: revisions[0] ?? null, right: revisions[revisions.length - 1] ?? null };
    }
    return {
      left: revisions[revisions.length - 2],
      right: revisions[revisions.length - 1],
    };
  }, [revisions]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="개정 이력 대조"
      description={`현재 v${currentVersion.toFixed(1)} · 총 ${Math.max(0, currentVersion - 1)}회 개정`}
      maxWidth="2xl"
      intent="view"
    >
      <div>
        {revisions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">승인된 개정 스냅샷이 없습니다.</p>
        ) : (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {[pair.left, pair.right].filter(Boolean).map((rev, idx) => (
              <article key={rev!.id} className="rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-rose-700">
                  {idx === 0 ? '이전 버전' : '최신 승인 버전'} · v{rev!.version}.0
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">
                  {(rev!.snapshot_payload.title as string) || '제목 없음'}
                </h3>
                <dl className="mt-3 space-y-2 text-sm text-slate-700">
                  <div>
                    <dt className="font-semibold">개정 유형</dt>
                    <dd>{rev!.revision_type}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">개정 사유</dt>
                    <dd>{rev!.revision_reason}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">공정명</dt>
                    <dd>{(rev!.snapshot_payload.process_name as string) || '-'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">위험요인 수</dt>
                    <dd>{hazardCount(rev!.snapshot_payload)}건</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">승인자</dt>
                    <dd>{rev!.approved_by}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">승인 시각</dt>
                    <dd>{new Date(rev!.approved_at).toLocaleString('ko-KR')}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}

        {pair.left && pair.right && pair.left.id !== pair.right.id ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            변경점 요약: 위험요인 {hazardCount(pair.left.snapshot_payload)}건 →{' '}
            {hazardCount(pair.right.snapshot_payload)}건 · 개정 사유 「{pair.right.revision_reason}」
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
