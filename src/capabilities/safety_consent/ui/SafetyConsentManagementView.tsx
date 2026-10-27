import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  X,
  Calendar,
  User,
  Hash,
} from 'lucide-react';

import { showToast } from '@/shared/feedback/uiFeedback';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { insertOpsRow, listOpsRows } from '@/core/organizations/services/opsPersistenceService';
import {
  selectActiveConsentTemplate,
  validateSignatureMetadata,
  generateConsentAuditRecord,
  type ConsentTemplate,
  type ConsentAuditRecord,
  type SignatureMetadata,
} from '../domain/safetyConsentEngine';

const DEFAULT_TEMPLATES: ConsentTemplate[] = [
  {
    id: 'tpl-climbing',
    type: 'CLIMBING_WAIVER',
    version: 1,
    title: '클라이밍 안전 수칙 및 면책 서약서',
    bodyText:
      '본인은 볼더링 및 인공암벽 등반이 본질적으로 부상 위험을 수반하는 활동임을 인지하며, 시설 내 안전 수칙을 준수하고 본인의 부주의로 인한 사고에 대해 사업장에 책임을 묻지 않을 것에 동의합니다.',
    mandatoryClauses: [
      { id: 'c1', text: '기본 안전 수칙 및 낙하 법 숙지 확인' },
      { id: 'c2', text: '신체 이상 및 기저 질환 유무 확인' },
      { id: 'c3', text: '위험 행동 시 퇴장 조치 동의' },
    ],
    effectiveFrom: '2025-01-01',
    isActive: true,
  },
  {
    id: 'tpl-combat',
    type: 'COMBAT_FITNESS_WAIVER',
    version: 1,
    title: '격투기/스파링 및 고강도 트레이닝 동의서',
    bodyText:
      '본인은 복싱, MMA 등 격투 운동 및 고강도 훈련 중 발생할 수 있는 신체적 접촉과 부상 가능성을 충분히 설명 들었으며, 지도자의 통제 하에 성실히 안전 장비를 착용하고 임할 것을 서약합니다.',
    mandatoryClauses: [
      { id: 'c1', text: '보호대 및 안전 장비 필수 착용 동의' },
      { id: 'c2', text: '지도자 중단 지시 즉각 복종 동의' },
      { id: 'c3', text: '자가 신체 한계 내 훈련 수행 동의' },
    ],
    effectiveFrom: '2025-01-01',
    isActive: true,
  },
  {
    id: 'tpl-tattoo',
    type: 'TATTOO_CONSENT',
    version: 1,
    title: '타투·미용 시술 동의서 및 관리 서약서',
    bodyText:
      '본인은 시술 과정과 사후 관리 요령에 대해 충분한 설명을 들었으며, 본인의 피부 상태 및 알레르기 유무를 사실대로 고지하였음을 확인합니다.',
    mandatoryClauses: [
      { id: 'c1', text: '만 19세 이상 성인 신분 확인' },
      { id: 'c2', text: '켈로이드/피부 알레르기 질환 유무 고지 확인' },
      { id: 'c3', text: '시술 후 음주/사우나 금지 등 사후 관리 준수' },
    ],
    effectiveFrom: '2025-01-01',
    isActive: true,
  },
];

