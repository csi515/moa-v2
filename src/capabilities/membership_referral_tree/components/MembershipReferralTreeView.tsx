import { showToast } from '@/shared/feedback/uiFeedback';
import { formatNumberWithCommas } from '@/utils/formatters';
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

  // 신규 회원 추가 폼
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
      showToast('가족 공용 크레딧 잔액이 부족합니다.', 'warning');
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
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            👨‍👩‍👧‍👦 형제·패밀리 연동 & 추천인 리워드
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            형제/자매 자동 결합 할인, 가족 공용 충전 크레딧 지갑 및 지인 소개 보너스를 실시간 통합 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('families')}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors min-h-[44px] cursor-pointer ${
              activeTab === 'families'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            패밀리 그룹 & 결합할인 ({totalFamilies})
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors min-h-[44px] cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'referrals'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            지인 추천 리워드 ({referrals.length})
            {pendingRewards > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold tabular-nums">
                {pendingRewards}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">등록 패밀리 그룹</div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums font-mono">{totalFamilies} 가구</div>
          <div className="text-xs text-emerald-600 mt-1 tabular-nums font-mono">총 {totalChildren}명 회원 묶음 관리</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">형제 자동 결합 할인</div>
          <div className="text-2xl font-bold text-blue-600 mt-1.5">2인 10% / 3인 15%</div>
          <div className="text-xs text-slate-400 mt-1">매월 청구 시 자동 차감</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">가족 공용 크레딧 예치 잔액</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1.5 tabular-nums font-mono">
            {formatNumberWithCommas(totalSharedCredit)} 원
          </div>
          <div className="text-xs text-slate-400 mt-1">자녀 누구나 현장 차감 사용</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">추천인 보너스 승인 대기</div>
          <div className={`text-2xl font-bold mt-1.5 tabular-nums font-mono ${pendingRewards > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {pendingRewards} 건
          </div>
          <div className="text-xs text-slate-400 mt-1">1인 소개 시 30,000 크레딧</div>
        </div>
      </div>

      {activeTab === 'families' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 좌측: 패밀리 목록 */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              📋 패밀리 그룹 목록
            </h3>
            <div className="flex flex-col gap-3">
              {familyGroups.map(group => {
                const isSelected = selectedGroup?.groupId === group.groupId;
                const discountRate = group.members.length >= 3 ? 15 : group.members.length === 2 ? 10 : 0;
                return (
                  <div
                    key={group.groupId}
                    onClick={() => setSelectedGroup(group)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm sm:text-base text-slate-900">{group.familyName}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        discountRate > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {discountRate > 0 ? `형제 할인 ${discountRate}%` : '단일 수강'}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-600 mb-1.5">
                      👤 학부모 대표: <strong>{group.representativeName}</strong>
                    </div>

                    <div className="text-xs text-slate-500 mb-2.5">
                      자녀 목록: {group.members.map(m => m.name).join(', ')}
                    </div>

                    <div className="flex justify-between text-xs sm:text-sm border-t border-dashed border-slate-200 pt-2">
                      <span className="text-slate-500">가족 공용 크레딧:</span>
                      <span className="font-bold text-emerald-600 tabular-nums font-mono">
                        {formatNumberWithCommas(group.sharedCreditBalance)} 원
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우측: 선택된 패밀리 상세 & 실시간 결합 청구 계산기 */}
          {selectedGroup && currentBilling && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <span className="text-xs font-semibold text-blue-600">상세 설정 & 정산 시뮬레이터</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedGroup.familyName}
                </h3>
              </div>

              {/* 자녀 목록 및 과목 */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">
                  구성원 수강 명세
                </div>
                <div className="flex flex-col gap-2">
                  {selectedGroup.members.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-xs sm:text-sm border border-slate-100"
                    >
                      <div>
                        <strong className="text-slate-900">{m.name}</strong> ({m.enrolledCoursesCount}개 강좌)
                      </div>
                      <div className="font-semibold text-slate-900 tabular-nums font-mono">
                        {m.monthlyTuition.toLocaleString()} 원/월
                      </div>
                    </div>
                  ))}
                </div>

                {/* 신규 형제/자매 추가 폼 */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="신규 형제/자매 이름"
                    value={newChildName}
                    onChange={e => setNewChildName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="수강료"
                    value={newChildTuition}
                    onChange={e => setNewChildTuition(Number(e.target.value))}
                    className="w-full sm:w-28 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-mono tabular-nums focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleAddMember(selectedGroup)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold min-h-[44px] transition-colors cursor-pointer shadow-2xs shrink-0"
                  >
                    + 가족 바인딩
                  </button>
                </div>
              </div>

              {/* 가족 공용 크레딧 충전/차감 */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-semibold text-emerald-900">💳 가족 공용 선불 크레딧</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-700 tabular-nums font-mono">
                    {formatNumberWithCommas(selectedGroup.sharedCreditBalance)} 원
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    step={10000}
                    value={creditInput}
                    onChange={e => setCreditInput(Number(e.target.value))}
                    className="w-32 px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs sm:text-sm font-mono tabular-nums focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleDepositCredit(selectedGroup)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold min-h-[36px] transition-colors cursor-pointer shadow-2xs"
                  >
                    충전(+)
                  </button>
                  <button
                    onClick={() => handleDeductCredit(selectedGroup)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold min-h-[36px] transition-colors cursor-pointer shadow-2xs"
                  >
                    현장차감(-)
                  </button>
                </div>
              </div>

              {/* 형제 결합 청구 시뮬레이션 결과 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs sm:text-sm">
                <div className="font-bold text-slate-900 mb-2">
                  💰 당월 수강료 결합 정산 명세서
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>정상 수강료 합계:</span>
                  <span className="text-slate-900 tabular-nums font-mono">{formatNumberWithCommas(currentBilling.totalOriginalTuition)} 원</span>
                </div>

                <div className="flex justify-between text-red-600 font-medium">
                  <span>형제 결합 감면 ({currentBilling.discountRatePercent}%):</span>
                  <span className="tabular-nums font-mono">-{formatNumberWithCommas(currentBilling.discountAmount)} 원</span>
                </div>

                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>가족 공용 크레딧 자동 상계:</span>
                  <span className="tabular-nums font-mono">-{formatNumberWithCommas(currentBilling.coveredBySharedCredit)} 원</span>
                </div>

                <div className="flex justify-between font-bold text-base sm:text-lg border-t border-slate-200 pt-2.5 mt-2 text-slate-900">
                  <span>최종 실납부 청구액:</span>
                  <span className="text-blue-600 tabular-nums font-mono">{formatNumberWithCommas(currentBilling.finalOutOfPocketAmount)} 원</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 지인 추천인 리워드 관리 탭 */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs p-5">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            🎁 지인 추천 리워드 승인 내역
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">등록 일자</th>
                  <th className="px-3.5 py-3">추천인 (기존 회원)</th>
                  <th className="px-3.5 py-3">피추천인 (신규 회원)</th>
                  <th className="px-3.5 py-3">리워드 혜택</th>
                  <th className="px-3.5 py-3">지급 상태</th>
                  <th className="px-3.5 py-3">조치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map(ref => (
                  <tr key={ref.referralId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3.5 py-3.5 text-slate-500 tabular-nums">{ref.registeredDate}</td>
                    <td className="px-3.5 py-3.5 font-semibold text-slate-900">{ref.referrerName}</td>
                    <td className="px-3.5 py-3.5 text-slate-700">{ref.refereeName}</td>
                    <td className="px-3.5 py-3.5 text-emerald-600 font-semibold tabular-nums font-mono">
                      {formatNumberWithCommas(ref.rewardValue)} 크레딧
                    </td>
                    <td className="px-3.5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        ref.status === 'rewarded' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ref.status === 'rewarded' ? '지급 완료' : '승인 대기'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5">
                      {ref.status === 'pending' ? (
                        <button
                          onClick={() => handleReward(ref)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold min-h-[36px] transition-colors cursor-pointer shadow-2xs"
                        >
                          보너스 즉시 지급
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">처리 완료</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
