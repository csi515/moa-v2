import React, { useState } from 'react';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import {
  Baby,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Share2,
  CheckCircle2,
  ShieldAlert,
  Car,
  Gift,
  Heart,
} from 'lucide-react';
import type { PublicEventBriefingData } from '@/shared/services/firstBirthdayPlanningService';

interface MobileEventBriefingViewProps {
  data: PublicEventBriefingData;
  onCopyLink?: () => void;
}

export const MobileEventBriefingView: React.FC<MobileEventBriefingViewProps> = ({
  data,
  onCopyLink,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const url = typeof window !== 'undefined' ? window.location.href : `https://moa.app/b/${data.shareToken}`;
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopied(true);
    if (onCopyLink) onCopyLink();
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-12 font-sans text-slate-800 shadow-xl border-x border-slate-200">
      {/* 1. 상단: 아기 첫돌 축하 모바일 히어로 헤더 */}
      <div className="bg-gradient-to-b from-amber-100 via-rose-50 to-slate-50 p-6 text-center space-y-3 pt-8 border-b border-amber-200/50">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-md text-amber-500 mb-1 border border-amber-200">
          <Baby className="w-9 h-9" />
        </div>
        <div>
          <span className="text-xs font-bold text-amber-800 bg-amber-200/60 px-3 py-1 rounded-full uppercase tracking-wider">
            1st Birthday Celebration
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-2">
            {data.babyName} 아기 첫돌 잔치
          </h1>
          <p className="text-xs text-slate-600 mt-1">{data.title}</p>
        </div>

        {/* 카카오톡 브리핑 링크 원클릭 공유 버튼 */}
        <div className="pt-2">
          <Button
            size="sm"
            variant={copied ? 'primary' : 'outline'}
            onClick={handleCopy}
            className="w-full shadow-sm text-xs py-2 flex items-center justify-center gap-1.5 bg-white"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 링크가 복사되었습니다!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-slate-800" /> 카카오톡 브리핑 링크 복사
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. 핵심 시간 안내 (본 행사 & 세팅 입실 시간 분리 시각화) */}
        <Card className="p-4 border-amber-200 bg-white shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Calendar className="w-4 h-4 text-amber-600" /> 행사 일시 및 장소 안내
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60">
              <span className="text-[11px] font-semibold text-amber-900 block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-700" /> 하객 본 행사 시간
              </span>
              <span className="text-sm font-black text-slate-900 mt-0.5 block">
                {data.eventStartTime} ~ {data.eventEndTime}
              </span>
              <span className="text-[10px] text-amber-800">{data.eventDate}</span>
            </div>

            <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/60">
              <span className="text-[11px] font-semibold text-slate-900 block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-slate-700" /> 스태프/플래너 세팅
              </span>
              <span className="text-sm font-black text-indigo-950 mt-0.5 block">
                {data.setupStartTime} 입실 가능
              </span>
              <span className="text-[10px] text-slate-700">철수 완료: {data.teardownEndTime}까지</span>
            </div>
          </div>

          <div className="pt-1 text-xs text-slate-600 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              <strong>{data.venueName}</strong> ({data.roomName})
            </span>
          </div>
        </Card>

        {/* 3. 5단계 식순 진행 시나리오 타임라인 */}
        <Card className="p-4 border-slate-200 bg-white shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Clock className="w-4 h-4 text-slate-800" /> 돌잔치 진행 식순 (5단계 타임라인)
          </h3>

          <div className="space-y-2.5">
            {data.programSteps.map((step) => (
              <div
                key={step.stepOrder}
                className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {step.stepOrder}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">{step.title}</span>
                    <span className="text-[11px] font-mono font-semibold text-slate-800">
                      {step.time}
                    </span>
                  </div>
                  {step.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 4. 외부 반입 품목 체크 요약 */}
        {data.bringingItemsSummary && data.bringingItemsSummary.length > 0 && (
          <Card className="p-4 border-slate-200 bg-white shadow-sm space-y-2">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-rose-500" /> 사전 승인된 반입 물품
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {data.bringingItemsSummary.map((item, idx) => (
                <span
                  key={idx}
                  className="bg-rose-50 text-rose-700 text-[11px] font-semibold px-2 py-0.5 rounded border border-rose-200"
                >
                  ✓ {item}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* 5. 오시는 길 & 주차 안내 */}
        <Card className="p-4 border-slate-200 bg-white shadow-sm space-y-2.5">
          <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Car className="w-4 h-4 text-emerald-600" /> 오시는 길 & 주차 안내
          </h3>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">주소:</span> {data.address}
            </div>
            <div>
              <span className="font-semibold text-slate-800">주차 정보:</span> {data.parkingCapacity}
            </div>
            <div>
              <span className="font-semibold text-slate-800">대중교통:</span> {data.transitNotice}
            </div>
          </div>
        </Card>

        {/* 6. 파티룸 이용 필수 규정 가이드 */}
        {data.venueRules && (
          <Card className="p-4 border-slate-200 bg-slate-50/80 shadow-sm space-y-2 text-xs">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-slate-600" /> 파티룸 이용 규정 및 유의사항
            </h3>
            <ul className="space-y-1 text-[11px] text-slate-600 list-disc list-inside">
              <li>{data.venueRules.wallDecorPolicy}</li>
              <li>{data.venueRules.firePolicy}</li>
              <li>{data.venueRules.outsideFoodPolicy}</li>
              {data.venueRules.corkagePolicy && <li>{data.venueRules.corkagePolicy}</li>}
            </ul>
          </Card>
        )}

        <div className="text-center pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <Heart className="w-3.5 h-3.5 text-rose-400" /> 모아 돌잔치 파트너스 모바일 브리핑
        </div>
      </div>
    </div>
  );
};
