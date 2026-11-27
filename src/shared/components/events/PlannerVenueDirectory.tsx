import React, { useState } from 'react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import {
  Building2,
  Calendar,
  MapPin,
  Users,
  Sparkles,
  Eye,
  Coins,
  Gift,
  BarChart3,
  CreditCard,
  Phone,
  ExternalLink,
  CheckCircle2,
  Copy,
  Lightbulb,
  Handshake,
  Tag,
} from 'lucide-react';
import type {
  VenueIntroductionProfile,
  FirstBirthdayEventPlan,
  PartnerVendorCategory,
} from '@/types/firstBirthdayPlanning';
import {
  filterPublicVenues,
  calculateVenueAvailability,
  getPartnerVendorCategoryLabel,
  formatPaymentBadgeText,
  formatSalesPitchTip,
  filterVendorsByCategory,
  createSamplePartnerVendors,
  createDefaultPaymentOptions,
} from '@/shared/services/firstBirthdayPlanningService';
import { PlannerAvailabilityCalendar } from './PlannerAvailabilityCalendar';
import { PlannerSettlementDashboard } from './PlannerSettlementDashboard';

interface PlannerVenueDirectoryProps {
  venues: VenueIntroductionProfile[];
  events: FirstBirthdayEventPlan[];
  currentPlannerId?: string;
  onUpdateEvent?: (updated: FirstBirthdayEventPlan) => void;
}

