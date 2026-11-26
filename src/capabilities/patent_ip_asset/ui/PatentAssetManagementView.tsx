import React, { useState } from 'react';
import {
  Award,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  ShieldCheck,
  Coins,
  FileText,
  AlertCircle,
  Building2,
  Calendar,
  Scale,
  Sparkles,
} from 'lucide-react';
import {
  createPatentInventionDeclaration,
  conductPatentReview,
  recordInventionRewardPayment,
  validateInventorShareSum,
  PATENT_GRADE_DESCRIPTIONS,
  type PatentAsset,
  type PatentInventor,
  type PatentReviewGrade,
  type PatentReviewStatus,
} from '../domain/patentIpAssetEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { usePatentWorkspace } from '../hooks/usePatentWorkspace';

export const PatentAssetManagementView: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { patents, isLoading, persistPatent } = usePatentWorkspace(currentOrganization?.id);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'applied' | 'rewarded'>('all');

  // 모달 상태
  const [isDeclarationModalOpen, setIsDeclarationModalOpen] = useState(false);
  const [reviewingPatent, setReviewingPatent] = useState<PatentAsset | null>(null);
  const [rewardingPatent, setRewardingPatent] = useState<{ patent: PatentAsset; type: 'application' | 'registration' } | null>(null);

  // 신고서 모달 폼 상태
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [techField, setTechField] = useState('신소재/배터리');
  const [inventors, setInventors] = useState<PatentInventor[]>([
    { inventorId: 'inv-new-1', inventorName: '', department: '연구1팀', sharePercentage: 100 },
  ]);
  const [declarationError, setDeclarationError] = useState('');

  // 심의 모달 폼 상태
  const [reviewStatus, setReviewStatus] = useState<PatentReviewStatus>('approved');
  const [reviewGrade, setReviewGrade] = useState<PatentReviewGrade>('A');
  const [reviewComments, setReviewComments] = useState('');

  // 보상금 지급 모달 폼 상태
  const [rewardAmount, setRewardAmount] = useState(500000);

  // 필터링
  const filteredPatents = patents.filter((p) => {
    if (activeTab === 'pending') return p.status === 'review_pending';
    if (activeTab === 'applied') return p.status === 'review_completed' || p.status === 'applied';
    if (activeTab === 'rewarded') return p.applicationReward?.isPaid || p.registrationReward?.isPaid;
    return true;
  });

  // 발명자 추가/제거
  const handleAddInventor = () => {
    setInventors((prev) => [
      ...prev,
      { inventorId: `inv-new-${Date.now()}`, inventorName: '', department: '연구1팀', sharePercentage: 0 },
    ]);
  };

  const handleRemoveInventor = (idx: number) => {
    if (inventors.length <= 1) return;
    setInventors((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleInventorChange = (idx: number, field: keyof PatentInventor, val: any) => {
    setInventors((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  // 신고서 제출
  const handleSubmitDeclaration = (e: React.FormEvent) => {
    e.preventDefault();
    setDeclarationError('');

    const res = createPatentInventionDeclaration({
      inventionTitle: title,
      summary,
      techField,
      inventors,
    });

    if (res.error || !res.patent) {
      setDeclarationError(res.error || '신고서 접수에 실패했습니다.');
      return;
    }

    const created = res.patent!;
    void persistPatent(created, 'create')
      .then(() => {
        setIsDeclarationModalOpen(false);
        setTitle('');
        setSummary('');
        setInventors([{ inventorId: 'inv-new-1', inventorName: '', department: '연구1팀', sharePercentage: 100 }]);
        showToast(`신규 발명 '${created.inventionTitle}'이 사내 접수되었습니다.`, 'success');
      })
      .catch(() => showToast('특허 저장에 실패했습니다.', 'error'));
  };

  // 심의 확정
  const handleConfirmReview = () => {
    if (!reviewingPatent) return;

    const res = conductPatentReview(reviewingPatent, {
      reviewerName: '사내 특허심의위원회',
      status: reviewStatus,
      grade: reviewStatus === 'approved' ? reviewGrade : undefined,
      reviewComments,
    });

    if (res.error) {
      showToast(res.error, 'error');
      return;
    }

    void persistPatent(res.updatedPatent, 'update')
      .then(() => {
        setReviewingPatent(null);
        showToast(`특허 심의가 완료되었습니다 (등급: ${reviewGrade || '-'}).`, 'success');
      })
      .catch(() => showToast('심의 결과 저장에 실패했습니다.', 'error'));
  };

  // 보상금 지급 확정
  const handleConfirmReward = () => {
    if (!rewardingPatent) return;
    const { patent, type } = rewardingPatent;

    const updated = recordInventionRewardPayment(patent, type, {
      totalRewardAmount: Number(rewardAmount),
    });

    void persistPatent(updated, 'update')
      .then(() => {
        setRewardingPatent(null);
        showToast(
          `${type === 'application' ? '출원' : '등록'} 보상금 ${Number(rewardAmount).toLocaleString()}원이 발명자 지분율대로 지급 처리되었습니다.`,
          'success',
        );
      })
      .catch(() => showToast('보상금 지급 저장에 실패했습니다.', 'error'));
  };

  const totalShare = inventors.reduce((sum, inv) => sum + (Number(inv.sharePercentage) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {isLoading ? <p className="text-sm text-slate-500">특허 목록을 불러오는 중…</p> : null}
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-400/10 text-amber-400 rounded-full text-xs font-semibold mb-1">
              <span>특허 및 지식재산권(IP) 자산 관리</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              연구소 특허 & 직무발명 보상금 관리 시스템
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              발명 신고 접수 ➔ 심의위원회 등급(A/B/C) 부여 ➔ 특허청 출원/등록 ➔ 직무발명 보상금 자동 분배
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDeclarationModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          신규 발명 신고서 접수
        </button>
      </div>

      {/* 필터 탭 */}
      <div className="flex items-center gap-2">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            전체 ({patents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'pending' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            심의 대기 ({patents.filter((p) => p.status === 'review_pending').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('applied')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'applied' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            출원/심의완료 ({patents.filter((p) => p.status === 'review_completed' || p.status === 'applied').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rewarded')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'rewarded' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            보상금 지급 완료 ({patents.filter((p) => p.applicationReward?.isPaid || p.registrationReward?.isPaid).length})
          </button>
        </div>
      </div>

      {/* 특허 목록 카드 그리드 */}
      <div className="grid grid-cols-1 gap-4">
        {filteredPatents.map((patent) => {
          const isPending = patent.status === 'review_pending';
          const isApproved = patent.status === 'review_completed';
          const hasAppReward = patent.applicationReward?.isPaid;

          return (
            <div
              key={patent.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition space-y-4"
            >
              {/* 상단 메타 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg font-mono">
                    {patent.techField}
                  </span>
                  {isPending && (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      심의 대기중
                    </span>
                  )}
                  {isApproved && (
                    <span className="px-2.5 py-1 bg-slate-100 text-indigo-800 text-xs font-bold rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      심의 완료 [{patent.review?.grade}등급]
                    </span>
                  )}
                  {patent.status === 'rejected' && (
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-lg flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      반려됨
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400">
                  사내 접수일: <strong>{patent.receiptDate}</strong>
                </div>
              </div>

              {/* 발명 명칭 및 요약 */}
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {patent.inventionTitle}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {patent.summary}
                </p>
                {(patent.documentUrls?.length ?? 0) > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs">
                    {patent.documentUrls!.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-800 underline break-all"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <form
                  className="mt-2 flex flex-wrap gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const url = String(fd.get('docUrl') ?? '').trim();
                    if (!url) return;
                    void persistPatent(
                      {
                        ...patent,
                        documentUrls: [...(patent.documentUrls ?? []), url],
                      },
                      'update'
                    );
                    e.currentTarget.reset();
                  }}
                >
                  <input
                    name="docUrl"
                    type="url"
                    placeholder="공보·문서 URL 추가"
                    className="min-h-10 flex-1 rounded-lg border border-slate-200 px-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold"
                  >
                    URL 저장
                  </button>
                </form>
              </div>

              {/* 발명자 지분율 배지 목록 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>공동 발명자 및 지분율 (합계 100%)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {patent.inventors.map((inv) => (
                    <div
                      key={inv.inventorId}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 flex items-center gap-2"
                    >
                      <span>{inv.inventorName} ({inv.department})</span>
                      <strong className="text-slate-800 font-bold">{inv.sharePercentage}%</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* 심의 결과 박스 */}
              {patent.review && (
                <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-800" />
                      사내 특허심의위원회 평가: {patent.review.grade}등급 ({PATENT_GRADE_DESCRIPTIONS[patent.review.grade || 'B']})
                    </span>
                    <span className="text-[11px] text-slate-400">{patent.review.reviewDate}</span>
                  </div>
                  <p className="text-xs text-slate-900/80 leading-relaxed">
                    "{patent.review.reviewComments}"
                  </p>
                </div>
              )}

              {/* 보상금 지급 현황 */}
              {patent.applicationReward && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-emerald-600" />
                      직무발명 출원 보상금 지급 완료 ({patent.applicationReward.totalRewardAmount.toLocaleString()}원)
                    </span>
                    <span className="text-[11px] text-emerald-700">{patent.applicationReward.paidDate}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {patent.applicationReward.distributions.map((d) => (
                      <div key={d.inventorId} className="flex justify-between bg-white/80 p-1.5 rounded-md border border-emerald-100">
                        <span>{d.inventorName} ({d.sharePercentage}%)</span>
                        <strong className="text-emerald-800 font-bold">{d.allocatedAmount.toLocaleString()}원</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 하단 액션 버튼 */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {isPending && (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewingPatent(patent);
                      setReviewStatus('approved');
                      setReviewGrade('A');
                      setReviewComments('해외 시장 진출을 위한 PCT 출원 추천');
                    }}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    사내 특허 심의 진행
                  </button>
                )}

                {isApproved && !hasAppReward && (
                  <button
                    type="button"
                    onClick={() => {
                      setRewardingPatent({ patent, type: 'application' });
                      setRewardAmount(1000000);
                    }}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    출원 보상금 지급 처리
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 발명 신고 모달 */}
      {isDeclarationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">신규 발명 신고서 접수</h2>
              <button
                type="button"
                onClick={() => setIsDeclarationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                닫기
              </button>
            </div>

            {declarationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{declarationError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDeclaration} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  발명 명칭 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 고효율 이차전지 전극 코팅 장치 및 공정"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    기술 분야 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={techField}
                    onChange={(e) => setTechField(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    발명자 지분율 합계
                  </label>
                  <div
                    className={`px-3 py-2 text-xs font-bold rounded-xl border ${
                      totalShare === 100
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    현재 합계: {totalShare}% {totalShare === 100 ? '(적합)' : '(100% 필수)'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  발명 요약 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="발명의 핵심 구성요소 및 종래 기술 대비 기대효과를 서술하세요."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              {/* 발명자 지분율 등록 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">공동 발명자 등록</span>
                  <button
                    type="button"
                    onClick={handleAddInventor}
                    className="text-xs text-slate-800 font-bold hover:underline"
                  >
                    + 발명자 추가
                  </button>
                </div>

                <div className="space-y-2">
                  {inventors.map((inv, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="발명자 성명"
                        value={inv.inventorName}
                        onChange={(e) => handleInventorChange(idx, 'inventorName', e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="소속 부서"
                        value={inv.department}
                        onChange={(e) => handleInventorChange(idx, 'department', e.target.value)}
                        className="w-32 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={inv.sharePercentage}
                          onChange={(e) => handleInventorChange(idx, 'sharePercentage', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-right font-bold"
                        />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                      {inventors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInventor(idx)}
                          className="text-slate-400 hover:text-rose-500 p-1 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeclarationModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={totalShare !== 100}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black disabled:bg-slate-300 rounded-xl shadow-xs"
                >
                  신고서 접수
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 심의 모달 */}
      {reviewingPatent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              특허 심의위원회 심의 ({reviewingPatent.inventionTitle})
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">심의 결과</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as PatentReviewStatus)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                >
                  <option value="approved">승인 (출원 추진)</option>
                  <option value="rejected">반려 (노하우보관/진보성 미달)</option>
                </select>
              </div>

              {reviewStatus === 'approved' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    부여 등급 (A/B/C) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={reviewGrade}
                    onChange={(e) => setReviewGrade(e.target.value as PatentReviewGrade)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="A">A등급: 해외출원 추진 (PCT/해외 개별국)</option>
                    <option value="B">B등급: 국내출원 추진 (국내 단독 권리화)</option>
                    <option value="C">C등급: 노하우 보관 (영업비밀 사내화)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">심의 의견</label>
                <textarea
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="심의위원회 종합 의견을 입력하세요."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewingPatent(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                심의 확정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 보상금 지급 모달 */}
      {rewardingPatent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              직무발명 보상금 지급 ({rewardingPatent.type === 'application' ? '출원' : '등록'} 보상)
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">총 지급 보상금 (원)</label>
              <input
                type="number"
                step="100000"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold text-right"
              />
            </div>

            {/* 발명자별 배분 미리보기 */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-slate-700">지분율 자동 배분:</span>
              {rewardingPatent.patent.inventors.map((inv) => (
                <div key={inv.inventorId} className="flex justify-between text-slate-600">
                  <span>{inv.inventorName} ({inv.sharePercentage}%)</span>
                  <strong>{Math.floor((rewardAmount * inv.sharePercentage) / 100).toLocaleString()}원</strong>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRewardingPatent(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmReward}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              >
                지급 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
