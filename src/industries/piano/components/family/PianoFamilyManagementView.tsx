import React, { useState, useMemo, useCallback } from 'react';
import {
  type FamilyGroup,
  type FamilyGroupDetail,
  type PianoStudentSummary,
  type PianoInvoiceSummary,
  detectAndMergeFamilyGroups,
  buildFamilyGroupDetail,
  loadCustomFamilyGroups,
  saveCustomFamilyGroups,
  loadFamilyCredits,
  updateFamilyCreditBalance,
} from './pianoFamilyDomain';
import { FamilyBundlePaymentModal } from './FamilyBundlePaymentModal';
import { rosterStorage } from '@/capabilities/roster/infrastructure/rosterStorage';
import { billingStorage } from '@/capabilities/billing/infrastructure/billingStorage';
import { showToast } from '@/shared/feedback/uiFeedback';
import { PageHeader, Modal } from '@/shared/components';
import {
  Users,
  Plus,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Wallet,
  Phone,
  User,
} from 'lucide-react';

export const PianoFamilyManagementView: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  // 1. 실제 학생 데이터 로드 및 PianoStudentSummary로 정규화
  const students = useMemo<PianoStudentSummary[]>(() => {
    try {
      const raw = rosterStorage.getStudents();
      return raw.map((s) => ({
        id: s.id,
        name: s.name,
        studentNumber: s.studentNumber,
        grade: s.grade,
        phone: s.phone,
        parentPhone: s.parentPhone,
        parentName: s.parentName,
        tuitionFee: s.tuitionFee || 0,
        status: s.status,
      }));
    } catch {
      return [];
    }
  }, [refreshKey]);

  // 2. 실제 청구서 데이터 로드 및 PianoInvoiceSummary로 정규화
  const invoices = useMemo<PianoInvoiceSummary[]>(() => {
    try {
      const raw = billingStorage.getInvoices();
      return raw.map((inv) => ({
        id: inv.id,
        studentId: inv.studentId,
        studentName: inv.studentName,
        yearMonth: inv.yearMonth,
        title: inv.title,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        unpaidAmount: inv.unpaidAmount,
        status: inv.status,
        dueDate: inv.dueDate,
      }));
    } catch {
      return [];
    }
  }, [refreshKey]);

  // 3. 커스텀 패밀리 그룹 및 크레딧 로드
  const customGroups = useMemo(() => loadCustomFamilyGroups(), [refreshKey]);
  const familyCredits = useMemo(() => loadFamilyCredits(), [refreshKey]);

  // 4. 자동 감지 및 커스텀 그룹 병합
  const familyGroups = useMemo(
    () => detectAndMergeFamilyGroups(students, customGroups),
    [students, customGroups]
  );

  // 5. 각 그룹별 상세 정보 집계
  const groupDetails = useMemo<FamilyGroupDetail[]>(() => {
    return familyGroups.map((g) =>
      buildFamilyGroupDetail(g, students, invoices, familyCredits)
    );
  }, [familyGroups, students, invoices, familyCredits]);

  // 모달 제어 상태
  const [paymentTargetGroup, setPaymentTargetGroup] = useState<FamilyGroupDetail | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creditChangeGroup, setCreditChangeGroup] = useState<FamilyGroup | null>(null);
  const [creditChangeAmount, setCreditChangeAmount] = useState<number>(50000);

  // 신규 수동 등록 폼 상태
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newRepName, setNewRepName] = useState('');
  const [newRepPhone, setNewRepPhone] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // 신규 패밀리 수동 등록 핸들러
  const handleCreateCustomFamily = () => {
    if (!newFamilyName.trim()) {
      showToast('가족 그룹명을 입력해주세요.', 'warning');
      return;
    }
    if (selectedStudentIds.length < 2) {
      showToast('형제자매로 묶을 원생을 2명 이상 선택해주세요.', 'warning');
      return;
    }

    const newGroup: FamilyGroup = {
      groupId: `custom_fam_${Date.now()}`,
      familyName: newFamilyName.trim(),
      representativeName: newRepName.trim() || '학부모 대표',
      representativePhone: newRepPhone.trim(),
      studentIds: selectedStudentIds,
      isAutoDetected: false,
      sharedCreditBalance: 0,
      createdAt: new Date().toISOString(),
    };

    saveCustomFamilyGroups([...customGroups, newGroup]);
    showToast(`'${newFamilyName}' 패밀리 그룹이 성공적으로 등록되었습니다.`, 'success');
    setIsCreateModalOpen(false);
    setNewFamilyName('');
    setNewRepName('');
    setNewRepPhone('');
    setSelectedStudentIds([]);
    reload();
  };

  // 선불 크레딧 충전 / 차감 핸들러
  const handleUpdateCredit = (isCharge: boolean) => {
    if (!creditChangeGroup) return;
    if (creditChangeAmount <= 0) {
      showToast('올바른 금액을 입력해주세요.', 'warning');
      return;
    }

    const delta = isCharge ? creditChangeAmount : -creditChangeAmount;
    updateFamilyCreditBalance(creditChangeGroup.groupId, delta);
    showToast(
      `${creditChangeGroup.familyName} 크레딧이 ${delta > 0 ? '+' : ''}${delta.toLocaleString()}원 변동되었습니다.`,
      'success'
    );
    setCreditChangeGroup(null);
    reload();
  };

  // 묶음 수납 처리 브릿지 핸들러
  const handleRecordPayment = async (
    invoiceId: string,
    amount: number,
    method: string,
    memo?: string
  ): Promise<boolean> => {
    try {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (!inv) return false;

      billingStorage.recordPayment(
        invoiceId,
        amount,
        method as any,
        memo || '패밀리 묶음 수납 자동 분할',
        new Date().toISOString().slice(0, 10)
      );
      return true;
    } catch {
      return false;
    }
  };

  // 집계 통계
  const totalFamilies = groupDetails.length;
  const totalChildren = groupDetails.reduce((acc, g) => acc + g.students.length, 0);
  const familiesWithUnpaid = groupDetails.filter((g) => g.totalUnpaidAmount > 0);
  const totalUnpaidSum = groupDetails.reduce((acc, g) => acc + g.totalUnpaidAmount, 0);
  const totalCredits = groupDetails.reduce((acc, g) => acc + g.group.sharedCreditBalance, 0);

  return (
    <div className="space-y-6 pb-8">
      {/* 1. 상단 타이틀 & 액션 헤더 */}
      <PageHeader
        icon={<Users className="w-6 h-6 text-indigo-600" />}
        title="피아노 패밀리 및 형제자매 관리"
        description="학부모 연락처 기반 형제자매 자동 감지, 2인 이상 결합 할인(10%~15%), 선불 크레딧 및 원클릭 통합 수납"
        actions={
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>새 패밀리 그룹 묶기</span>
          </button>
        }
      />

      {/* 2. 상단 KPI 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>등록 패밀리 가구</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {totalFamilies} <span className="text-sm font-bold text-slate-500">가구</span>
          </div>
          <div className="text-xs text-emerald-600 mt-1 font-semibold">
            총 {totalChildren}명 원생 동시 재원 중
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>형제 자동 결합 할인</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600">
            2인 10% / 3인 15%
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            묶음 수납 시 자동 안분 감면
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>패밀리 미납 수강료</span>
            <AlertCircle className={`w-4 h-4 ${totalUnpaidSum > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
          </div>
          <div className={`text-2xl font-extrabold ${totalUnpaidSum > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalUnpaidSum.toLocaleString()} <span className="text-sm font-bold text-slate-500">원</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {familiesWithUnpaid.length}개 가구 미납 내역 존재
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
            <span>가족 공용 선불 크레딧</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {totalCredits.toLocaleString()} <span className="text-sm font-bold text-slate-500">원</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            자녀 누구나 수강료 상계 가능
          </div>
        </div>
      </div>

      {/* 3. 패밀리 그룹 카드 그리드 */}
      {groupDetails.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1.5">
            현재 감지된 형제자매 패밀리 그룹이 없습니다.
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
            원생 정보의 학부모 연락처가 동일하면 자동으로 형제자매로 묶이며, 상단 [새 패밀리 그룹 묶기] 버튼을 통해 원하는 원생들을 수동으로 가족 그룹에 등록할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>수동으로 형제자매 묶기</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groupDetails.map((detail) => {
            const hasUnpaid = detail.totalUnpaidAmount > 0;
            return (
              <div
                key={detail.group.groupId}
                className={`bg-white rounded-2xl border ${
                  hasUnpaid ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-200/80'
                } shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between`}
              >
                <div>
                  {/* 카드 상단 헤더 */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-base font-bold text-slate-900 truncate">
                          {detail.group.familyName}
                        </span>
                        {detail.group.isAutoDetected ? (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-bold shrink-0">
                            연락처 자동감지
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold shrink-0">
                            수동등록
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>대표: <strong>{detail.group.representativeName}</strong></span>
                        {detail.group.representativePhone && (
                          <span className="text-slate-400">({detail.group.representativePhone})</span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-bold shrink-0 ${
                        detail.discountRatePercent > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {detail.discountRatePercent > 0 ? `형제 ${detail.discountRatePercent}% 할인` : '단일'}
                    </span>
                  </div>

                  {/* 자녀 목록 */}
                  <div className="bg-slate-50 rounded-xl p-3 mb-3.5 space-y-2 border border-slate-100">
                    <div className="text-xs font-bold text-slate-600">
                      자녀 원생 ({detail.students.length}명)
                    </div>
                    {detail.students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">{student.name}</span>
                          {student.grade && (
                            <span className="text-[11px] text-slate-500">({student.grade})</span>
                          )}
                        </div>
                        <span className="font-semibold text-slate-600">
                          {student.tuitionFee ? `${student.tuitionFee.toLocaleString()}원/월` : '수강료 미등록'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 공용 크레딧 & 미납 현황 요약 */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>정상 합계 / 형제 할인:</span>
                    <span className="font-semibold text-slate-800">
                      {detail.totalTuition.toLocaleString()}원 (-{detail.discountAmount.toLocaleString()}원)
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-100 px-3 py-2 rounded-xl mb-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold">선불 크레딧:</span>
                      <strong className="font-bold text-emerald-700">
                        {detail.group.sharedCreditBalance.toLocaleString()}원
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreditChangeGroup(detail.group)}
                      className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-800 text-[11px] font-bold hover:bg-emerald-50 transition-colors cursor-pointer shadow-2xs"
                    >
                      충전/차감
                    </button>
                  </div>
                </div>

                {/* 카드 하단 액션: 묶음 결제 */}
                <div className="pt-3 border-t border-slate-100">
                  {hasUnpaid ? (
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        당월 미납 {detail.unpaidInvoiceCount}건
                      </span>
                      <strong className="text-sm font-extrabold text-rose-600">
                        {detail.totalUnpaidAmount.toLocaleString()}원
                      </strong>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mb-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      당월 수강료 완납 완료
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setPaymentTargetGroup(detail)}
                    className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
                      hasUnpaid
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{hasUnpaid ? '원클릭 패밀리 묶음 수납' : '수강료 정산 명세 보기'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. 원클릭 패밀리 묶음 수납 모달 */}
      {paymentTargetGroup && (
        <FamilyBundlePaymentModal
          isOpen={true}
          onClose={() => setPaymentTargetGroup(null)}
          detail={paymentTargetGroup}
          recordPaymentFn={handleRecordPayment}
          onPaymentSuccess={reload}
        />
      )}

      {/* 5. 신규 패밀리 수동 등록 모달 */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="새 패밀리 그룹 수동 묶기"
          description="같은 보호자 아래 2명 이상의 원생을 하나의 패밀리 그룹으로 묶습니다."
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateCustomFamily}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                가족 묶기 등록
              </button>
            </div>
          }
        >
          <div className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                가족 그룹명 *
              </label>
              <input
                type="text"
                placeholder="예: 김민준 & 김서아 가족"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  학부모 대표자명
                </label>
                <input
                  type="text"
                  placeholder="예: 김철수"
                  value={newRepName}
                  onChange={(e) => setNewRepName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  대표 연락처
                </label>
                <input
                  type="text"
                  placeholder="010-0000-0000"
                  value={newRepPhone}
                  onChange={(e) => setNewRepPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                소속 원생 선택 (2명 이상 선택) *
              </label>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50/50">
                {students.map((student) => {
                  const isChecked = selectedStudentIds.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isChecked ? 'bg-indigo-50 text-indigo-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedStudentIds((prev) =>
                            prev.includes(student.id)
                              ? prev.filter((id) => id !== student.id)
                              : [...prev, student.id]
                          );
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold">{student.name}</span>
                      {student.grade && <span className="text-[11px] text-slate-500">({student.grade})</span>}
                      {student.parentPhone && (
                        <span className="text-[11px] text-slate-400 ml-auto">
                          {student.parentPhone}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. 크레딧 충전 / 차감 모달 */}
      {creditChangeGroup && (
        <Modal
          isOpen={!!creditChangeGroup}
          onClose={() => setCreditChangeGroup(null)}
          title={`${creditChangeGroup.familyName} 크레딧 관리`}
          maxWidth="sm"
          footer={
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setCreditChangeGroup(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleUpdateCredit(false)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer"
              >
                차감(-)
              </button>
              <button
                type="button"
                onClick={() => handleUpdateCredit(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer"
              >
                충전(+)
              </button>
            </div>
          }
        >
          <div className="p-4 sm:p-5 space-y-3">
            <div className="text-xs text-slate-500">
              현재 잔액: <strong className="text-emerald-700 font-bold text-sm">{creditChangeGroup.sharedCreditBalance.toLocaleString()}원</strong>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                금액 입력
              </label>
              <input
                type="number"
                step={10000}
                value={creditChangeAmount}
                onChange={(e) => setCreditChangeAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