export const PlannerVenueDirectory: React.FC<PlannerVenueDirectoryProps> = ({
  venues,
  events,
  currentPlannerId = 'pl_042',
  onUpdateEvent,
}) => {
  // 공개된 업체만 필터링 (업체의 공개 여부 선택 권한 존중)
  const publicVenues = filterPublicVenues(venues);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(
    publicVenues.length > 0 ? publicVenues[0].venueId : null
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [viewMode, setViewMode] = useState<
    'directory' | 'calendar' | 'settlement' | 'vendors'
  >('directory');
  const [selectedCategory, setSelectedCategory] = useState<PartnerVendorCategory | 'ALL'>('ALL');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const currentVenue = publicVenues.find((v) => v.venueId === selectedVenueId) || null;

  const currentSlots = currentVenue
    ? calculateVenueAvailability(currentVenue, selectedDate, events)
    : [];

  const handleOpenCalendar = (venueId: string) => {
    setSelectedVenueId(venueId);
    setViewMode('calendar');
  };

  const handleOpenVendors = (venueId?: string) => {
    if (venueId) setSelectedVenueId(venueId);
    setViewMode('vendors');
  };

  const handleCopyPhone = (phone: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(phone);
    }
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // 제휴업체 목록 준비 (베뉴에 지정된 제휴업체가 없으면 기본 샘플 제휴업체 연결)
  const targetVendors =
    currentVenue?.partnerVendors && currentVenue.partnerVendors.length > 0
      ? currentVenue.partnerVendors
      : createSamplePartnerVendors();

  const filteredVendors = filterVendorsByCategory(targetVendors, selectedCategory);

  return (
    <div className="space-y-6">
      {/* 상단 탭 네비게이션 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-slate-800" /> 제휴 돌잔치 연회장 안내 및 가용 일정
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            소개자료 공개에 동의한 제휴 업체의 베뉴 정보와 실시간 일정표, 수수료 정책, 공식 제휴업체를 확인합니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            size="sm"
            variant={viewMode === 'directory' ? 'primary' : 'outline'}
            onClick={() => setViewMode('directory')}
          >
            업체 목록 & 수수료 비교
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'vendors' ? 'primary' : 'outline'}
            onClick={() => handleOpenVendors()}
          >
            <Handshake className="w-3.5 h-3.5 mr-1 text-slate-800" /> 공식 제휴업체 리스트
          </Button>
          {currentVenue && (
            <Button
              size="sm"
              variant={viewMode === 'calendar' ? 'primary' : 'outline'}
              onClick={() => setViewMode('calendar')}
            >
              실시간 일정표 ({currentVenue.venueName})
            </Button>
          )}
          <Button
            size="sm"
            variant={viewMode === 'settlement' ? 'primary' : 'outline'}
            onClick={() => setViewMode('settlement')}
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> 내 실적 / 정산 관리
          </Button>
        </div>
      </div>

      {/* 모드 1: 업체별 소개자료 및 수수료 정책 비교 디렉토리 뷰 */}
      {viewMode === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {publicVenues.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-slate-50 border border-dashed rounded-lg text-slate-500 text-sm">
              현재 플래너에게 공개된 제휴 돌잔치 업체가 없습니다.
            </div>
          ) : (
            publicVenues.map((venue) => {
              const policy = venue.commissionPolicy;
              const payment = venue.paymentOptions || createDefaultPaymentOptions();
              const paymentBadgeText = formatPaymentBadgeText(payment);
              const salesTip = formatSalesPitchTip(payment);
              const vendorCount = venue.partnerVendors?.length || 5;

              return (
                <Card key={venue.venueId} className="p-5 border-slate-200 space-y-4">
                  {/* 헤더 및 결제/지역화폐 뱃지 */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-800 text-base">{venue.venueName}</h3>
                        <Badge variant="brand">
                          <Eye className="w-3 h-3 inline mr-1 text-emerald-600" /> 자료 공개
                        </Badge>
                        {/* 지역화폐 뱃지 */}
                        {paymentBadgeText && (
                          <Badge variant="success">
                            {paymentBadgeText}
                          </Badge>
                        )}
                        {payment?.onnuriCertificate && (
                          <Badge variant="neutral">온누리상품권</Badge>
                        )}
                        {payment?.zeroPayAccepted && (
                          <Badge variant="neutral">제로페이</Badge>
                        )}
                        {payment?.cashReceiptOffered && (
                          <Badge variant="outline">현금영수증 발행</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{venue.tagline}</p>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCalendar(venue.venueId)}
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-800" /> 빈 일정
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenVendors(venue.venueId)}
                      >
                        <Handshake className="w-3.5 h-3.5 mr-1 text-amber-600" /> 제휴업체
                      </Button>
                    </div>
                  </div>

                  {/* 플래너 세일즈 팁 (지역화폐 실질 할인 세일즈 포인트) */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-900 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="text-emerald-950 font-semibold">플래너 세일즈 팁: </strong>
                      {salesTip}
                    </div>
                  </div>

                  {/* 성사 수수료 배너 */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800">
                          {policy
                            ? policy.type === 'FIXED_PER_BOOKING'
                              ? `성사 수수료: 건당 ₩${policy.value.toLocaleString()}`
                              : `성사 수수료: 결제액의 ${policy.value}% 비율제`
                            : '성사 수수료: 건당 협의'}
                        </span>
                        {policy?.bonusTier?.offPeakSlotBonusAmount ? (
                          <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                            <Gift className="w-3 h-3 text-amber-600" />
                            비선호 타임 성사 시 +₩{policy.bonusTier.offPeakSlotBonusAmount.toLocaleString()} 추가 보너스!
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {policy?.payoutTermDays && (
                      <span className="text-[11px] text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                        행사 완료 후 {policy.payoutTermDays}일 내 정산
                      </span>
                    )}
                  </div>

                  {/* 소개글 */}
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {venue.description}
                  </p>

                  {/* 홀 정보 및 공식 제휴업체 요약 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-700" /> 보유 연회홀
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenVendors(venue.venueId)}
                        className="text-[11px] text-slate-800 font-medium hover:underline flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3 text-slate-700" />
                        공식 제휴업체 {vendorCount}곳 확인 &gt;
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {venue.halls.map((hall) => (
                        <div
                          key={hall.id}
                          className="text-[11px] bg-slate-50/60 text-slate-800 px-2.5 py-1 rounded border border-slate-200"
                        >
                          <span className="font-bold">{hall.name}</span> (수용 {hall.capacity}석 / 최소 {hall.minGuaranteed}명)
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 대표 패키지 요약 */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 대표 패키지
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {venue.packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="border border-slate-200 rounded p-2 bg-white space-y-0.5"
                        >
                          <span className="font-bold text-slate-800">{pkg.name}</span>
                          <div className="text-[11px] text-slate-500">
                            식대 {pkg.pricePerPerson.toLocaleString()}원 / 대관료 {pkg.rentalFee.toLocaleString()}원
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 시설 및 주차 안내 */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {venue.amenities.parkingCapacity}
                    </span>
                    <span>{venue.amenities.transitNotice}</span>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* 모드 2: 공식 제휴업체 목록 디렉토리 뷰 (Partner Vendor Directory) */}
      {viewMode === 'vendors' && (
        <div className="space-y-4">
          <Card className="p-4 border-slate-200 bg-gradient-to-r from-slate-50 to-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-slate-800" />
                  <h3 className="font-bold text-slate-900 text-base">
                    {currentVenue ? currentVenue.venueName : '파티룸'} 공식 제휴업체 목록
                  </h3>
                  <Badge variant="brand">베뉴 제휴 특별 혜택 보장</Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  고객 상담 시 플래너가 안심하고 즉시 추천할 수 있는 검증된 파트너스 리스트입니다.
                </p>
              </div>

              {/* 다른 베뉴 선택 셀렉트 */}
              {publicVenues.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">베뉴 선택:</span>
                  <select
                    value={selectedVenueId || ''}
                    onChange={(e) => setSelectedVenueId(e.target.value)}
                    className="text-xs border rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium"
                  >
                    {publicVenues.map((v) => (
                      <option key={v.venueId} value={v.venueId}>
                        {v.venueName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 카테고리 필터 탭 */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60">
              {(
                [
                  { key: 'ALL', label: '전체 보기' },
                  { key: 'DOLJABI_TABLE', label: '돌상' },
                  { key: 'SNAP_PHOTO', label: '스냅' },
                  { key: 'MC', label: '사회자' },
                  { key: 'ATTIRE', label: '한복/의상' },
                  { key: 'FAVOR_GIFT', label: '답례품/떡' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedCategory(key)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    selectedCategory === key
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>

          {/* 제휴업체 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map((vendor) => (
              <Card
                key={vendor.id}
                className="p-4 border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline">
                      {getPartnerVendorCategoryLabel(vendor.category)}
                    </Badge>
                    {vendor.instagramUrl && (
                      <a
                        href={vendor.instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        포트폴리오 <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{vendor.vendorName}</h4>
                    {vendor.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {vendor.description}
                      </p>
                    )}
                  </div>

                  {/* 베뉴 제휴 특별 혜택 배너 (핵심 요구사항) */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900">
                    <span className="font-bold flex items-center gap-1 text-amber-950 mb-0.5">
                      <Gift className="w-3.5 h-3.5 text-amber-600" /> 베뉴 제휴 특별 혜택
                    </span>
                    <p className="text-[11px] font-medium leading-relaxed">
                      {vendor.partnershipBenefit}
                    </p>
                  </div>
                </div>

                {/* 다이렉트 연락처 및 원클릭 복사/전화 연결 */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-700 font-semibold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {vendor.contactNumber}
                  </span>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyPhone(vendor.contactNumber)}
                      className="text-xs px-2 py-1"
                    >
                      {copiedPhone === vendor.contactNumber ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1" /> 복사됨
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" /> 번호 복사
                        </>
                      )}
                    </Button>
                    <a
                      href={`tel:${vendor.contactNumber}`}
                      className="inline-flex items-center text-xs bg-slate-50 text-slate-700 px-2.5 py-1 rounded font-medium hover:bg-slate-100 border border-slate-200"
                    >
                      전화 연결
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 모드 3: 선택된 업체의 가용성 캘린더 뷰 */}
      {viewMode === 'calendar' && currentVenue && (
        <PlannerAvailabilityCalendar
          venue={currentVenue}
          slots={currentSlots}
          events={events}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onUpdateEvent={onUpdateEvent}
        />
      )}

      {/* 모드 4: 플래너 전용 내 실적 / 정산 뷰 */}
      {viewMode === 'settlement' && (
        <PlannerSettlementDashboard
          plannerId={currentPlannerId}
          events={events}
          venues={venues}
        />
      )}
    </div>
  );
};
