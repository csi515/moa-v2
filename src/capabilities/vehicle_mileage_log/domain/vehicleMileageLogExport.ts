import type { VehicleMileageLog } from './vehicleMileageLogEngine';

/**
 * 국세청 법인세법 시행규칙 [별지 제29호의2 서식]
 * 업무용승용차 운행기록부 법적 5년 보존 감사용 CSV 생성기
 */
export function generateNtsMileageCsv(
  logs: VehicleMileageLog[],
  orgName = '사업장',
  fiscalYear = new Date().getFullYear()
): string {
  const headers = [
    '차량번호',
    '운행일자',
    '사용자(성명)',
    '출발지',
    '목적지',
    '주행 전 계기판(km)',
    '주행 후 계기판(km)',
    '총 주행거리(km)',
    '출퇴근용(km)',
    '일반업무용(km)',
    '유류비(원)',
    '통행료(원)',
    '구분',
    '비고',
  ];

  const rows = logs.map((log) => {
    const isCommute = log.tripPurpose === 'commute';
    const isBusiness = log.tripPurpose === 'business';
    const commuteKm = isCommute ? log.distanceKm : 0;
    const businessKm = isBusiness ? log.distanceKm : 0;

    return [
      `"${log.vehiclePlateNumber.replace(/"/g, '""')}"`,
      `"${log.drivingDate}"`,
      `"${log.driverName.replace(/"/g, '""')}"`,
      `"${(log.departurePlace || '').replace(/"/g, '""')}"`,
      `"${(log.destination || '').replace(/"/g, '""')}"`,
      log.startOdometerKm,
      log.endOdometerKm,
      log.distanceKm,
      commuteKm,
      businessKm,
      log.fuelCost || 0,
      log.tollFee || 0,
      isBusiness ? '"일반업무용"' : isCommute ? '"출퇴근용"' : '"기타"',
      `"${(log.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const titleRow = `"국세청 고시 법인세법 시행규칙 [별지 제29호의2 서식] 업무용승용차 운행기록부 (${fiscalYear} 사업연도 - ${orgName})"`;
  const noticeRow = '"* 본 기록부는 법인세법 제27조의2에 따라 5년간 법적 보존 의무가 있습니다."';

  // UTF-8 BOM (\uFEFF) 추가하여 엑셀에서 즉시 한글 정상 표시
  return `\uFEFF${titleRow}\n${noticeRow}\n\n${headers.join(',')}\n${rows.join('\n')}`;
}

/**
 * 브라우저 파일 다운로드 트리거
 */
export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
