import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Building2,
  Scale,
  Award,
  AlertCircle,
  FileCheck2,
  Plus,
  Trash2,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';
import {
  createPurchaseContractPackage,
  SOLE_SOURCE_REASON_LABELS,
  type SoleSourceReasonType,
  type BiddingVendorQuote,
  type PurchaseRequisition,
  type ContractPackage,
} from '../domain/procurementPipelineEngine';

interface PurchaseContractPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRequisitions: PurchaseRequisition[];
  onPackageCreated: (pkg: ContractPackage) => void;
}

export const PurchaseContractPackageModal: React.FC<PurchaseContractPackageModalProps> = ({
  isOpen,
  onClose,
  selectedRequisitions,
  onPackageCreated,
}) => {
  const [packageTitle, setPackageTitle] = useState(
    `2026년 하반기 부서 통합 조달 계약 건 (${new Date().toISOString().slice(5, 10)})`
  );
  const [contractType, setContractType] = useState<'bidding' | 'sole_source'>('bidding');
  const [errorMessage, setErrorMessage] = useState('');

  // 1) 경쟁 입찰 견적 목록 (기본 2곳 세팅)
  const [quotes, setQuotes] = useState<BiddingVendorQuote[]>([
    {
      vendorName: '한국공구상사',
      quotedUnitPrice: 0,
      totalQuotedAmount: 0,
      leadTimeDays: 3,
      quoteDocumentName: '견적서_한국공구.pdf',
      isSelectedWinner: true,
    },
    {
      vendorName: '글로벌MRO코리아',
      quotedUnitPrice: 0,
      totalQuotedAmount: 0,
      leadTimeDays: 2,
      quoteDocumentName: '견적서_글로벌MRO.pdf',
      isSelectedWinner: false,
    },
  ]);

  // 2) 수의 계약 상태
  const [soleSourceReasonType, setSoleSourceReasonType] = useState<SoleSourceReasonType>(
    'equipment_compatibility'
  );
  const [soleSourceReasonDetail, setSoleSourceReasonDetail] = useState('');
  const [soleSourceVendor, setSoleSourceVendor] = useState('한국정밀화스너');
  const [soleSourceAgreedAmount, setSoleSourceAgreedAmount] = useState(0);
  const [supportingDocumentName, setSupportingDocumentName] = useState(
    '제조사정품보증확인서_2026.pdf'
  );

  if (!isOpen) return null;

  // 총 추정 예산 합계 계산
  const totalBudget = selectedRequisitions.reduce(
    (sum, pr) => sum + pr.totalEstimatedAmount,
    0
  );

  // 경쟁 입찰 공급사 추가
  const handleAddQuote = () => {
    setQuotes((prev) => [
      ...prev,
      {
        vendorName: '',
        quotedUnitPrice: 0,
        totalQuotedAmount: 0,
        leadTimeDays: 5,
        isSelectedWinner: false,
      },
    ]);
  };

  const handleRemoveQuote = (idx: number) => {
    if (quotes.length <= 2) return;
    setQuotes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuoteChange = (index: number, field: keyof BiddingVendorQuote, val: any) => {
    setQuotes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleSelectWinner = (index: number) => {
    setQuotes((prev) =>
      prev.map((q, i) => ({
        ...q,
        isSelectedWinner: i === index,
      }))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const res = createPurchaseContractPackage({
      packageTitle,
      sourceRequisitions: selectedRequisitions,
      contractType,
      biddingQuotes: contractType === 'bidding' ? quotes : undefined,
      soleSource:
        contractType === 'sole_source'
          ? {
              reasonType: soleSourceReasonType,
              reasonDetail: soleSourceReasonDetail,
              supportingDocumentName,
              targetVendor: soleSourceVendor,
              agreedAmount: soleSourceAgreedAmount || totalBudget,
            }
          : undefined,
    });

    if (res.error || !res.package) {
      setErrorMessage(res.error || '계약 패키지 생성에 실패했습니다.');
      return;
    }

    onPackageCreated(res.package);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* 헤더 */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">다품목 묶음 계약 및 방식 결정</h2>
              <p className="text-xs text-slate-400">
                3단계: 검수 통과 품목 일괄 묶음 및 경쟁 입찰 vs 수의계약 사유서 결정
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. 계약 패키지 명칭 및 대상 건 요약 */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                계약 패키지 명칭 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={packageTitle}
                onChange={(e) => setPackageTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-medium"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">결합된 구매 요청 건:</span>{' '}
                <strong className="text-xs text-slate-800">
                  {selectedRequisitions.length}건 (
                  {selectedRequisitions.map((r) => r.prNumber).join(', ')})
                </strong>
              </div>
              <div>
                <span className="text-xs text-slate-500">통합 추정 예산:</span>{' '}
                <strong className="text-sm font-black text-slate-900">
                  {totalBudget.toLocaleString()}원
                </strong>
              </div>
            </div>
          </div>

          {/* 2. 계약 방식 선택 라디오 */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              계약 방식 선택 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  contractType === 'bidding'
                    ? 'border-indigo-600 bg-slate-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="contractType"
                  value="bidding"
                  checked={contractType === 'bidding'}
                  onChange={() => setContractType('bidding')}
                  className="mt-0.5 text-slate-800 focus:ring-slate-900"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Scale className="w-3.5 h-3.5 text-slate-800" />
                    <span>옵션 A: 경쟁 입찰 (Bidding)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    2곳 이상 공급사 견적 대사표 비교 후 최적 업체 선정
                  </p>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  contractType === 'sole_source'
                    ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="contractType"
                  value="sole_source"
                  checked={contractType === 'sole_source'}
                  onChange={() => setContractType('sole_source')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>옵션 B: 수의 계약 (Sole Source)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    특정 1개 업체 단독 계약 & ★수의계약 사유서 필수 작성
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 3-A. 경쟁 입찰 세부 화면 */}
          {contractType === 'bidding' && (
            <div className="p-4 bg-slate-50/40 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-slate-800" />
                    복수 공급사 견적 비교 대사표 (최소 2개사 이상)
                  </h3>
                  <p className="text-[11px] text-slate-700/80">
                    단가 및 납기일을 대조하여 최종 낙찰 업체를 지정합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuote}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  업체 추가
                </button>
              </div>

              <div className="space-y-2">
                {quotes.map((q, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition ${
                      q.isSelectedWinner
                        ? 'bg-white border-indigo-500 shadow-xs'
                        : 'bg-white/80 border-slate-200'
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <div className="md:col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectWinner(idx)}
                          className={`p-1.5 rounded-lg text-xs font-bold transition ${
                            q.isSelectedWinner
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-400 hover:text-slate-800'
                          }`}
                          title="낙찰 업체로 지정"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-400">공급사 상호</label>
                        <input
                          type="text"
                          value={q.vendorName}
                          onChange={(e) => handleQuoteChange(idx, 'vendorName', e.target.value)}
                          placeholder="공급업체명"
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md font-semibold"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-400">총 견적 금액(원)</label>
                        <input
                          type="number"
                          value={q.totalQuotedAmount}
                          onChange={(e) =>
                            handleQuoteChange(idx, 'totalQuotedAmount', Number(e.target.value))
                          }
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md text-right font-bold"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400">납기 리드타임</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={q.leadTimeDays}
                            onChange={(e) =>
                              handleQuoteChange(idx, 'leadTimeDays', Number(e.target.value))
                            }
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md text-center"
                          />
                          <span className="text-[11px] text-slate-500">일</span>
                        </div>
                      </div>

                      <div className="md:col-span-2 text-right">
                        {q.isSelectedWinner ? (
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-md">
                            최종 낙찰
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectWinner(idx)}
                            className="text-[11px] text-slate-800 hover:underline"
                          >
                            선택
                          </button>
                        )}
                      </div>

                      <div className="md:col-span-1 text-right">
                        {quotes.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuote(idx)}
                            className="text-slate-300 hover:text-rose-500 transition p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3-B. ★ 수의 계약 (Sole Source) 사유서 필수 작성 화면 */}
          {contractType === 'sole_source' && (
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-700" />
                <h3 className="text-xs font-bold text-amber-950">
                  수의계약 사유서 (사내 감사 및 ISO 9001 필수 증빙)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    수의계약 대상 업체 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={soleSourceVendor}
                    onChange={(e) => setSoleSourceVendor(e.target.value)}
                    placeholder="단독 체결 공급업체명"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    수의계약 사유 유형 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={soleSourceReasonType}
                    onChange={(e) => setSoleSourceReasonType(e.target.value as SoleSourceReasonType)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  >
                    {Object.entries(SOLE_SOURCE_REASON_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-950 mb-1">
                  수의계약 상세 사유 서술 <span className="text-rose-500">* (10자 이상 필수)</span>
                </label>
                <textarea
                  rows={3}
                  value={soleSourceReasonDetail}
                  onChange={(e) => setSoleSourceReasonDetail(e.target.value)}
                  placeholder="단독 수의계약을 체결해야만 하는 구체적 기술적/경영적 사유를 서술하세요.&#10;예) 기존 독일산 가공기 1호기의 제조사 정품 규격 부품으로 타사 호환품 사용 시 무상 보증이 파기되며 정밀도 오차가 발생함."
                  className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  첨부 증빙 서류명 (독점공급확인서, 제조사공문 등)
                </label>
                <div className="relative">
                  <Paperclip className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={supportingDocumentName}
                    onChange={(e) => setSupportingDocumentName(e.target.value)}
                    placeholder="예: 독점공급확인서_한국정밀.pdf"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 하단 액션 */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-xs transition"
            >
              계약 패키지 기안 확정
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