export const SafetyConsentManagementView: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? null;
  const [auditRecords, setAuditRecords] = useState<ConsentAuditRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<ConsentAuditRecord | null>(null);

  useEffect(() => {
    if (!orgId) {
      setAuditRecords([]);
      return;
    }
    void listOpsRows<{ payload?: ConsentAuditRecord }>('safety_consent_signatures', orgId)
      .then((rows) => {
        setAuditRecords(
          rows
            .map((row) => row.payload)
            .filter((payload): payload is ConsentAuditRecord => Boolean(payload && payload.signerName)),
        );
      })
      .catch(() => setAuditRecords([]));
  }, [orgId]);

  const saveAuditRecords = (next: ConsentAuditRecord[]) => {
    setAuditRecords(next);
    if (!orgId) return;
    const latest = next[0];
    if (!latest) return;
    void insertOpsRow('safety_consent_signatures', orgId, {
      consent_id: latest.templateId || latest.id,
      signer_name: latest.signerName,
      signed_at: latest.signedAt || new Date().toISOString(),
      payload: latest,
    });
  };

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return auditRecords;
    const term = searchTerm.toLowerCase();
    return auditRecords.filter(
      (r) =>
        r.signerName.toLowerCase().includes(term) ||
        r.signerPhone.includes(term) ||
        r.signatureProofHash.toLowerCase().includes(term)
    );
  }, [auditRecords, searchTerm]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2 pb-12">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>법적 효력 및 면책 서약</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">안전 동의서 & 서약서 보관함</h1>
          <p className="text-xs text-slate-500 mt-1">
            체육관, 클라이밍, 타투, 맞춤 시술의 전자 서명 및 법적 분쟁 방어용 불변 감사 로그를 관리합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>신규 전자 서약 작성</span>
        </button>
      </div>

      {/* 요약 지표 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-bold uppercase text-slate-400">보관된 서약서</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{auditRecords.length}건</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-bold uppercase text-slate-400">등록된 서약서 양식</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{DEFAULT_TEMPLATES.length}종</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-bold uppercase text-slate-400">최근 서명 일시</p>
          <p className="text-sm font-bold text-slate-700 mt-2">
            {auditRecords.length > 0
              ? new Date(auditRecords[0].signedAt).toLocaleString('ko-KR')
              : '서명 내역 없음'}
          </p>
        </div>
      </div>

      {/* 검색 및 목록 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="서명자 성명, 연락처, 증명 해시 검색"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-medium text-slate-600">등록된 전자 서약서가 없습니다.</p>
            <p className="text-xs text-slate-400">
              고객 입장 시 '신규 전자 서약 작성'을 눌러 서명을 받아두세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-5 py-3.5">서명 일시</th>
                  <th className="px-5 py-3.5">서명자</th>
                  <th className="px-5 py-3.5">연락처</th>
                  <th className="px-5 py-3.5">서약서 양식</th>
                  <th className="px-5 py-3.5">무결성 증명 해시</th>
                  <th className="px-5 py-3.5 text-right">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-900 whitespace-nowrap">
                      {new Date(r.signedAt).toLocaleDateString('ko-KR')}{' '}
                      <span className="text-slate-400 text-[11px]">
                        {new Date(r.signedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800">{r.signerName}</td>
                    <td className="px-5 py-4 text-slate-600 font-mono">{r.signerPhone}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold">
                        {r.templateId} (v{r.templateVersion})
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500 max-w-[140px] truncate">
                      {r.signatureProofHash}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setPreviewRecord(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>확인</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 신규 서약 작성 모달 */}
      {isModalOpen && (
        <SafetyConsentSigningModal
          templates={DEFAULT_TEMPLATES}
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newRecord) => {
            saveAuditRecords([newRecord, ...auditRecords]);
            setIsModalOpen(false);
            showToast('전자 서약서가 안전하게 보관되었습니다.', 'success');
          }}
        />
      )}

      {/* 감사 증명 상세 미리보기 모달 */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">서약서 감사 증명서</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 font-mono text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">서명자:</span>
                <span className="font-bold text-slate-900">{previewRecord.signerName} ({previewRecord.signerPhone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">서명 일시:</span>
                <span>{new Date(previewRecord.signedAt).toLocaleString('ko-KR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">양식/버전:</span>
                <span>{previewRecord.templateId} (ver {previewRecord.templateVersion})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">동의 조항:</span>
                <span className="text-emerald-700 font-bold">{previewRecord.agreedClauseIds.length}개 조항 전체 동의</span>
              </div>
              <div className="flex flex-col gap-1 pt-2 border-t border-slate-200">
                <span className="text-slate-400">불변 서명 해시:</span>
                <span className="break-all font-mono text-[10px] text-amber-700 bg-white p-2 rounded-lg border border-slate-200">
                  {previewRecord.signatureProofHash}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SigningModalProps {
  templates: ConsentTemplate[];
  onClose: () => void;
  onSuccess: (record: ConsentAuditRecord) => void;
}

const SafetyConsentSigningModal: React.FC<SigningModalProps> = ({ templates, onClose, onSuccess }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [signerName, setSignerName] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  const [agreedClauses, setAgreedClauses] = useState<Record<string, boolean>>({});

  // 캔버스 서명 필기 상태
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const strokeCountRef = useRef(0);
  const pointsCountRef = useRef(0);
  const drawStartMsRef = useRef(0);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || templates[0],
    [templates, selectedTemplateId]
  );

  // 템플릿 변경 시 동의 초기화
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    activeTemplate.mandatoryClauses.forEach((c) => {
      initial[c.id] = false;
    });
    setAgreedClauses(initial);
  }, [activeTemplate]);

  // 서명 캔버스 초기화
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeCountRef.current = 0;
    pointsCountRef.current = 0;
    drawStartMsRef.current = 0;
    lastPointRef.current = null;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    if (drawStartMsRef.current === 0) {
      drawStartMsRef.current = Date.now();
    }
    strokeCountRef.current += 1;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPointRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastPointRef.current = { x: currentX, y: currentY };
    pointsCountRef.current += 1;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!signerName.trim()) {
      showToast('서명자 성명을 입력해주세요.', 'warning');
      return;
    }
    if (!signerPhone.trim()) {
      showToast('연락처를 입력해주세요.', 'warning');
      return;
    }

    // 필수 조항 검사
    const agreedList = Object.entries(agreedClauses)
      .filter(([, val]) => val)
      .map(([id]) => id);

    const missing = activeTemplate.mandatoryClauses.some((c) => !agreedClauses[c.id]);
    if (missing) {
      showToast('모든 필수 안전 조항에 동의해야 합니다.', 'warning');
      return;
    }

    // 서명 캔버스 검증
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const durationMs = drawStartMsRef.current > 0 ? Date.now() - drawStartMsRef.current : 0;

    const signatureMeta: SignatureMetadata = {
      strokeCount: strokeCountRef.current,
      totalPointsCount: pointsCountRef.current,
      durationMs,
      dataUrlLength: dataUrl.length,
    };

    const sigValidation = validateSignatureMetadata(signatureMeta);
    if (!sigValidation.isValid) {
      showToast(sigValidation.error || '유효한 서명을 입력해주세요.', 'warning');
      return;
    }

    // 감사 레코드 생성
    const result = generateConsentAuditRecord({
      consentId: `consent-${Date.now()}`,
      template: activeTemplate,
      signerName: signerName.trim(),
      signerPhone: signerPhone.trim(),
      agreedClauseIds: agreedList,
      signatureDataUrl: dataUrl,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Moa-v2 Client',
    });

    if (!result.success || !result.auditRecord) {
      showToast(result.error || '서약서 생성에 실패했습니다.', 'error');
      return;
    }

    onSuccess(result.auditRecord);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 my-8 space-y-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-extrabold text-slate-900">신규 전자 서약 및 동의서 작성</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 템플릿 선택 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">서약서 양식</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} (v{t.version})
                </option>
              ))}
            </select>
          </div>

          {/* 서약자 기본 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">서명자 성명</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">연락처</label>
              <input
                type="text"
                value={signerPhone}
                onChange={(e) => setSignerPhone(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* 서약 본문 */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <p className="text-xs font-bold text-slate-800">{activeTemplate.title}</p>
            <p className="text-[11px] text-slate-600 leading-relaxed max-h-24 overflow-y-auto">
              {activeTemplate.bodyText}
            </p>
          </div>

          {/* 필수 조항 동의 체크박스 */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">필수 동의 조항 (전체 필수)</label>
            {activeTemplate.mandatoryClauses.map((clause) => (
              <label
                key={clause.id}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!!agreedClauses[clause.id]}
                  onChange={(e) =>
                    setAgreedClauses({ ...agreedClauses, [clause.id]: e.target.checked })
                  }
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <span className="text-xs text-slate-700 font-medium">{clause.text}</span>
              </label>
            ))}
          </div>

          {/* 서명 캔버스 영역 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">자필 정자 서명</label>
              <button
                type="button"
                onClick={clearCanvas}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>다시 쓰기</span>
              </button>
            </div>
            <div className="border border-slate-300 rounded-2xl overflow-hidden bg-slate-50/50">
              <canvas
                ref={canvasRef}
                width={500}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 touch-none cursor-crosshair bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              마우스 또는 손가락으로 성명을 정자로 서명해 주세요. (단순한 점이나 획은 거부됩니다)
            </p>
          </div>

          {/* 하단 버튼 */}
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
            >
              서약서 서명 완료 및 보관
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
