import React, { useState } from 'react';
import { ToggleSwitch } from '@/shared/components/ui/ToggleSwitch';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import {
  Building2,
  Eye,
  EyeOff,
  Users,
  MapPin,
  Sparkles,
  Check,
  Coins,
  Gift,
  Award,
  CreditCard,
  Handshake,
  Plus,
  Trash2,
  Phone,
  ExternalLink,
} from 'lucide-react';
import type {
  PartnerVendorCategory,
  PlannerCommissionPolicy,
  SettlementScheduleRule,
  VenueIntroductionProfile,
  VenuePartnerVendor,
  VenuePaymentOptions,
} from '@/types/firstBirthdayPlanning';
import {
  createDefaultPaymentOptions,
  createSamplePartnerVendors,
  getPartnerVendorCategoryLabel,
} from '@/shared/services/firstBirthdayPlanningService';

interface VenueProfileSettingCardProps {
  profile: VenueIntroductionProfile;
  onUpdateProfile: (updated: VenueIntroductionProfile) => void;
  disabled?: boolean;
}

export const VenueProfileSettingCard: React.FC<VenueProfileSettingCardProps> = ({
  profile,
  onUpdateProfile,
  disabled = false,
}) => {
  const handleTogglePublic = (enabled: boolean) => {
    onUpdateProfile({
      ...profile,
      isProfilePublic: enabled,
    });
  };

  const currentPolicy: PlannerCommissionPolicy = profile.commissionPolicy || {
    type: 'FIXED_PER_BOOKING',
    value: 150000,
    settlementRule: 'NEXT_MONTH_10TH',
    bonusTier: { offPeakSlotBonusAmount: 50000, description: '비선호 타임(3부 저녁) 성사 시' },
    payoutTermDays: 14,
  };

  const handleUpdatePolicy = (partial: Partial<PlannerCommissionPolicy>) => {
    onUpdateProfile({
      ...profile,
      commissionPolicy: {
        ...currentPolicy,
        ...partial,
      },
    });
  };

  // 결제 옵션 처리
  const paymentOptions: VenuePaymentOptions =
    profile.paymentOptions || createDefaultPaymentOptions();

  const handleUpdatePayment = (partial: Partial<VenuePaymentOptions>) => {
    onUpdateProfile({
      ...profile,
      paymentOptions: {
        ...paymentOptions,
        ...partial,
      },
    });
  };

  // 제휴업체 목록 처리
  const partnerVendors: VenuePartnerVendor[] =
    profile.partnerVendors && profile.partnerVendors.length > 0
      ? profile.partnerVendors
      : createSamplePartnerVendors();

  const [showAddVendorForm, setShowAddVendorForm] = useState(false);
  const [newVendor, setNewVendor] = useState<Partial<VenuePartnerVendor>>({
    category: 'DOLJABI_TABLE',
    vendorName: '',
    contactNumber: '',
    partnershipBenefit: '',
    instagramUrl: '',
    description: '',
  });

  const handleAddVendor = () => {
    if (!newVendor.vendorName?.trim() || !newVendor.contactNumber?.trim()) {
      return;
    }
    const vendor: VenuePartnerVendor = {
      id: `v_custom_${Date.now()}`,
      category: newVendor.category || 'DOLJABI_TABLE',
      vendorName: newVendor.vendorName.trim(),
      contactNumber: newVendor.contactNumber.trim(),
      partnershipBenefit: newVendor.partnershipBenefit?.trim() || '베뉴 제휴 특별 할인 제공',
      instagramUrl: newVendor.instagramUrl?.trim(),
      description: newVendor.description?.trim(),
    };
    onUpdateProfile({
      ...profile,
      partnerVendors: [...partnerVendors, vendor],
    });
    setNewVendor({
      category: 'DOLJABI_TABLE',
      vendorName: '',
      contactNumber: '',
      partnershipBenefit: '',
      instagramUrl: '',
      description: '',
    });
    setShowAddVendorForm(false);
  };

  const handleDeleteVendor = (vendorId: string) => {
    onUpdateProfile({
      ...profile,
      partnerVendors: partnerVendors.filter((v) => v.id !== vendorId),
    });
  };

  return (
    <Card className="p-5 border-slate-200">
      <div className="space-y-6">
        {/* 상단: 업체명 및 자료 공개 여부 선택 스위치 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-800" />
              <h3 className="text-lg font-bold text-slate-800">{profile.venueName}</h3>
              <Badge variant={profile.isProfilePublic ? 'success' : 'neutral'}>
                {profile.isProfilePublic ? '플래너에 공개 중' : '비공개 (업체 전용)'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">{profile.tagline}</p>
          </div>

          {/* 핵심: 업체가 자료를 공개할지 여부를 선택할 수 있는 스위치 */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-right">
              <span className="block text-xs font-semibold text-slate-700 flex items-center justify-end gap-1">
                {profile.isProfilePublic ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-600" /> 소개자료 및 일정 공개
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" /> 비공개 모드
                  </>
                )}
              </span>
              <span className="text-[11px] text-slate-500">
                {profile.isProfilePublic
                  ? '제휴 플래너가 소개자료와 빈 일정을 볼 수 있습니다'
                  : '플래너 계정에 자료가 노출되지 않습니다'}
              </span>
            </div>
            <ToggleSwitch
              enabled={profile.isProfilePublic}
              onChange={handleTogglePublic}
              ariaLabel="플래너 소개자료 및 일정 공개 여부"
              activeClassName="bg-emerald-600"
              disabled={disabled}
            />
          </div>
        </div>

        {/* 1. 플래너 제휴 수수료 정책 설정 */}
        <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-slate-800" />
              <h4 className="font-bold text-slate-800 text-sm">플래너 제휴 수수료 정책 설정</h4>
            </div>
            <Badge variant="brand">제휴 플래너 유치 혜택</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 수수료 지급 방식 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">수수료 지급 방식</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    handleUpdatePolicy({ type: 'FIXED_PER_BOOKING', value: currentPolicy.value || 150000 })
                  }
                  className={`flex-1 py-2 px-3 text-xs rounded-lg font-medium border transition-colors ${
                    currentPolicy.type === 'FIXED_PER_BOOKING'
                      ? 'bg-slate-900 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  건당 정액제
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    handleUpdatePolicy({ type: 'PERCENTAGE', value: currentPolicy.value <= 100 ? currentPolicy.value : 8 })
                  }
                  className={`flex-1 py-2 px-3 text-xs rounded-lg font-medium border transition-colors ${
                    currentPolicy.type === 'PERCENTAGE'
                      ? 'bg-slate-900 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  비율제 (%)
                </button>
              </div>
            </div>

            {/* 수수료 금액 / 요율 입력 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {currentPolicy.type === 'FIXED_PER_BOOKING'
                  ? '건당 기본 수수료 (원)'
                  : '매출 비율 요율 (%)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={disabled}
                  value={currentPolicy.value || 0}
                  onChange={(e) => handleUpdatePolicy({ value: Number(e.target.value) })}
                  className="flex-1 text-xs border rounded-lg p-2 font-bold text-slate-800 disabled:bg-slate-50"
                  placeholder={currentPolicy.type === 'FIXED_PER_BOOKING' ? '150000' : '8'}
                />
                <span className="text-xs font-bold text-slate-600">
                  {currentPolicy.type === 'FIXED_PER_BOOKING' ? '원' : '%'}
                </span>
              </div>
            </div>
          </div>

          {/* 정산 기준 및 지급 주기 */}
          <div className="border-t border-slate-200 pt-3 space-y-2">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              업계 표준 정산 지급 주기 (D-Day 행사 완료 후 기준)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleUpdatePolicy({ settlementRule: 'NEXT_MONTH_10TH' })}
                className={`py-2 px-2.5 text-xs rounded-lg font-medium border text-left transition-colors ${
                  (currentPolicy.settlementRule || 'NEXT_MONTH_10TH') === 'NEXT_MONTH_10TH'
                    ? 'bg-slate-900 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold">익월 10일 (추천)</div>
                <div className="text-[10px] opacity-80">전월 종료건 일괄 정산</div>
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleUpdatePolicy({ settlementRule: 'NEXT_MONTH_25TH' })}
                className={`py-2 px-2.5 text-xs rounded-lg font-medium border text-left transition-colors ${
                  currentPolicy.settlementRule === 'NEXT_MONTH_25TH'
                    ? 'bg-slate-900 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold">익월 25일</div>
                <div className="text-[10px] opacity-80">월말 마감 정산</div>
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleUpdatePolicy({ settlementRule: 'AFTER_14_DAYS' })}
                className={`py-2 px-2.5 text-xs rounded-lg font-medium border text-left transition-colors ${
                  currentPolicy.settlementRule === 'AFTER_14_DAYS'
                    ? 'bg-slate-900 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold">행사 종료 14일 후</div>
                <div className="text-[10px] opacity-80">건별 개별 지급</div>
              </button>
            </div>
          </div>

          {/* 비선호 타임 추가 보너스 티어 */}
          <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
            <div>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-amber-500" /> 비선호 타임 성사 보너스 (3부 저녁/평일)
              </span>
              <p className="text-[11px] text-slate-500">
                예약이 적은 타임대를 계약해 온 플래너에게 추가 인센티브를 부여합니다.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-600 font-medium">추가 지급:</span>
              <input
                type="number"
                disabled={disabled}
                value={currentPolicy.bonusTier?.offPeakSlotBonusAmount || 0}
                onChange={(e) =>
                  handleUpdatePolicy({
                    bonusTier: {
                      ...currentPolicy.bonusTier,
                      offPeakSlotBonusAmount: Number(e.target.value),
                    },
                  })
                }
                className="w-24 text-xs font-bold border rounded-lg p-1.5 text-right text-slate-800"
              />
              <span className="text-slate-500 font-medium">원</span>
            </div>
          </div>
        </div>

        {/* 2. 지역화폐 및 결제 지원 설정 (신규 요구사항) */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-slate-800 text-sm">지역화폐 및 결제 수단 지원 안내 설정</h4>
            </div>
            <Badge variant="success">고객 세일즈 강화</Badge>
          </div>
          <p className="text-xs text-slate-600">
            플래너가 혼주 유치 시 &quot;실질 할인 혜택&quot;을 제시할 수 있도록 등록된 지역화폐 및 결제수단 뱃지를 노출합니다.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 지역화폐 가맹 여부 및 혜택 */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800">지역화폐(서울페이 등) 결제</span>
                <ToggleSwitch
                  enabled={paymentOptions.localCurrency?.isAccepted ?? true}
                  onChange={(val) =>
                    handleUpdatePayment({
                      localCurrency: {
                        ...(paymentOptions.localCurrency || {
                          currencyName: '서울페이',
                          discountRatePercent: 10,
                        }),
                        isAccepted: val,
                      },
                    })
                  }
                  ariaLabel="지역화폐 결제 지원 여부"
                  activeClassName="bg-emerald-600"
                  disabled={disabled}
                />
              </div>

              {paymentOptions.localCurrency?.isAccepted && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">지원 지역화폐 명칭</label>
                    <input
                      type="text"
                      disabled={disabled}
                      value={paymentOptions.localCurrency.currencyName}
                      onChange={(e) =>
                        handleUpdatePayment({
                          localCurrency: {
                            ...paymentOptions.localCurrency!,
                            currencyName: e.target.value,
                          },
                        })
                      }
                      placeholder="예: 서울페이, 경기지역화폐, 지역사랑상품권"
                      className="w-full text-xs border rounded p-1.5"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    ※ 지자체별 할인율은 예산에 따라 상시 변동되므로 구체적 수치 없이 가맹점 여부 및 지자체 할인 혜택 중심으로 안내됩니다.
                  </p>
                </div>
              )}
            </div>

            {/* 기타 결제 수단 체크 */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-slate-800 block">기타 정부/공식 결제 지원</span>
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={paymentOptions.onnuriCertificate ?? true}
                    onChange={(e) => handleUpdatePayment({ onnuriCertificate: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>온누리상품권 사용 가능 가맹점</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={paymentOptions.zeroPayAccepted ?? true}
                    onChange={(e) => handleUpdatePayment({ zeroPayAccepted: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>제로페이 결제 지원</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={paymentOptions.cashReceiptOffered ?? true}
                    onChange={(e) => handleUpdatePayment({ cashReceiptOffered: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>현금영수증 및 사업자 지출증빙 의무 발행</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 공식 제휴 협력업체 관리 (Partner Vendors) */}
        <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-slate-800 text-sm">
                  베뉴 공식 제휴업체 관리 ({partnerVendors.length}곳 등록)
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                돌상, 스냅, 사회자, 한복 등 플래너가 고객 상담 시 추천할 제휴 혜택과 연락처를 관리합니다.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => setShowAddVendorForm(!showAddVendorForm)}
              className="text-xs bg-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> 제휴업체 추가
            </Button>
          </div>

          {/* 제휴업체 등록 폼 */}
          {showAddVendorForm && (
            <div className="bg-white p-3.5 rounded-lg border border-amber-200 space-y-3 text-xs">
              <h5 className="font-bold text-slate-800">신규 공식 제휴업체 등록</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">카테고리</label>
                  <select
                    value={newVendor.category || 'DOLJABI_TABLE'}
                    onChange={(e) =>
                      setNewVendor({
                        ...newVendor,
                        category: e.target.value as PartnerVendorCategory,
                      })
                    }
                    className="w-full text-xs border rounded p-1.5 bg-white"
                  >
                    <option value="DOLJABI_TABLE">돌상</option>
                    <option value="SNAP_PHOTO">스냅</option>
                    <option value="MC">사회자</option>
                    <option value="ATTIRE">한복/의상</option>
                    <option value="FAVOR_GIFT">답례품/떡</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">제휴 업체명</label>
                  <input
                    type="text"
                    value={newVendor.vendorName || ''}
                    onChange={(e) => setNewVendor({ ...newVendor, vendorName: e.target.value })}
                    placeholder="예: 수려한 전통돌상"
                    className="w-full text-xs border rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">다이렉트 연락처</label>
                  <input
                    type="text"
                    value={newVendor.contactNumber || ''}
                    onChange={(e) => setNewVendor({ ...newVendor, contactNumber: e.target.value })}
                    placeholder="예: 010-1234-5678"
                    className="w-full text-xs border rounded p-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">
                    베뉴 제휴 특별 혜택 (플래너 세일즈용)
                  </label>
                  <input
                    type="text"
                    value={newVendor.partnershipBenefit || ''}
                    onChange={(e) =>
                      setNewVendor({ ...newVendor, partnershipBenefit: e.target.value })
                    }
                    placeholder="예: 식대 결제 시 돌상 10% 제휴 할인 & 현수막 제작 무료"
                    className="w-full text-xs border rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">
                    인스타그램 또는 포트폴리오 링크
                  </label>
                  <input
                    type="text"
                    value={newVendor.instagramUrl || ''}
                    onChange={(e) => setNewVendor({ ...newVendor, instagramUrl: e.target.value })}
                    placeholder="예: https://instagram.com/vendor_official"
                    className="w-full text-xs border rounded p-1.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setShowAddVendorForm(false)}>
                  취소
                </Button>
                <Button size="sm" variant="primary" onClick={handleAddVendor}>
                  등록하기
                </Button>
              </div>
            </div>
          )}

          {/* 제휴업체 목록 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {partnerVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-start gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">{getPartnerVendorCategoryLabel(vendor.category)}</Badge>
                    <span className="font-bold text-slate-800">{vendor.vendorName}</span>
                  </div>
                  <div className="text-[11px] text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                    혜택: {vendor.partnershipBenefit}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" /> {vendor.contactNumber}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDeleteVendor(vendor.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="제휴업체 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 4. 업체 상세 소개글 */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">업체 상세 소개자료</label>
          <textarea
            disabled={disabled}
            rows={3}
            value={profile.description}
            onChange={(e) => onUpdateProfile({ ...profile, description: e.target.value })}
            placeholder="플래너 및 혼주에게 안내할 연회장 특징, 돌상 컨셉, 뷔페 메뉴 구성 등을 입력하세요."
            className="w-full text-xs border rounded-lg p-2.5 disabled:bg-slate-50 text-slate-700"
          />
        </div>

        {/* 5. 연회홀 목록 */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-500" /> 운영 연회홀 및 수용 규모 ({profile.halls.length}개)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {profile.halls.map((hall) => (
              <div
                key={hall.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">{hall.name}</span>
                  <span className="text-slate-500 font-mono">최대 {hall.capacity}석</span>
                </div>
                <p className="text-[11px] text-slate-600">최소 보증: {hall.minGuaranteed}명</p>
                <p className="text-[11px] text-slate-500 truncate">{hall.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 6. 돌잔치 패키지 안내 */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" /> 돌잔치 대표 패키지 ({profile.packages.length}개)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.packages.map((pkg) => (
              <div
                key={pkg.id}
                className="border border-slate-200 rounded-lg p-3 space-y-2 text-xs bg-white"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">{pkg.name}</span>
                    <span className="text-slate-600">
                      식대 인당 {pkg.pricePerPerson.toLocaleString()}원 / 대관료 {pkg.rentalFee.toLocaleString()}원
                    </span>
                  </div>
                  {pkg.badge && <Badge variant="brand">{pkg.badge}</Badge>}
                </div>
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  {pkg.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-[11px] text-slate-600">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7. 시설 및 주차 안내 */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1 font-semibold text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-slate-500" /> 시설 및 주차 안내 (플래너 사전 안내용)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
            <div>
              <span className="font-medium text-slate-700">주차 안내:</span>{' '}
              {profile.amenities.parkingCapacity}
            </div>
            <div>
              <span className="font-medium text-slate-700">대중교통:</span>{' '}
              {profile.amenities.transitNotice}
            </div>
            <div>
              <span className="font-medium text-slate-700">수유실 구비:</span>{' '}
              {profile.amenities.hasNursingRoom ? '구비 완료' : '미구비'}
            </div>
            <div>
              <span className="font-medium text-slate-700">엘리베이터:</span>{' '}
              {profile.amenities.hasElevator ? '운행 중' : '계단 이용'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
