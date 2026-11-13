import React, { useMemo, useRef, useState, type DragEvent } from 'react';
import { Download, FileSpreadsheet, Loader2, Upload, ClipboardCheck, Sparkles, AlertCircle } from 'lucide-react';
import { Modal } from '@/shared/components/ui';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { getPrimaryGuardian } from '@/core/parent/guardianHelpers';
import { StudentService } from '@/core/students';
import {
  STUDENT_IMPORT_UI,
  buildExistingStudentKeys,
  buildTemplateCsv,
  buildTemplateWorkbookBlob,
  parseStudentImportFile,
  parseStudentClipboardText,
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

  // 대량 등록 모드: 'paste' (엑셀 표 복사/붙여넣기) vs 'file' (파일 업로드)
  const [importMode, setImportMode] = useState<'paste' | 'file'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [defaultFee, setDefaultFee] = useState<number>(160000);

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
    setPasteText('');
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

  // 1. 클립보드 텍스트 (Ctrl+V) 즉시 파싱 처리
  const processClipboardText = (text: string) => {
    if (!text.trim()) {
      setPasteText('');
      setValidRows([]);
      setErrors([]);
      setWarnings([]);
      return;
    }

    try {
      const rawRows = parseStudentClipboardText(text);
      if (rawRows.length === 0) {
        showToast('유효한 데이터 행을 찾을 수 없습니다. 표를 다시 복사해 주세요.', 'warning');
        return;
      }

      const result = validateStudentImportRows(rawRows, existingKeys);
      setPasteText(text);
      setFileName(`엑셀 붙여넣기 (${rawRows.length}개 행 감지)`);
      setValidRows(result.validRows);
      setErrors(result.errors);
      setWarnings(result.warnings);

      if (result.validRows.length > 0) {
        showToast(`📋 ${result.validRows.length}명의 데이터를 성공적으로 감지했습니다!`, 'success');
      } else {
        showToast('유효한 행이 없습니다. 오류 목록을 확인해 주세요.', 'warning');
      }
    } catch (err) {
      showToast.error(err, '붙여넣은 텍스트 파싱 중 오류가 발생했습니다.');
    }
  };

  const handlePasteEvent = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      processClipboardText(text);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPasteText(val);
    if (val.trim()) {
      processClipboardText(val);
    } else {
      setValidRows([]);
      setErrors([]);
      setWarnings([]);
      setFileName(null);
    }
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

  const downloadTemplateXlsx = async () => {
    try {
      const blob = await buildTemplateWorkbookBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'moa-students-import-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download excel template:', err);
    }
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
      } else {
        showToast(`📁 ${result.validRows.length}명의 데이터를 성공적으로 로드했습니다.`, 'success');
      }
    } catch (err) {
      showToast.error(err, STUDENT_IMPORT_UI.unsupported);
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
        fallbackTuitionFee: defaultFee,
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
      showToast.error(err, '일괄 등록 중 오류가 발생했습니다.');
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={STUDENT_IMPORT_UI.title} maxWidth="2xl">
      <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[85vh]">
        {/* 기본 수강료 자동 상속 설정 (1번 구멍 방어) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-800">기본 수강료 (엑셀에 원비 미기재 시 적용)</span>
            <p className="text-[11px] text-slate-500 mt-0.5">엑셀 파일에 원비 열이 없거나 비어있는 경우 적용할 기본 금액</p>
          </div>
          <div className="flex items-center gap-1 font-bold shrink-0">
            <input
              type="number"
              step="10000"
              value={defaultFee}
              onChange={(e) => setDefaultFee(Math.max(0, Number(e.target.value) || 0))}
              className="w-28 px-2.5 py-1.5 text-right font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold"
            />
            <span className="text-slate-600">원</span>
          </div>
        </div>

        {/* 설명 및 모드 탭 전환 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
          <p className="text-xs sm:text-sm text-slate-600">
            기존 엑셀 장부나 다른 프로그램의 명단을 손쉽게 대량 등록합니다.
          </p>
          <div className="flex bg-slate-100 p-1 rounded-xl self-start shrink-0">
            <button
              type="button"
              onClick={() => setImportMode('paste')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                importMode === 'paste'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>표 복사·붙여넣기 (Ctrl+V)</span>
            </button>
            <button
              type="button"
              onClick={() => setImportMode('file')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                importMode === 'file'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>파일 업로드 (.xlsx/.csv)</span>
            </button>
          </div>
        </div>

        {/* 모드 1: 엑셀 표 복사·붙여넣기 (Ctrl+V) */}
        {importMode === 'paste' ? (
          <div className="space-y-3">
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>간편 복사 팁:</strong> 엑셀이나 구글 시트에서 표 영역을 마우스로 긁어 <strong>Ctrl+C</strong>(복사)한 뒤, 아래 상자에 클릭하고 <strong>Ctrl+V</strong>(붙여넣기)하세요. 열 순서가 달라도 <strong>이름, 연락처, 생년월일, 과목</strong>을 지능형 패턴 매칭으로 자동 인식합니다.
              </div>
            </div>

            <div className="relative">
              <textarea
                value={pasteText}
                onChange={handleTextareaChange}
                onPaste={handlePasteEvent}
                placeholder={`이름\t생년월일\t연락처\t보호자명\t과목\n김민준\t2015-03-12\t010-1111-2222\t김철수\t바이엘\n김서아\t2018-07-25\t010-1111-2222\t김철수\t유치부`}
                rows={6}
                className="w-full font-mono text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
              />
              {pasteText && (
                <button
                  type="button"
                  onClick={() => reset()}
                  className="absolute top-2.5 right-2.5 text-[11px] font-semibold text-slate-400 hover:text-slate-700 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs"
                >
                  지우기
                </button>
              )}
            </div>
          </div>
        ) : (
          /* 모드 2: 파일 업로드 (.xlsx, .csv) */
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadTemplateCsv}
                className="inline-flex items-center gap-2 min-h-[40px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                <Download className="w-3.5 h-3.5" />
                {STUDENT_IMPORT_UI.downloadTemplate}
              </button>
              <button
                type="button"
                onClick={downloadTemplateXlsx}
                className="inline-flex items-center gap-2 min-h-[40px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                <Download className="w-3.5 h-3.5" />
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
              className={`w-full min-h-[110px] rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors disabled:opacity-50 ${
                dragOver
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40'
              }`}
            >
              <Upload
                className={`w-7 h-7 mx-auto mb-1.5 ${dragOver ? 'text-indigo-600' : 'text-slate-400'}`}
              />
              <p className="text-xs font-bold text-slate-800">
                {dragOver ? STUDENT_IMPORT_UI.dropActive : STUDENT_IMPORT_UI.dropHint}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">.xlsx · .xls · .csv</p>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {/* 파일명 또는 인식 요약 뱃지 */}
        {fileName && (
          <div className="flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600" />
              {fileName}
            </span>
            {validRows.length > 0 && (
              <span className="text-indigo-600 font-bold">
                유효 {validRows.length}명
              </span>
            )}
          </div>
        )}

        {/* 오류 및 경고 메시지 영역 */}
        {(errors.length > 0 || warnings.length > 0) && (
          <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs bg-rose-50/60 border border-rose-100 rounded-xl p-3">
            <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>확인이 필요한 항목 ({errors.length + warnings.length}건)</span>
            </div>
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

        {/* 실시간 미리보기 테이블 */}
        {validRows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-slate-700">
                {STUDENT_IMPORT_UI.preview} ({validRows.length}명)
              </p>
              <span className="text-[11px] text-slate-400">
                등록 전 정보를 확인하세요
              </span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-auto max-h-52 shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-bold text-slate-600">행</th>
                    <th className="px-3 py-2 font-bold text-slate-600">이름</th>
                    <th className="px-3 py-2 font-bold text-slate-600">생년월일</th>
                    <th className="px-3 py-2 font-bold text-slate-600">{contactLabel}</th>
                    <th className="px-3 py-2 font-bold text-slate-600">수강과목</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validRows.slice(0, 50).map((r) => (
                    <tr key={r.rowNumber} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2 text-slate-400 tabular-nums">{r.rowNumber}</td>
                      <td className="px-3 py-2 font-bold text-slate-800">{r.name}</td>
                      <td className="px-3 py-2 text-slate-600 tabular-nums">
                        {r.birthDate || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {r.isAdultSelf
                          ? `성인 · ${r.phone || '-'}`
                          : `${r.guardianName || '보호자'} · ${r.guardianPhone || '-'}`}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.courseSubject || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validRows.length > 50 && (
                <p className="px-3 py-2 text-[11px] text-slate-400 bg-slate-50/50 border-t border-slate-100 text-center">
                  외 {validRows.length - 50}명…
                </p>
              )}
            </div>
          </div>
        )}

        {progress && (
          <p className="text-sm text-indigo-700 font-semibold flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {STUDENT_IMPORT_UI.importing} {progress.completed}/{progress.total}
            </span>
          </p>
        )}

        {/* 모달 하단 버튼 */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
            className="min-h-[44px] px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 inline-flex items-center gap-2 shadow-2xs"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {validRows.length > 0 ? `${validRows.length}명 원스톱 일괄 등록` : STUDENT_IMPORT_UI.importAction}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
