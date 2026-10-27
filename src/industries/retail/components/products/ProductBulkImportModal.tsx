import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileCheck,
  Check,
  X,
  Layers,
  Package,
} from 'lucide-react';
import { Modal } from '@/shared/components';
import { formatCurrency } from '@/utils/formatters';
import {
  parseProductCsv,
  generateSampleProductCsv,
  type CsvParseSummary,
  type ValidatedProductGroup,
} from '../../services/productBulkImportEngine';
import {
  productBulkImportService,
  type BulkImportSummary,
  type ImportProgress,
} from '../../services/productBulkImportService';

interface Props {
  isOpen: boolean;
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview' | 'processing' | 'done';

export const ProductBulkImportModal: React.FC<Props> = ({
  isOpen,
  organizationId,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [parseSummary, setParseSummary] = useState<CsvParseSummary | null>(null);

  // 옵션 설정
  const [updateExisting, setUpdateExisting] = useState<boolean>(true);
  const [applyInitialStock, setApplyInitialStock] = useState<boolean>(true);

  // 진행 상태
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    percent: 0,
    message: '',
  });
  const [importSummary, setImportSummary] = useState<BulkImportSummary | null>(null);

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setParseSummary(null);
    setImportSummary(null);
    setProgress({ current: 0, total: 0, percent: 0, message: '' });
  };

  const handleModalClose = () => {
    if (step === 'done') {
      onSuccess();
    }
    resetState();
    onClose();
  };

  // 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const csvContent = generateSampleProductCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'moa_product_bulk_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 파일 파싱 처리
  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const parsed = parseProductCsv(text);
      setParseSummary(parsed);
      setStep('preview');
    };

    reader.readAsText(file, 'utf-8');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // 대량 등록 실행
  const handleExecuteImport = async () => {
    if (!parseSummary || parseSummary.groups.length === 0) return;
    setStep('processing');

    try {
      const summary = await productBulkImportService.bulkImport(
        organizationId,
        parseSummary.groups,
        {
          updateExistingByCode: updateExisting,
          applyInitialStock: applyInitialStock,
        },
        (p) => setProgress(p)
      );

      setImportSummary(summary);
      setStep('done');
    } catch (err) {
      console.error('대량 등록 실패:', err);
      setStep('preview');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} title="상품 엑셀(CSV) 대량 일괄 등록" maxWidth="lg">
      <div className="flex flex-col max-h-[85vh]">
        {/* Step 1: 파일 업로드 및 옵션 */}
        {step === 'upload' && (
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* 상단 템플릿 안내 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                  표준 CSV 양식을 사용해 주세요
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  상품명, 바코드, 판매가, 원가, 카테고리, 옵션, 기초재고를 한 번에 작성할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="shrink-0 min-h-[40px] px-3.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" />
                샘플 양식 다운로드
              </button>
            </div>

            {/* 드래그 앤 드롭 업로드 영역 */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-8 text-center bg-white hover:bg-teal-50/20 transition-all cursor-pointer space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  작성한 CSV 파일을 이곳에 끌어다 놓거나 클릭하여 선택하세요
                </p>
                <p className="text-xs text-slate-400 mt-1">.csv 파일 지원 (엑셀에서 'CSV UTF-8'로 저장 권장)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* 등록 옵션 체크박스 */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-700">일괄 등록 설정</h4>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span>기존에 등록된 바코드/상품명이 있는 경우 기존 상품 정보를 업데이트(수정)합니다.</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyInitialStock}
                  onChange={(e) => setApplyInitialStock(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span>CSV에 작성된 '초기재고' 수량을 매장 실제 재고로 즉시 입고 반영합니다.</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 2: 미리보기 & 유효성 검사 결과 */}
        {step === 'preview' && parseSummary && (
          <div className="p-6 space-y-4 overflow-y-auto">
            {/* 요약 뱃지 */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">총 데이터 행</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{parseSummary.totalRows}행</p>
              </div>
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
                <p className="text-xs text-teal-700 font-medium">등록 대상 상품</p>
                <p className="text-lg font-bold text-teal-900 tabular-nums">{parseSummary.groups.length}개 품목</p>
              </div>
              <div className={`p-3 rounded-xl border ${parseSummary.errorRows > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <p className="text-xs font-medium">오류 행</p>
                <p className="text-lg font-bold tabular-nums">{parseSummary.errorRows}건</p>
              </div>
            </div>

            {/* 오류 목록 (있을 시) */}
            {parseSummary.errorRows > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-900">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  오류가 발생한 {parseSummary.errorRows}개 행은 제외되고 정상 품목만 등록됩니다:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700 max-h-24 overflow-y-auto pl-1">
                  {parseSummary.parsedRows
                    .filter((r) => !r.isValid)
                    .slice(0, 10)
                    .map((errRow) => (
                      <li key={errRow.rowNumber}>
                        {errRow.rowNumber}행: {errRow.name || '(상품명 없음)'} — {errRow.errors.join(', ')}
                      </li>
                    ))}
                  {parseSummary.errorRows > 10 && <li>... 외 {parseSummary.errorRows - 10}건 추가 오류</li>}
                </ul>
              </div>
            )}

            {/* 등록 예정 품목 미리보기 테이블 */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between">
                <span>등록 대상 상품 미리보기 (상위 15개)</span>
                <span>파일: {fileName}</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-2">상품명</th>
                      <th className="p-2">바코드</th>
                      <th className="p-2">카테고리</th>
                      <th className="p-2 text-right">판매가</th>
                      <th className="p-2 text-center">옵션수</th>
                      <th className="p-2 text-right">기초재고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseSummary.groups.slice(0, 15).map((group, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-900">{group.name}</td>
                        <td className="p-2 font-mono text-slate-600">{group.productCode || '-'}</td>
                        <td className="p-2 text-slate-600">{group.categoryName || '-'}</td>
                        <td className="p-2 text-right font-bold tabular-nums text-teal-700">
                          {formatCurrency(group.price)}
                        </td>
                        <td className="p-2 text-center">
                          {group.variants.length > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">
                              옵션 {group.variants.length}개
                            </span>
                          ) : (
                            <span className="text-slate-400">단품</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-bold tabular-nums text-slate-800">
                          {group.initialStock}개
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 하단 버튼 바 */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                다시 선택
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={parseSummary.groups.length === 0}
                className="flex-[2] min-h-[44px] rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {parseSummary.groups.length}개 품목 일괄 등록 시작하기
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 진행 중 (Progress) */}
        {step === 'processing' && (
          <div className="p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">상품 대량 등록을 진행하고 있습니다</h3>
              <p className="text-xs text-slate-500 font-mono">{progress.message}</p>
            </div>

            {/* 프로그레스 바 */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-teal-600 h-full transition-all duration-200"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-xs font-bold text-teal-800 tabular-nums">
              {progress.current} / {progress.total} 처리 완료 ({progress.percent}%)
            </p>
          </div>
        )}

        {/* Step 4: 완료 요약 (Done) */}
        {step === 'done' && importSummary && (
          <div className="p-6 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">상품 일괄 등록이 완료되었습니다!</h3>
              <p className="text-xs text-slate-500">모든 품목과 기초 재고가 안전하게 데이터베이스에 반영되었습니다.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">신규 등록</p>
                <p className="text-lg font-bold text-teal-800 tabular-nums">{importSummary.inserted}건</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">정보 갱신</p>
                <p className="text-lg font-bold text-slate-800 tabular-nums">{importSummary.updated}건</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">기초 재고 반영</p>
                <p className="text-lg font-bold text-teal-800 tabular-nums">{importSummary.stockInitialized}개</p>
              </div>
            </div>

            {importSummary.errors.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900">
                <p className="font-bold">일부 품목 처리 실패 ({importSummary.errors.length}건):</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-amber-800">
                  {importSummary.errors.map((e, idx) => (
                    <li key={idx}>
                      {e.productName}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={handleModalClose}
              className="w-full min-h-[46px] rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-sm cursor-pointer"
            >
              상품 목록 확인하기
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
