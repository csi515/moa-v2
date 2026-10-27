import React, { useState } from 'react';
import {
  FamilyGroup,
  FamilyMember,
  ReferralRecord,
  calculateFamilyBilling,
  bindMemberToFamilyGroup,
  depositSharedFamilyCredit,
  deductSharedFamilyCredit,
  grantReferralReward,
} from '../domain/membershipReferralTreeEngine';

const INITIAL_GROUPS: FamilyGroup[] = [
  {
    groupId: 'fam-01',
    familyName: '김민준 & 김서아 가족',
    representativeMemberId: 'm-p01',
    representativeName: '김철수 (부)',
    members: [
      {
        memberId: 'm-c01',
        name: '김민준 (초등 3)',
        relationship: 'child',
        enrolledCoursesCount: 2,
        monthlyTuition: 220000,
      },
      {
        memberId: 'm-c02',
        name: '김서아 (유치부 7세)',
        relationship: 'child',
        enrolledCoursesCount: 1,
        monthlyTuition: 160000,
      },
    ],
    sharedCreditBalance: 120000,
    createdAt: '2026-03-01',
  },
  {
    groupId: 'fam-02',
    familyName: '박도현 & 박지민 & 박수현 가족',
    representativeMemberId: 'm-p02',
    representativeName: '이영희 (모)',
    members: [
      {
        memberId: 'm-c03',
        name: '박도현 (중등 1)',
        relationship: 'child',
        enrolledCoursesCount: 2,
        monthlyTuition: 280000,
      },
      {
        memberId: 'm-c04',
        name: '박지민 (초등 5)',
        relationship: 'child',
        enrolledCoursesCount: 2,
        monthlyTuition: 240000,
      },
      {
        memberId: 'm-c05',
        name: '박수현 (초등 2)',
        relationship: 'child',
        enrolledCoursesCount: 1,
        monthlyTuition: 180000,
      },
    ],
    sharedCreditBalance: 250000,
    createdAt: '2026-02-15',
  },
];

const INITIAL_REFERRALS: ReferralRecord[] = [
  {
    referralId: 'ref-1',
    referrerMemberId: 'm-01',
    referrerName: '김철수',
    refereeMemberId: 'm-99',
    refereeName: '최태양 (신규 등록)',
    registeredDate: '2026-03-12',
    rewardType: 'credit_cash',
    rewardValue: 30000,
    status: 'pending',
  },
  {
    referralId: 'ref-2',
    referrerMemberId: 'm-02',
    referrerName: '이영희',
    refereeMemberId: 'm-98',
    refereeName: '정하늘 (신규 등록)',
    registeredDate: '2026-03-08',
    rewardType: 'credit_cash',
    rewardValue: 30000,
    status: 'rewarded',
  },
];

