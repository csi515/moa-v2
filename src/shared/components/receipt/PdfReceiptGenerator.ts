/**
 * Moa-v2 Pure Client PDF Receipt Generator (pdf-lib 기반)
 * 
 * 모바일(Capacitor 웹뷰) 및 브라우저에서 인쇄 다이얼로그(window.print) 없이도
 * 깨끗한 벡터 PDF 영수증 문서를 직접 생성하여 다운로드 및 네이티브 공유를 지원합니다.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ReceiptData {
  organizationName: string;
  receiptNumber: string;
  transactionDate: string;
  customerName?: string;
  subtotal: number;
  discountAmount?: number;
  totalPaid: number;
  paymentMethod?: string;
  items?: { name: string; quantity: number; amount: number }[];
}

function toSafeAscii(text: string, fallback: string = ''): string {
  const filtered = text.replace(/[^\x20-\x7E]/g, '').trim();
  return filtered || fallback;
}

/**
 * 영수증 데이터로부터 PDF 바이너리(Uint8Array)를 생성합니다.
 */
export async function generateReceiptPdfBytes(data: ReceiptData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  // 80mm 영수증 크기 (포인트 단위: 226 x 450 pt)
  const page = pdfDoc.addPage([226, 450]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  let y = height - 30;

  // 1. 헤더 (상호명 및 영수증 타이틀)
  const orgTitle = toSafeAscii(data.organizationName, 'Moa Academy');
  page.drawText(orgTitle, {
    x: 20,
    y,
    size: 14,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 16;

  page.drawText('Official Payment Receipt', {
    x: 20,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 20;

  // 구분선
  page.drawLine({
    start: { x: 20, y },
    end: { x: width - 20, y },
    thickness: 0.8,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 15;

  // 2. 거래 메타데이터
  const drawRow = (label: string, val: string, isBold: boolean = false) => {
    const safeVal = toSafeAscii(val, '-');
    page.drawText(label, {
      x: 20,
      y,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    const valFont = isBold ? boldFont : font;
    const textWidth = valFont.widthOfTextAtSize(safeVal, 9);
    page.drawText(safeVal, {
      x: width - 20 - textWidth,
      y,
      size: 9,
      font: valFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 14;
  };

  drawRow('Receipt No:', data.receiptNumber);
  drawRow('Date:', data.transactionDate.slice(0, 10));
  if (data.customerName) {
    drawRow('Customer:', data.customerName);
  }
  drawRow('Payment:', data.paymentMethod || 'Credit Card');
  y -= 8;

  // 3. 결제 금액 요약
  page.drawLine({
    start: { x: 20, y },
    end: { x: width - 20, y },
    thickness: 0.8,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 15;

  drawRow('Subtotal:', `${data.subtotal.toLocaleString()} KRW`);
  if (data.discountAmount) {
    drawRow('Discount:', `-${data.discountAmount.toLocaleString()} KRW`);
  }
  y -= 4;

  // 총 결제금액 (강조)
  page.drawText('Total Paid:', {
    x: 20,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  const totalStr = `${data.totalPaid.toLocaleString()} KRW`;
  const totalWidth = boldFont.widthOfTextAtSize(totalStr, 11);
  page.drawText(totalStr, {
    x: width - 20 - totalWidth,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.2, 0.3, 0.8), // Indigo
  });
  y -= 30;

  // 푸터 안내
  page.drawText('Thank you for your business.', {
    x: 20,
    y,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}

/**
 * 영수증 PDF를 Blob으로 생성합니다.
 */
export async function generateReceiptPdfBlob(data: ReceiptData): Promise<Blob> {
  const bytes = await generateReceiptPdfBytes(data);
  const copy = new Uint8Array(bytes);
  return new Blob([copy.buffer], { type: 'application/pdf' });
}
