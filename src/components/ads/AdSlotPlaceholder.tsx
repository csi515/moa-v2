import React from "react";

export interface AdSlotPlaceholderProps {
  format?: "leaderboard" | "in-feed" | "rectangle" | "mobile-banner";
  className?: string;
  adSlotId?: string; // 추후 애드센스 data-ad-slot 입력용
}

const FORMAT_DIMENSIONS: Record<
  NonNullable<AdSlotPlaceholderProps["format"]>,
  string
> = {
  leaderboard: "h-[90px] sm:h-[100px] w-full max-w-[728px]",
  "in-feed": "h-[120px] sm:h-[140px] w-full max-w-[640px]",
  rectangle: "h-[250px] w-[300px]",
  "mobile-banner": "h-[50px] w-full max-w-[320px]",
};

/**
 * CLS(Cumulative Layout Shift) 0% 보장을 위한 AdSense 사전 예약 슬롯 컴포넌트
 * 규격별 고정 높이와 레이아웃을 선확보하여 광고 로딩 전후 화면 덜컹거림을 방지합니다.
 */
export const AdSlotPlaceholder: React.FC<AdSlotPlaceholderProps> = ({
  format = "in-feed",
  className = "",
  adSlotId,
}) => {
  const dimensionClass = FORMAT_DIMENSIONS[format] || FORMAT_DIMENSIONS["in-feed"];

  return (
    <div
      className={`mx-auto flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-3 select-none transition-colors ${dimensionClass} ${className}`}
      aria-label="Sponsored Space"
    >
      {/* 
        [Google AdSense Production Unit Template]
        구글 애드센스 승인 완료 시 아래 주석 코드를 활성화하여 교체:
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "100%" }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
          data-ad-slot={adSlotId || "1234567890"}
          data-ad-format={format === "in-feed" ? "fluid" : "auto"}
          data-full-width-responsive="true"
        />
        <script>
          (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      */}
      <div className="flex flex-col items-center justify-center space-y-1">
        <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Sponsored Space
        </span>
        <span className="text-xs font-medium text-slate-500">
          파트너스 추천 영역
        </span>
      </div>
    </div>
  );
};