export const MembershipReferralTreeView: React.FC = () => {
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>(INITIAL_GROUPS);
  const [referrals, setReferrals] = useState<ReferralRecord[]>(INITIAL_REFERRALS);
  const [activeTab, setActiveTab] = useState<'families' | 'referrals'>('families');
  const [selectedGroup, setSelectedGroup] = useState<FamilyGroup | null>(INITIAL_GROUPS[0]);
  const [creditInput, setCreditInput] = useState<number>(50000);

  // 신규 원생 추가 폼
  const [newChildName, setNewChildName] = useState('');
  const [newChildTuition, setNewChildTuition] = useState(150000);

  const handleDepositCredit = (group: FamilyGroup) => {
    if (creditInput <= 0) return;
    const updated = depositSharedFamilyCredit(group, creditInput);
    updateGroupInState(updated);
  };

  const handleDeductCredit = (group: FamilyGroup) => {
    if (creditInput <= 0) return;
    const res = deductSharedFamilyCredit(group, creditInput);
    if (!res.success) {
      alert('가족 공용 크레딧 잔액이 부족합니다.');
      return;
    }
    updateGroupInState(res.updatedGroup);
  };

  const handleAddMember = (group: FamilyGroup) => {
    if (!newChildName.trim()) return;
    const newMember: FamilyMember = {
      memberId: `m-child-${Date.now()}`,
      name: newChildName.trim(),
      relationship: 'child',
      enrolledCoursesCount: 1,
      monthlyTuition: Number(newChildTuition) || 0,
    };
    const updated = bindMemberToFamilyGroup(group, newMember);
    updateGroupInState(updated);
    setNewChildName('');
  };

  const handleReward = (ref: ReferralRecord) => {
    const updatedRef = grantReferralReward(ref);
    setReferrals(prev => prev.map(r => r.referralId === ref.referralId ? updatedRef : r));
  };

  const updateGroupInState = (updated: FamilyGroup) => {
    setFamilyGroups(prev => prev.map(g => g.groupId === updated.groupId ? updated : g));
    if (selectedGroup && selectedGroup.groupId === updated.groupId) {
      setSelectedGroup(updated);
    }
  };

  // 통계 계산
  const totalFamilies = familyGroups.length;
  const totalChildren = familyGroups.reduce((acc, g) => acc + g.members.length, 0);
  const totalSharedCredit = familyGroups.reduce((acc, g) => acc + g.sharedCreditBalance, 0);
  const pendingRewards = referrals.filter(r => r.status === 'pending').length;

  const currentBilling = selectedGroup ? calculateFamilyBilling(selectedGroup, 10, true) : null;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', color: '#111827' }}>
            👨‍👩‍👧‍👦 형제·패밀리 연동 & 추천인 리워드
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            형제/자매 자동 결합 할인, 가족 공용 충전 크레딧 지갑 및 지인 소개 보너스를 실시간 통합 관리합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('families')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: activeTab === 'families' ? '#4f46e5' : '#ffffff',
              color: activeTab === 'families' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            패밀리 그룹 & 결합할인 ({totalFamilies})
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: activeTab === 'referrals' ? '#4f46e5' : '#ffffff',
              color: activeTab === 'referrals' ? '#ffffff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            지인 추천 리워드 ({referrals.length})
            {pendingRewards > 0 && (
              <span style={{ marginLeft: '6px', background: '#ef4444', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px' }}>
                {pendingRewards}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 상단 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>등록 패밀리 그룹</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>{totalFamilies} 가구</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>총 {totalChildren}명 원생 묶음 관리</div>
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>형제 자동 결합 할인</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#4f46e5' }}>2인 10% / 3인 15%</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>매월 청구 시 자동 차감</div>
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>가족 공용 크레딧 예치 잔액</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669' }}>
            {totalSharedCredit.toLocaleString()} 원
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>자녀 누구나 현장 차감 사용</div>
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>추천인 보너스 승인 대기</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: pendingRewards > 0 ? '#ef4444' : '#111827' }}>
            {pendingRewards} 건
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>1인 소개 시 30,000 크레딧</div>
        </div>
      </div>

      {activeTab === 'families' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* 좌측: 패밀리 목록 */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#111827' }}>
              📋 패밀리 그룹 목록
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {familyGroups.map(group => {
                const isSelected = selectedGroup?.groupId === group.groupId;
                const discountRate = group.members.length >= 3 ? 15 : group.members.length === 2 ? 10 : 0;
                return (
                  <div
                    key={group.groupId}
                    onClick={() => setSelectedGroup(group)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                      background: isSelected ? '#eef2ff' : '#ffffff',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>{group.familyName}</span>
                      <span style={{
                        fontSize: '12px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: discountRate > 0 ? '#dcfce7' : '#f3f4f6',
                        color: discountRate > 0 ? '#166534' : '#6b7280',
                        fontWeight: 600,
                      }}>
                        {discountRate > 0 ? `형제 할인 ${discountRate}%` : '단일 수강'}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '6px' }}>
                      👤 학부모 대표: <strong>{group.representativeName}</strong>
                    </div>

                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>
                      자녀 목록: {group.members.map(m => m.name).join(', ')}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px dashed #d1d5db', paddingTop: '8px' }}>
                      <span style={{ color: '#6b7280' }}>가족 공용 크레딧:</span>
                      <span style={{ fontWeight: 700, color: '#059669' }}>
                        {group.sharedCreditBalance.toLocaleString()} 원
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우측: 선택된 패밀리 상세 & 실시간 결합 청구 계산기 */}
          {selectedGroup && currentBilling && (
            <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600 }}>상세 설정 & 정산 시뮬레이터</span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0 0 0', color: '#111827' }}>
                  {selectedGroup.familyName}
                </h3>
              </div>

              {/* 자녀 목록 및 과목 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  구성원 수강 명세
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedGroup.members.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: '#f9fafb',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    >
                      <div>
                        <strong>{m.name}</strong> ({m.enrolledCoursesCount}개 강좌)
                      </div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {m.monthlyTuition.toLocaleString()} 원/월
                      </div>
                    </div>
                  ))}
                </div>

                {/* 신규 형제/자매 추가 폼 */}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="신규 형제/자매 이름"
                    value={newChildName}
                    onChange={e => setNewChildName(e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    placeholder="수강료"
                    value={newChildTuition}
                    onChange={e => setNewChildTuition(Number(e.target.value))}
                    style={{ width: '100px', padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
                  />
                  <button
                    onClick={() => handleAddMember(selectedGroup)}
                    style={{
                      padding: '6px 12px',
                      background: '#4f46e5',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + 가족 바인딩
                  </button>
                </div>
              </div>

              {/* 가족 공용 크레딧 충전/차감 */}
              <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>💳 가족 공용 선불 크레딧</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#15803d' }}>
                    {selectedGroup.sharedCreditBalance.toLocaleString()} 원
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    step={10000}
                    value={creditInput}
                    onChange={e => setCreditInput(Number(e.target.value))}
                    style={{ width: '120px', padding: '6px 8px', borderRadius: '4px', border: '1px solid #86efac', fontSize: '13px' }}
                  />
                  <button
                    onClick={() => handleDepositCredit(selectedGroup)}
                    style={{ padding: '6px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    충전(+)
                  </button>
                  <button
                    onClick={() => handleDeductCredit(selectedGroup)}
                    style={{ padding: '6px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    현장차감(-)
                  </button>
                </div>
              </div>

              {/* 형제 결합 청구 시뮬레이션 결과 */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                  💰 당월 수강료 결합 정산 명세서
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>정상 수강료 합계:</span>
                  <span style={{ color: '#0f172a' }}>{currentBilling.totalOriginalTuition.toLocaleString()} 원</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#ef4444' }}>형제 결합 감면 ({currentBilling.discountRatePercent}%):</span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>-{currentBilling.discountAmount.toLocaleString()} 원</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#059669' }}>가족 공용 크레딧 자동 상계:</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>-{currentBilling.coveredBySharedCredit.toLocaleString()} 원</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, borderTop: '2px solid #cbd5e1', paddingTop: '10px', marginTop: '10px' }}>
                  <span style={{ color: '#1e293b' }}>최종 실납부 청구액:</span>
                  <span style={{ color: '#4f46e5' }}>{currentBilling.finalOutOfPocketAmount.toLocaleString()} 원</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 지인 추천인 리워드 관리 탭 */
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
            🎁 지인 추천 리워드 승인 내역
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>등록 일자</th>
                <th style={{ padding: '10px' }}>추천인 (기존 회원)</th>
                <th style={{ padding: '10px' }}>피추천인 (신규 회원)</th>
                <th style={{ padding: '10px' }}>리워드 혜택</th>
                <th style={{ padding: '10px' }}>지급 상태</th>
                <th style={{ padding: '10px' }}>조치</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map(ref => (
                <tr key={ref.referralId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 10px', color: '#6b7280' }}>{ref.registeredDate}</td>
                  <td style={{ padding: '12px 10px', fontWeight: 600, color: '#111827' }}>{ref.referrerName}</td>
                  <td style={{ padding: '12px 10px', color: '#374151' }}>{ref.refereeName}</td>
                  <td style={{ padding: '12px 10px', color: '#059669', fontWeight: 600 }}>
                    {ref.rewardValue.toLocaleString()} 크레딧
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: ref.status === 'rewarded' ? '#dcfce7' : '#fef3c7',
                      color: ref.status === 'rewarded' ? '#166534' : '#92400e',
                    }}>
                      {ref.status === 'rewarded' ? '지급 완료' : '승인 대기'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    {ref.status === 'pending' ? (
                      <button
                        onClick={() => handleReward(ref)}
                        style={{
                          padding: '4px 10px',
                          background: '#4f46e5',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        보너스 즉시 지급
                      </button>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>처리 완료</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
