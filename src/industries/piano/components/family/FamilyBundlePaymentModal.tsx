import React, { useState, useMemo } from 'react';
import {
  type FamilyGroupDetail,
  calculateFamilyBundlePayment,
  updateFamilyCreditBalance,
} from './pianoFamilyDomain';
import { showToast } from '@/shared/feedback/uiFeedback';

export interface FamilyBundlePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: FamilyGroupDetail;
  onPaymentSuccess?: () => void;
  /**
   * 청구서 결제 처리 함수 (billingStorage.recordPayment 연동)
   */
  recordPaymentFn?: (
    invoiceId: string,
    amount: number,
    method: 'card' | 'transfer' | 'cash',
    notes?: string
  ) => void;
}

export const FamilyBundlePaymentModal: React.FC<FamilyBundlePaymentModalProps> = ({
  isOpen,
  onClose,
  detail,
  onPaymentSuccess,
  recordPaymentFn,
}) => {
  const unpaidInvoices = useMemo(
    () => detail.invoices.filter((inv) => inv.status === 'unpaid' || inv.status === 'partial'),
    [detail.invoices]
  );

  // 선택된 청구서 ID 목록 (기본 전체 선택)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>(() =>
    unpaidInvoices.map((inv) => inv.id)
  );

  // 형제 결합 할인율 (%)
  const [discountRate, setDiscountRate] = useState<number>(detail.discountRatePercent);
  // 공용 크레딧 사용 여부
  const [useCredit, setUseCredit] = useState<boolean>(false);
  // 결제 수단
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer' | 'cash'>('card');
  // 처리 중 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedInvoices = unpaidInvoices.filter((inv) => selectedInvoiceIds.includes(inv.id));
  const rawTotalAmount = selectedInvoices.reduce((sum, inv) => sum + inv.unpaidAmount, 0);

  const calc = calculateFamilyBundlePayment(
    rawTotalAmount,
    discountRate,
    detail.group.sharedCreditBalance,
    useCredit
  );

  const toggleInvoice = (id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedInvoiceIds.length === unpaidInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(unpaidInvoices.map((inv) => inv.id));
    }
  };

  const handleExecutePayment = async () => {
    if (selectedInvoices.length === 0) {
      showToast('결제할 수강료 청구서를 1건 이상 선택해 주세요.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const studentNames = detail.students.map((s) => s.name).join(', ');
      const paymentNotes = `[패밀리 묶음 수납] ${detail.group.familyName} (${studentNames}) - 형제할인 ${discountRate}% 적용`;

      // 각 청구서별 안분 결제 처리
      if (recordPaymentFn) {
        let remainingNetPayable = calc.finalOutOfPocketAmount + calc.appliedSharedCredit;

        for (let i = 0; i < selectedInvoices.length; i++) {
          const inv = selectedInvoices[i];
          const isLast = i === selectedInvoices.length - 1;

          // 비율 안분 계산
          let invoicePayAmount = 0;
          if (isLast) {
            invoicePayAmount = remainingNetPayable;
          } else {
            const ratio = rawTotalAmount > 0 ? inv.unpaidAmount / rawTotalAmount : 0;
            invoicePayAmount = Math.round(
              (calc.finalOutOfPocketAmount + calc.appliedSharedCredit) * ratio
            );
            remainingNetPayable = Math.max(0, remainingNetPayable - invoicePayAmount);
          }

          recordPaymentFn(inv.id, invoicePayAmount, paymentMethod, paymentNotes);
        }
      }

      // 공용 크레딧 사용 시 잔액 업데이트
      if (calc.appliedSharedCredit > 0) {
        updateFamilyCreditBalance(detail.group.groupId, calc.remainingSharedCredit);
      }

      showToast(
        `🎉 ${detail.group.familyName} 수강료 ${calc.finalOutOfPocketAmount.toLocaleString()}원 묶음 수납이 완료되었습니다.`,
        'success'
      );
      onPaymentSuccess?.();
      onClose();
    } catch {
      showToast('결제 처리 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 상단 헤더 */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(to right, #f8fafc, #eff6ff)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px' }}>👨‍👩‍👧‍👦</span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                가족 수강료 원클릭 묶음 수납
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {detail.group.familyName} ({detail.group.representativeName} ·{' '}
              {detail.group.representativePhone})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* 모달 본문 스크롤 영역 */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 1. 자녀별 미납 청구서 목록 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                📋 수납 대상 청구서 ({selectedInvoices.length}/{unpaidInvoices.length}건 선택)
              </span>
              {unpaidInvoices.length > 1 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#4f46e5',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {selectedInvoiceIds.length === unpaidInvoices.length ? '전체 해제' : '전체 선택'}
                </button>
              )}
            </div>

            {unpaidInvoices.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '13px',
                }}
              >
                🎉 현재 미납된 수강료 청구서가 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {unpaidInvoices.map((inv) => {
                  const isChecked = selectedInvoiceIds.includes(inv.id);
                  const student = detail.students.find((s) => s.id === inv.studentId);
                  return (
                    <label
                      key={inv.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: isChecked ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                        backgroundColor: isChecked ? '#f5f3ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleInvoice(inv.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '14px', color: '#1e293b' }}>
                              {student?.name || inv.studentName || '원생'}
                            </strong>
                            {student?.grade && (
                              <span style={{ fontSize: '11px', color: '#64748b', background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>
                                {student.grade}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {inv.yearMonth} {inv.title}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                          {inv.unpaidAmount.toLocaleString()}원
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. 형제 결합 할인 선택 */}
          <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                🏷️ 형제/자매 결합 할인율
              </span>
              <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600 }}>
                {detail.students.length >= 2 ? `2인 이상 동시 재원 (${detail.students.length}명)` : '단일 원생'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: '10% (기본 추천)', value: 10 },
                { label: '15% (3인 우대)', value: 15 },
                { label: '5%', value: 5 },
                { label: '할인 없음 (0%)', value: 0 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDiscountRate(opt.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: discountRate === opt.value ? '1.5px solid #4f46e5' : '1px solid #cbd5e1',
                    background: discountRate === opt.value ? '#e0e7ff' : '#ffffff',
                    color: discountRate === opt.value ? '#3730a3' : '#475569',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 가족 공용 선불 크레딧 지갑 */}
          {detail.group.sharedCreditBalance > 0 && (
            <div style={{ background: '#f0fdf4', padding: '14px 16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                  💳 가족 공용 선불 크레딧 잔액
                </span>
                <strong style={{ fontSize: '14px', color: '#15803d' }}>
                  {detail.group.sharedCreditBalance.toLocaleString()}원
                </strong>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#166534', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useCredit}
                  onChange={(e) => setUseCredit(e.target.checked)}
                  style={{ width: '15px', height: '15px' }}
                />
                <span>크레딧 전액 자동 상계 (최대 {calc.appliedSharedCredit.toLocaleString()}원 차감)</span>
              </label>
            </div>
          )}

          {/* 4. 결제 수단 선택 */}
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
              💳 수납 결제 수단
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'card', label: '신용/체크카드', icon: '💳' },
                { id: 'transfer', label: '계좌이체', icon: '🏦' },
                { id: 'cash', label: '현금 수납', icon: '💵' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as 'card' | 'transfer' | 'cash')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    border: paymentMethod === m.id ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                    background: paymentMethod === m.id ? '#eef2ff' : '#ffffff',
                    color: paymentMethod === m.id ? '#4338ca' : '#64748b',
                  }}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. 최종 결제 영수증 정산 명세 */}
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8' }}>
              <span>정상 수강료 합계</span>
              <span>{calc.totalOriginalAmount.toLocaleString()}원</span>
            </div>
            {calc.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#f87171' }}>
                <span>형제 결합 감면 ({calc.discountRatePercent}%)</span>
                <span>-{calc.discountAmount.toLocaleString()}원</span>
              </div>
            )}
            {calc.appliedSharedCredit > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4ade80' }}>
                <span>가족 크레딧 상계</span>
                <span>-{calc.appliedSharedCredit.toLocaleString()}원</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '16px',
                fontWeight: 700,
                borderTop: '1px solid #334155',
                paddingTop: '10px',
                marginTop: '4px',
              }}
            >
              <span style={{ color: '#e2e8f0' }}>최종 실 결제 금액</span>
              <span style={{ fontSize: '20px', color: '#818cf8' }}>
                {calc.finalOutOfPocketAmount.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* 모달 하단 액션 버튼 */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            disabled={isSubmitting || selectedInvoices.length === 0}
            onClick={handleExecutePayment}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: selectedInvoices.length > 0 ? '#4f46e5' : '#94a3b8',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: selectedInvoices.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)',
            }}
          >
            {isSubmitting
              ? '수납 처리 중...'
              : `🎉 ${calc.finalOutOfPocketAmount.toLocaleString()}원 1클릭 묶음 수납 완료`}
          </button>
        </div>
      </div>
    </div>
  );
};
