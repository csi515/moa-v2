import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { formatRevisionNo, generateSopDocNo, getNextSequenceNumber, PRESET_DEPARTMENTS } from '../domain/sopNumberingAndAuditEngine';
import { readDocumentBody } from '../domain/sopStepDocument';
import type { RevisionRow } from '../services/riskAssessmentApprovalService';

type NewDocProps = {
  open: boolean;
  existingDocNos: readonly string[];
  onClose: () => void;
  onCreate: (input: { deptCode: string; deptName: string; processName: string }) => Promise<void>;
};

export const SopNewDocumentModal: React.FC<NewDocProps> = ({ open, existingDocNos, onClose, onCreate }) => {
  const [deptCode, setDeptCode] = useState(PRESET_DEPARTMENTS[0]?.code ?? 'MNT');
  const [processName, setProcessName] = useState('');
  const dept = PRESET_DEPARTMENTS.find((item) => item.code === deptCode);
  const docNoPreview = generateSopDocNo(deptCode, getNextSequenceNumber(existingDocNos, deptCode));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!processName.trim()) return;
    void onCreate({
      deptCode,
      deptName: dept?.name ?? deptCode,
      processName: processName.trim(),
    })
      .then(() => {
        setProcessName('');
        onClose();
      })
      .catch(() => undefined);
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="신규 공정 표준(SOP) 등록 & 채번"
      maxWidth="lg"
      intent="form"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-xs font-bold text-slate-600">
          소속 부서
          <select
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
            value={deptCode}
            onChange={(event) => setDeptCode(event.target.value)}
          >
            {PRESET_DEPARTMENTS.map((item) => (
              <option key={item.code} value={item.code}>
                [{item.code}] {item.name}
              </option>
            ))}
          </select>
        </label>
        <p className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-700">
          {docNoPreview} (최초 제정 Rev.00)
        </p>
        <label className="block text-xs font-bold text-slate-600">
          공정 / 작업 명칭
          <input
            required
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
            value={processName}
            onChange={(event) => setProcessName(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">
            초안 만들기
          </button>
        </div>
      </form>
    </Modal>
  );
};

type ReviseProps = {
  open: boolean;
  docNo: string;
  processName: string;
  nextVersion: number;
  onClose: () => void;
  onRevise: (reason: string) => Promise<void>;
};

export const SopReviseModal: React.FC<ReviseProps> = ({
  open,
  docNo,
  processName,
  nextVersion,
  onClose,
  onRevise,
}) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 4) return;
    void onRevise(reason.trim())
      .then(() => {
        setReason('');
        onClose();
      })
      .catch(() => undefined);
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="작업표준 개정 기안 (Audit Trail 승인)"
      description={`${docNo} ${processName} · 다음 차수 ${formatRevisionNo(nextVersion - 1)} (개정은 초안으로 열리고, 검토·승인 후에만 확정됩니다)`}
      maxWidth="lg"
      intent="form"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          required
          minLength={4}
          rows={4}
          className="w-full rounded-xl border border-slate-300 p-3 text-sm"
          placeholder="개정 사유"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">
            개정 초안 만들기
          </button>
        </div>
      </form>
    </Modal>
  );
};

type HistoryProps = {
  open: boolean;
  docNo: string;
  processName: string;
  revisions: RevisionRow[];
  onClose: () => void;
  onOpen: (version: number) => void;
};

export const SopHistoryModal: React.FC<HistoryProps> = ({
  open,
  docNo,
  processName,
  revisions,
  onClose,
  onOpen,
}) => {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="제·개정 이력 추적 (Audit Trail History)"
      description={`${docNo} · ${processName}`}
      maxWidth="2xl"
      intent="view"
      footer={
        <button type="button" className="h-11 w-full rounded-2xl border border-slate-200 text-sm font-bold" onClick={onClose}>
          닫기
        </button>
      }
    >
      <div className="space-y-3">
        {revisions.length === 0 ? <p className="text-sm text-slate-500">승인된 개정 스냅샷이 없습니다.</p> : null}
        {revisions.map((revision) => {
          const snapshot = readDocumentBody(revision.snapshot_payload);
          return (
            <article key={revision.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-indigo-700">
                  v{revision.version} · {formatRevisionNo(revision.version - 1)}
                </span>
                <span className="text-xs text-slate-400">{revision.revision_type}</span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-800">{revision.revision_reason}</p>
              <p className="mt-1 text-xs text-slate-500">작업 단계 {snapshot.steps.length}개</p>
              <button
                type="button"
                className="mt-3 h-11 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white"
                onClick={() => {
                  onOpen(revision.version);
                  onClose();
                }}
              >
                해당 시점 열람
              </button>
            </article>
          );
        })}
      </div>
    </Modal>
  );
};
