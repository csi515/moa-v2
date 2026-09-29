import React, { useMemo, useRef, useState, type DragEvent } from 'react';
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Modal } from '@/shared/components/ui';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { getPrimaryGuardian } from '@/core/parent/guardianHelpers';
import { StudentService } from '@/core/students';
import {
  STUDENT_IMPORT_UI,
  buildExistingStudentKeys,
  buildTemplateCsv,
  buildTemplateWorkbookBuffer,
  parseStudentImportFile,
  runStudentBulkImport,
  validateStudentImportRows,
  type StudentImportNormalizedRow,
  type StudentImportRowError,
} from '@/core/students/bulkImport';
import { useModuleLabels } from '@/core/labels';

interface StudentBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

const ACCEPT =
  '.csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

export const StudentBulkImportModal: React.FC<StudentBulkImportModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const { showToast } = useApp();
  const org = useOptionalOrganization();
  const labels = useModuleLabels();
  const customerLabel = labels.customer.singular;
  const contactLabel = labels.contact.singular;
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [validRows, setValidRows] = useState<StudentImportNormalizedRow[]>([]);
  const [errors, setErrors] = useState<StudentImportRowError[]>([]);
  const [warnings, setWarnings] = useState<StudentImportRowError[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);

  const existingKeys = useMemo(() => {
    const students = StudentService.getStudents();
    const parentMap = new Map<string, { phone?: string }>();
    for (const s of students) {
      const g = getPrimaryGuardian(s.id);
      if (g) parentMap.set(s.name, { phone: g.parentPhone });
    }
    return buildExistingStudentKeys(
      students.map((s) => ({ name: s.name, phone: s.phone })),
      parentMap
    );
  }, [isOpen]);

  const reset = () => {
    setFileName(null);
    setValidRows([]);
    setErrors([]);
    setWarnings([]);
    setProgress(null);
    setDragOver(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  const downloadTemplateCsv = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moa-students-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplateXlsx = () => {
    const buffer = buildTemplateWorkbookBuffer();
    const blob = new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moa-students-import-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    try {
      const rawRows = await parseStudentImportFile(file);
      if (rawRows.length === 0) {
        showToast(STUDENT_IMPORT_UI.emptyFile, 'warning');
        reset();
        return;
      }
      const result = validateStudentImportRows(rawRows, existingKeys);
      setFileName(file.name);
      setValidRows(result.validRows);
      setErrors(result.errors);
      setWarnings(result.warnings);
      if (result.validRows.length === 0) {
        showToast('유효한 행이 없습니다. 오류 목록을 확인해 주세요.', 'warning');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : STUDENT_IMPORT_UI.unsupported, 'error');
      reset();
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (importing) return;
    const file = e.dataTransfer.files?.[0] ?? null;
    void handleFile(file);
  };

  const handleImport = async () => {
    if (validRows.length === 0) {
      showToast('등록할 유효한 행이 없습니다.', 'warning');
      return;
    }
    const organizationId = org?.currentOrganization?.id;
    if (!organizationId) {
      showToast('사업장을 선택한 뒤 다시 시도해 주세요.', 'warning');
      return;
    }

    setImporting(true);
    setProgress({ completed: 0, total: validRows.length });
    try {
      const result = await runStudentBulkImport(validRows, {
        organizationId,
        onProgress: (p) => setProgress({ completed: p.completed, total: p.total }),
      });
      showToast(
        `${result.succeeded}명 등록 완료` +
          (result.failed > 0 ? ` · ${result.failed}건 실패` : ''),
        result.failed > 0 ? 'warning' : 'success'
      );
      reset();
      onCompleted();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '일괄 등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={STUDENT_IMPORT_UI.title} maxWidth="2xl">
      <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
        <p className="text-sm text-slate-600">
          이름·생년월일·{contactLabel} 연락처·수강과목이 담긴 CSV/Excel을 올리면 행별 검증 후 Supabase
          {customerLabel}으로 일괄 등록합니다. {contactLabel} 칸을 비우면 성인 본인 등록으로 처리합니다.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplateCsv}
            className="inline-flex items-center gap-2 min-h-[44px] px-3 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
          >
            <Download className="w-4 h-4" />
            {STUDENT_IMPORT_UI.downloadTemplate}
          </button>
          <button
            type="button"
            onClick={downloadTemplateXlsx}
            className="inline-flex items-center gap-2 min-h-[44px] px-3 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
          >
            <Download className="w-4 h-4" />
            {STUDENT_IMPORT_UI.downloadTemplateXlsx}
          </button>
        </div>

        <button
          type="button"
          disabled={importing}
          onClick={() => fileRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={onDrop}
          className={`w-full min-h-[120px] rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors disabled:opacity-50 ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40'
          }`}
        >
          <Upload
            className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-indigo-600' : 'text-slate-400'}`}
          />
          <p className="text-sm font-bold text-slate-800">
            {dragOver ? STUDENT_IMPORT_UI.dropActive : STUDENT_IMPORT_UI.dropHint}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">.xlsx · .xls · .csv</p>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />

        {fileName && (
          <p className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {fileName}
          </p>
        )}

        {(errors.length > 0 || warnings.length > 0) && (
          <div className="space-y-2 max-h-40 overflow-y-auto text-xs">
            {errors.map((e, i) => (
              <p key={`e-${i}`} className="text-rose-700">
                {e.rowNumber}행{e.field ? ` · ${e.field}` : ''}: {e.message}
              </p>
            ))}
            {warnings.map((w, i) => (
              <p key={`w-${i}`} className="text-amber-700">
                {w.rowNumber}행{w.field ? ` · ${w.field}` : ''}: {w.message}
              </p>
            ))}
          </div>
        )}

        {validRows.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">
              {STUDENT_IMPORT_UI.preview} ({validRows.length}명)
            </p>
            <div className="border border-slate-200 rounded-xl overflow-auto max-h-56">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-bold text-slate-600">행</th>
                    <th className="px-3 py-2 font-bold text-slate-600">이름</th>
                    <th className="px-3 py-2 font-bold text-slate-600">생년월일</th>
                    <th className="px-3 py-2 font-bold text-slate-600">학부모</th>
                    <th className="px-3 py-2 font-bold text-slate-600">과목</th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.slice(0, 50).map((r) => (
                    <tr key={r.rowNumber} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-500">{r.rowNumber}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{r.name}</td>
                      <td className="px-3 py-2 text-slate-600 tabular-nums">
                        {r.birthDate || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {r.isAdultSelf
                          ? `성인 · ${r.phone || '-'}`
                          : `${r.guardianName} · ${r.guardianPhone}`}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.courseSubject || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validRows.length > 50 && (
                <p className="px-3 py-2 text-[11px] text-slate-400 border-t border-slate-100">
                  외 {validRows.length - 50}명…
                </p>
              )}
            </div>
          </div>
        )}

        {progress && (
          <p className="text-sm text-indigo-700 font-semibold">
            {STUDENT_IMPORT_UI.importing} {progress.completed}/{progress.total}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="min-h-[44px] px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={importing || validRows.length === 0}
            className="min-h-[44px] px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 inline-flex items-center gap-2"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            {STUDENT_IMPORT_UI.importAction}
          </button>
        </div>
      </div>
    </Modal>
  );
};
