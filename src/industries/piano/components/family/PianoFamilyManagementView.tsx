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

  // 신규 수동 패밀리 생성 폼 상태
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newRepName, setNewRepName] = useState('');
  const [newRepPhone, setNewRepPhone] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // 크레딧 입출금 입력 상태
  const [creditChangeGroup, setCreditChangeGroup] = useState<FamilyGroup | null>(null);
  const [creditChangeAmount, setCreditChangeAmount] = useState<number>(50000);

  // 통계 계산
  const totalFamilies = groupDetails.length;
  const totalChildren = groupDetails.reduce((sum, d) => sum + d.students.length, 0);
  const familiesWithUnpaid = groupDetails.filter((d) => d.totalUnpaidAmount > 0);
  const totalUnpaidSum = groupDetails.reduce((sum, d) => sum + d.totalUnpaidAmount, 0);
  const totalCredits = groupDetails.reduce(
    (sum, d) => sum + d.group.sharedCreditBalance,
    0
  );

  // 묶음 수납 처리 함수
  const handleRecordPayment = (
    invoiceId: string,
    amount: number,
    method: 'card' | 'transfer' | 'cash',
    notes?: string
  ) => {
    billingStorage.recordPayment(invoiceId, amount, method, notes);
  };

  // 신규 패밀리 생성 핸들러
  const handleCreateCustomFamily = () => {
    if (!newFamilyName.trim() || selectedStudentIds.length < 2) {
      showToast('가족 이름과 최소 2명 이상의 원생을 선택해 주세요.', 'warning');
      return;
    }

    const newGroup: FamilyGroup = {
      groupId: `custom-fam-${Date.now()}`,
      familyName: newFamilyName.trim(),
      representativeName: newRepName.trim() || '학부모 대표',
      representativePhone: newRepPhone.trim(),
      studentIds: selectedStudentIds,
      sharedCreditBalance: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      isAutoDetected: false,
    };

    const updated = [...customGroups, newGroup];
    saveCustomFamilyGroups(updated);
    showToast(`👨‍👩‍👧 '${newGroup.familyName}' 패밀리 그룹이 생성되었습니다.`, 'success');
    setIsCreateModalOpen(false);
    setNewFamilyName('');
    setNewRepName('');
    setNewRepPhone('');
    setSelectedStudentIds([]);
    reload();
  };

  // 크레딧 충전 / 차감
  const handleUpdateCredit = (isDeposit: boolean) => {
    if (!creditChangeGroup || creditChangeAmount <= 0) return;
    const current = creditChangeGroup.sharedCreditBalance || 0;
    const next = isDeposit ? current + creditChangeAmount : Math.max(0, current - creditChangeAmount);

    updateFamilyCreditBalance(creditChangeGroup.groupId, next);
    showToast(
      `${creditChangeGroup.familyName} 크레딧이 ${isDeposit ? '충전' : '차감'}되었습니다. (잔액: ${next.toLocaleString()}원)`,
      'info'
    );
    setCreditChangeGroup(null);
    reload();
  };

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '1240px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 1. 상단 타이틀 & 액션 헤더 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '24px' }}>👨‍👩‍👧‍👦</span>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              피아노 패밀리 / 형제자매 통합 관리 & 묶음 수납
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            학부모 연락처 기반 형제자매 자동 감지, 2인 이상 결합 할인(10%~15%), 선불 크레딧 및 원클릭 통합 결제를 지원합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: '#4f46e5',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
          }}
        >
          <span>+</span>
          <span>새 패밀리 그룹 묶기</span>
        </button>
      </div>

      {/* 2. 상단 KPI 통계 카드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>등록 패밀리 가구</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
            {totalFamilies} <span style={{ fontSize: '16px', fontWeight: 600 }}>가구</span>
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: 500 }}>
            총 {totalChildren}명 원생 동시 재원 중
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>형제 자동 결합 할인</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#4f46e5' }}>
            2인 10% / 3인 15%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            묶음 수납 시 자동 안분 감면
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>패밀리 미납 수강료</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: totalUnpaidSum > 0 ? '#ef4444' : '#10b981' }}>
            {totalUnpaidSum.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 600 }}>원</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {familiesWithUnpaid.length}개 가구 미납 내역 존재
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>가족 공용 선불 크레딧 총액</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669' }}>
            {totalCredits.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 600 }}>원</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            자녀 누구나 수강료 상계 가능
          </div>
        </div>
      </div>

      {/* 3. 패밀리 그룹 카드 그리드 */}
      {groupDetails.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px dashed #cbd5e1',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>👨‍👩‍👧‍👦</div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            현재 감지된 형제자매 패밀리 그룹이 없습니다.
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '460px', margin: '0 auto 20px auto' }}>
            원생 정보의 학부모 연락처가 동일하면 자동으로 형제자매로 묶이며, 상단 [+ 새 패밀리 그룹 묶기] 버튼을 통해 원하는 원생들을 수동으로 가족 그룹에 등록할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            수동으로 형제자매 묶기
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))',
            gap: '20px',
          }}
        >
          {groupDetails.map((detail) => {
            const hasUnpaid = detail.totalUnpaidAmount > 0;
            return (
              <div
                key={detail.group.groupId}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: hasUnpaid ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  {/* 카드 상단 헤더 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                          {detail.group.familyName}
                        </span>
                        {detail.group.isAutoDetected ? (
                          <span
                            style={{
                              fontSize: '10px',
                              background: '#e0e7ff',
                              color: '#3730a3',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            연락처 자동감지
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '10px',
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            수동등록
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        대표: <strong>{detail.group.representativeName}</strong> ({detail.group.representativePhone || '연락처 없음'})
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        background: detail.discountRatePercent > 0 ? '#dcfce7' : '#f1f5f9',
                        color: detail.discountRatePercent > 0 ? '#15803d' : '#64748b',
                      }}
                    >
                      {detail.discountRatePercent > 0 ? `형제 ${detail.discountRatePercent}% 할인` : '단일'}
                    </span>
                  </div>

                  {/* 자녀 목록 */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '10px',
                      padding: '12px',
                      marginBottom: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                      자녀 원생 ({detail.students.length}명)
                    </div>
                    {detail.students.map((student) => (
                      <div
                        key={student.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '13px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{student.name}</span>
                          {student.grade && (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>({student.grade})</span>
                          )}
                        </div>
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          {student.tuitionFee ? `${student.tuitionFee.toLocaleString()}원/월` : '수강료 미등록'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 공용 크레딧 & 미납 현황 요약 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>정상 합계 / 형제 할인:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      {detail.totalTuition.toLocaleString()}원 (-{detail.discountAmount.toLocaleString()}원)
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f0fdf4',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>선불 크레딧:</span>
                      <strong style={{ fontSize: '13px', color: '#15803d' }}>
                        {detail.group.sharedCreditBalance.toLocaleString()}원
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreditChangeGroup(detail.group)}
                      style={{
                        border: 'none',
                        background: '#ffffff',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: '#86efac',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#166534',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      충전/차감
                    </button>
                  </div>
                </div>

                {/* 카드 하단 액션: 묶음 결제 */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  {hasUnpaid ? (
                    <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>
                        ⚠️ 당월 미납 {detail.unpaidInvoiceCount}건
                      </span>
                      <strong style={{ fontSize: '15px', color: '#dc2626' }}>
                        {detail.totalUnpaidAmount.toLocaleString()}원
                      </strong>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '10px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                      ✅ 당월 수강료 완납 완료
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setPaymentTargetGroup(detail)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: hasUnpaid ? '#4f46e5' : '#f8fafc',
                      color: hasUnpaid ? '#ffffff' : '#475569',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      borderWidth: hasUnpaid ? '0' : '1px',
                      borderStyle: 'solid',
                      borderColor: '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>💳</span>
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
          }}
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
              👨‍👩‍👧 새 패밀리 그룹 수동 묶기
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  가족 그룹명 *
                </label>
                <input
                  type="text"
                  placeholder="예: 김민준 & 김서아 가족"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    학부모 대표자명
                  </label>
                  <input
                    type="text"
                    placeholder="예: 김철수"
                    value={newRepName}
                    onChange={(e) => setNewRepName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    대표 연락처
                  </label>
                  <input
                    type="text"
                    placeholder="010-0000-0000"
                    value={newRepPhone}
                    onChange={(e) => setNewRepPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  소속 원생 선택 (2명 이상 선택) *
                </label>
                <div
                  style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {students.map((student) => {
                    const isChecked = selectedStudentIds.includes(student.id);
                    return (
                      <label
                        key={student.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: isChecked ? '#eef2ff' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
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
                        />
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{student.name}</span>
                        {student.grade && <span style={{ color: '#64748b', fontSize: '12px' }}>({student.grade})</span>}
                        {student.parentPhone && (
                          <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: 'auto' }}>
                            {student.parentPhone}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '13px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateCustomFamily}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                가족 묶기 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 크레딧 충전 / 차감 모달 */}
      {creditChangeGroup && (
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
          }}
          onClick={() => setCreditChangeGroup(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>
              💳 {creditChangeGroup.familyName} 크레딧 관리
            </h3>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              현재 잔액: <strong style={{ color: '#15803d' }}>{creditChangeGroup.sharedCreditBalance.toLocaleString()}원</strong>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                금액 입력
              </label>
              <input
                type="number"
                step={10000}
                value={creditChangeAmount}
                onChange={(e) => setCreditChangeAmount(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCreditChangeGroup(null)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '13px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleUpdateCredit(false)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                차감(-)
              </button>
              <button
                type="button"
                onClick={() => handleUpdateCredit(true)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                충전(+)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
