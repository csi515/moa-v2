import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface GuardianLinkQrDisplayProps {
  url: string;
  label?: string;
  size?: number;
}

/** 보호자 연결 링크 QR 코드 */
export const GuardianLinkQrDisplay: React.FC<GuardianLinkQrDisplayProps> = ({
  url,
  label = 'QR로 연결',
  size = 160,
}) => (
  <div className="flex flex-col items-center gap-2">
    <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
    <div className="p-3 bg-white rounded-xl border border-slate-200">
      <QRCodeSVG value={url} size={size} level="M" includeMargin={false} />
    </div>
    <p className="text-[10px] text-slate-400 text-center break-all max-w-[200px]">{url}</p>
  </div>
);
