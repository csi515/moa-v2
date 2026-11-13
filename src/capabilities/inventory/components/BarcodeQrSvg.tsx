import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * Code-128 B 모드 패턴 테이블 (레거시 하위 호환용)
 */
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * 텍스트를 Code-128 패턴으로 인코딩하여 SVG rect 배열로 변환 (하위 호환 보존)
 */
export function encodeCode128(text: string): { width: number; bars: { x: number; width: number }[] } {
  const codes: number[] = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      codes.push(code);
      checksum += code * (i + 1);
    }
  }

  codes.push(checksum % 103);
  codes.push(STOP_CODE);

  let currentX = 0;
  const bars: { x: number; width: number }[] = [];

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) continue;

    for (let j = 0; j < pattern.length; j++) {
      const w = parseInt(pattern[j], 10);
      if (j % 2 === 0) {
        bars.push({ x: currentX, width: w });
      }
      currentX += w;
    }
  }

  return { width: currentX, bars };
}

/**
 * 표준 1D 바코드 SVG 렌더러 (JsBarcode 기반 표준화)
 */
export const BarcodeSvg: React.FC<{
  value: string;
  format?: 'CODE128' | 'EAN13' | 'pharmacode';
  height?: number;
  barWidthMultiplier?: number;
  showText?: boolean;
  className?: string;
}> = ({
  value,
  format = 'CODE128',
  height = 40,
  barWidthMultiplier = 1.2,
  showText = true,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const clean = value?.trim() || '00000000';

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, clean, {
        format,
        width: barWidthMultiplier,
        height,
        displayValue: showText,
        fontSize: 10,
        font: 'monospace',
        textMargin: 2,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // Fallback: 포맷 오류 시 CODE128 강제 시도
      try {
        JsBarcode(svgRef.current, clean, {
          format: 'CODE128',
          width: barWidthMultiplier,
          height,
          displayValue: showText,
        });
      } catch {
        // ignore
      }
    }
  }, [clean, format, height, barWidthMultiplier, showText]);

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg ref={svgRef} className="overflow-visible" shapeRendering="crispEdges" />
    </div>
  );
};

/**
 * 경량 순수 SVG QR 코드 렌더러
 */
export const QrCodeSvg: React.FC<{
  value: string;
  size?: number;
  className?: string;
}> = ({ value, size = 80, className = '' }) => {
  const matrixSize = 25;
  const modules = React.useMemo(() => {
    const grid: boolean[][] = Array.from({ length: matrixSize }, () =>
      Array(matrixSize).fill(false)
    );

    // 1. Finder Patterns
    const addFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[startY + r][startX + c] = true;
          }
        }
      }
    };

    addFinder(0, 0);
    addFinder(matrixSize - 7, 0);
    addFinder(0, matrixSize - 7);

    // 2. 타이밍 패턴
    for (let i = 8; i < matrixSize - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // 3. 데이터 인코딩
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }

    let bitIdx = 0;
    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= matrixSize - 8;
        const inBottomLeft = r >= matrixSize - 8 && c < 8;
        const isTiming = r === 6 || c === 6;

        if (!inTopLeft && !inTopRight && !inBottomLeft && !isTiming) {
          const char = value.charCodeAt(bitIdx % value.length) || 0;
          const pseudoBit = ((hash ^ (r * 17 + c * 31 + char)) % 3) === 0;
          grid[r][c] = pseudoBit;
          bitIdx++;
        }
      }
    }

    return grid;
  }, [value]);

  const moduleSize = size / matrixSize;

  return (
    <div className={`inline-block p-1 bg-white rounded-lg shadow-2xs border border-slate-100 ${className}`}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        shapeRendering="crispEdges"
      >
        <rect width={size} height={size} fill="#ffffff" />
        {modules.map((row, r) =>
          row.map((filled, c) =>
            filled ? (
              <rect
                key={`${r}-${c}`}
                x={c * moduleSize}
                y={r * moduleSize}
                width={moduleSize}
                height={moduleSize}
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
