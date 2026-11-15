import React, { useState } from 'react';
import { HardDrive, Info, X } from 'lucide-react';

interface LocalStorageNoticeBannerProps {
  /** 모듈 명칭 (예: '청구서/인보이스', '전자계약서', '교대근무 시간표') */
  featureName?: string;
  /** 배너 닫기 허용 여부 (기본 true) */
  dismissible?: boolean;
  className?: string;
}

/**
 * 상용 프로덕션 UX 및 품질 규칙 (3_COMMERCIAL_UX.md 제2조) 준수용 공통 배너.
 * 백엔드 RLS 테이블 마이그레이션 전 로컬 스토리지에 선저장되는 기능의 동작 방식을 사용자에게 정직하게 안내합니다.
 */
export const LocalStorageNoticeBanner: React.FC<LocalStorageNoticeBannerProps> = ({
  featureName,
  dismissible = true,
  className = '',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div
      role="status"
      className={`rounded-2xl border border-amber-200/90 bg-amber-50/70 p-3 sm:p-3.5 flex items-start gap-3 text-amber-950 shadow-2xs ${className}`}
    >
      <div className="p-1 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
        <HardDrive className="w-4 h-4" />
      </div>

      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/90 text-amber-900">
            로컬 브라우저 저장 모드
          </span>
          <span className="font-bold text-amber-900">
            {featureName ? `${featureName} 데이터가 현재 기기에 보존됩니다` : '기기 간 동기화 준비 중'}
          </span>
        </div>
        <p className="text-[11px] text-amber-800/90">
          작성된 내역은 현재 브라우저에 안전하게 보존되며, 다른 직원과의 실시간 클라우드 동기화는 후속 마이그레이션 배포 시 자동 연결됩니다.
        </p>
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="min-h-[44px] min-w-[44px] -mr-1.5 -mt-1.5 flex items-center justify-center rounded-xl text-amber-700/80 hover:text-amber-950 hover:bg-amber-100/60 transition-colors cursor-pointer shrink-0"
          aria-label="알림 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
