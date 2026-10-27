import type { SafetyWorkPermit } from './safetyWorkPermitEngine';

/**
 * 산업안전보건법 및 산업안전보건기준에 관한 규칙 제241조의2
 * 안전작업허가서(PTW) 법적 3년 보존 감사용 CSV 생성기
 */
export function generatePtwAuditCsv(
  permits: SafetyWorkPermit[],
  orgName = '사업장',
  year = new Date().getFullYear()
): string {
  const headers = [
    '허가서번호',
    '작업구분',
    '작업제목',
    '작업장소',
    '시공업체명',
    '작업인원(명)',
    '작업시작일시',
    '작업종료일시',
    '산소농도(%)',
    '가연성가스(LEL%)',
    '일산화탄소(ppm)',
    '황화수소(ppm)',
    '필수안전조치',
    '허가상태',
    '신청자',
    '안전승인자',
    '신청일시',
  ];

  const rows = permits.map((p) => {
    const measures: string[] = [];
    if (p.safetyMeasures.fireExtinguisherChecked) measures.push('소화기비치');
    if (p.safetyMeasures.ventilationChecked) measures.push('환기팬가동');
    if (p.safetyMeasures.harnessWorn) measures.push('안전대착용');
    if (p.safetyMeasures.lockOutTagOut) measures.push('LOTO잠금');

    return [
      `"${p.permitNumber}"`,
      `"${p.workType}"`,
      `"${p.workTitle.replace(/"/g, '""')}"`,
      `"${p.workLocation.replace(/"/g, '""')}"`,
      `"${(p.contractorName || '-').replace(/"/g, '""')}"`,
      p.workerCount,
      `"${p.startTime}"`,
      `"${p.endTime}"`,
      p.gasTest?.oxygenPercent ?? '-',
      p.gasTest?.combustibleGasPercent ?? '-',
      p.gasTest?.carbonMonoxidePpm ?? '-',
      p.gasTest?.hydrogenSulfidePpm ?? '-',
      `"${measures.join('/') || '일반'}"`,
      `"${p.status}"`,
      `"${p.requesterName}"`,
      `"${p.safetyManagerName || '-'}"`,
      `"${p.createdAt}"`,
    ].join(',');
  });

  const titleRow = `"산업안전보건법 안전작업허가서(PTW) 법적 감사 대장 (${year} 사업연도 - ${orgName})"`;
  const noticeRow = '"* 본 대장은 산업안전보건법에 따라 3년간 법적 보존 의무가 있습니다."';

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
