import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileSignature,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Percent,
  Calendar,
  DollarSign,
  ShieldCheck,
  User,
  BookOpen,
} from 'lucide-react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { generateInstructorConsignmentClauses } from '@/capabilities/digital_contract/domain/digitalContractEngine';

export interface InstructorContractData {
  id: string;
  contractNumber: string;
  instructorName: string;
  instructorPhone: string;
  courseName: string;
  totalWeeks: number;
  tuitionFeePerPerson: number;
  instructorSharePercent: number; // e.g. 50 (50%)
  centerSharePercent: number; // e.g. 50 (50%)
  materialCostPerPerson: number;
  cardFeeRate: number; // e.g. 0.03
  withholdingTax: boolean;
  startDate: string;
  endDate: string;
  signedAt: string;
  signatureDataUrl?: string;
  status: 'SIGNED' | 'DRAFT';
}

interface InstructorContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (contract: InstructorContractData) => void;
  initialInstructorName?: string;
  initialInstructorPhone?: string;
  initialCourseName?: string;
}

export const InstructorContractModal: React.FC<InstructorContractModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialInstructorName = '',
  initialInstructorPhone = '',
  initialCourseName = '',
}) => {
  const [instructorName, setInstructorName] = useState(initialInstructorName);
  const [instructorPhone, setInstructorPhone] = useState(initialInstructorPhone);
  const [courseName, setCourseName] = useState(initialCourseName);
  const [totalWeeks, setTotalWeeks] = useState(12);
  const [tuitionFee, setTuitionFee] = useState(150000);
  const [instructorShare, setInstructorShare] = useState(50); // 50%
  const [materialCost, setMaterialCost] = useState(20000);
  const [applyMaterialDeduction, setApplyMaterialDeduction] = useState(true);
  const [applyWithholdingTax, setApplyWithholdingTax] = useState(true);
  const [startDate, setStartDate] = useState('2026-11-01');
  const [endDate, setEndDate] = useState('2027-01-31');

  // 서명 캔버스 상태
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // 초기값 동기화
  useEffect(() => {
    if (initialInstructorName) setInstructorName(initialInstructorName);
    if (initialInstructorPhone) setInstructorPhone(initialInstructorPhone);
    if (initialCourseName) setCourseName(initialCourseName);
  }, [initialInstructorName, initialInstructorPhone, initialCourseName]);

  const centerShare = Math.max(0, 100 - instructorShare);

  // 계약 표준 조항 생성
  const contractClauses = useMemo(() => {
    return generateInstructorConsignmentClauses({
      centerSharePercent: centerShare,
      instructorSharePercent: instructorShare,
      withholdingTax: applyWithholdingTax,
      materialCostDeduction: applyMaterialDeduction && materialCost > 0,
    });
  }, [centerShare, instructorShare, applyWithholdingTax, applyMaterialDeduction, materialCost]);

  // 서명 드로잉 관련
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e3a8a'; // 남색 서명
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSaveContract = () => {
    if (!instructorName.trim()) {
      showToast('강사명을 입력해 주세요.', 'error');
      return;
    }
    if (!courseName.trim()) {
      showToast('위탁 강좌명을 입력해 주세요.', 'error');
      return;
    }
    if (!hasSignature) {
      showToast('강사 자필 전자서명을 완료해 주세요.', 'error');
      return;
    }

    const canvas = canvasRef.current;
    const signatureDataUrl = canvas ? canvas.toDataURL('image/png') : undefined;

    const newContract: InstructorContractData = {
      id: `ctr-inst-${Date.now()}`,
      contractNumber: `CTR-INS-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(
        100 + Math.random() * 900
      )}`,
      instructorName,
      instructorPhone,
      courseName,
      totalWeeks,
      tuitionFeePerPerson: tuitionFee,
      instructorSharePercent: instructorShare,
      centerSharePercent: centerShare,
      materialCostPerPerson: applyMaterialDeduction ? materialCost : 0,
      cardFeeRate: 0.03,
      withholdingTax: applyWithholdingTax,
      startDate,
      endDate,
      signedAt: new Date().toISOString(),
      signatureDataUrl,
      status: 'SIGNED',
    };

    onSave?.(newContract);
    showToast(`${instructorName} 강사와의 위탁계약 체결 및 전자서명이 완료되었습니다.`, 'success');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSignature className="w-5 h-5 text-blue-200" />
            <div>
              <h2 className="text-lg font-bold">문화센터 강사 강의 위탁계약서 체결</h2>
              <p className="text-xs text-blue-100">
                매출 배분율(RS %), 세무 원천징수(3.3%) 설정 및 강사 자필 전자서명
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 바디 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 강사 및 강좌 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                위탁 강사 인적사항
              </h3>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">강사 성명 *</label>
                <input
                  type="text"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="예: 김민지"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">연락처</label>
                <input
                  type="text"
                  value={instructorPhone}
                  onChange={(e) => setInstructorPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">위탁 시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">위탁 종료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                위탁 대상 강좌 설정
              </h3>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">강좌명 *</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="예: 정통 이탈리안 파스타 마스터 클래스"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">강의 기간</label>
                  <select
                    value={totalWeeks}
                    onChange={(e) => setTotalWeeks(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value={4}>4주 (1개월 특강)</option>
                    <option value={8}>8주 (2개월 코스)</option>
                    <option value={12}>12주 (3개월 정규 학기)</option>
                    <option value={16}>16주 (4개월 심화)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">1인 수강료 (원)</label>
                  <input
                    type="number"
                    step={10000}
                    value={tuitionFee}
                    onChange={(e) => setTuitionFee(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyMaterialDeduction}
                    onChange={(e) => setApplyMaterialDeduction(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>1인당 재료비/실습비 실비 공제 적용</span>
                </label>
                {applyMaterialDeduction && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs text-slate-500">인당 재료비:</span>
                    <input
                      type="number"
                      step={5000}
                      value={materialCost}
                      onChange={(e) => setMaterialCost(Number(e.target.value) || 0)}
                      className="w-28 px-2 py-1 text-xs border rounded bg-white font-medium"
                    />
                    <span className="text-xs text-slate-500">원</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 배분비율 (RS %) 및 세무 설정 */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-blue-600" />
                수강료 매출 배분 비율 (Revenue Sharing)
              </span>
              <div className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
                강사 {instructorShare}% : 센터 {centerShare}%
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>센터 90% / 강사 10%</span>
                <span className="font-bold text-blue-700">강사 요율: {instructorShare}%</span>
                <span>센터 10% / 강사 90%</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={instructorShare}
                onChange={(e) => setInstructorShare(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-blue-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 text-slate-800 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyWithholdingTax}
                  onChange={(e) => setApplyWithholdingTax(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>프리랜서 3.3% 사업소득세 원천징수 적용 (소득세 3% + 지방소득세 0.3%)</span>
              </label>
              <span className="text-slate-500">신용카드 결제 수수료 공제: 기본 3% 반영</span>
            </div>
          </div>

          {/* 표준 위탁 계약서 조항 프리뷰 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100 px-4 py-2.5 border-b text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                표준 강사 강의 위탁계약서 자동 생성 약관 (법적 구속력)
              </span>
              <span className="text-[11px] text-slate-500">공정거래위원회 평생교육 표준약관 기준</span>
            </div>
            <div className="p-4 space-y-3 max-h-48 overflow-y-auto text-xs text-slate-700 divide-y divide-gray-100">
              {contractClauses.map((clause) => (
                <div key={clause.id} className="pt-2.5 first:pt-0">
                  <h4 className="font-bold text-slate-900 mb-0.5">{clause.title}</h4>
                  <p className="text-slate-600 leading-relaxed">{clause.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 자필 전자서명 패드 */}
          <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <FileSignature className="w-4 h-4 text-indigo-600" />
                위탁 강사 자필 전자서명 (터치/마우스 드로잉) *
              </label>
              <button
                type="button"
                onClick={clearSignature}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600 px-2 py-0.5 border rounded bg-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                서명 초기화
              </button>
            </div>

            <div className="relative border-2 border-dashed border-indigo-200 bg-white rounded-lg overflow-hidden h-32 touch-none">
              <canvas
                ref={canvasRef}
                width={700}
                height={128}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full cursor-crosshair"
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                  여기에 손가락 또는 마우스로 자필 서명하세요
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>서명 완료 시 전자서명법에 따른 위탁 효력이 발생합니다.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveContract}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              계약 체결 및 전자서명 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
