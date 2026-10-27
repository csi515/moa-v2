import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generatePtwAuditCsv } from './safetyWorkPermitExport';
import type { SafetyWorkPermit } from './safetyWorkPermitEngine';

describe('safetyWorkPermitExport test suite', () => {
  it('산업안전보건법 기준 안전작업허가서 3년 보존 감사 CSV를 생성한다', () => {
    const permits: SafetyWorkPermit[] = [
      {
        id: 'ptw-1',
        permitNumber: 'PTW-2026-0001',
        workType: 'hot_work',
        workTitle: '냉각 배관 용접',
        workLocation: '기계실 지하1층',
        workerCount: 3,
        startTime: '2026-04-20T09:00',
        endTime: '2026-04-20T17:00',
        safetyMeasures: { fireExtinguisherChecked: true },
        gasTest: {
          oxygenPercent: 20.9,
          combustibleGasPercent: 0,
          carbonMonoxidePpm: 2,
          hydrogenSulfidePpm: 0,
          testedAt: '2026-04-20T08:50',
          testerName: '안전과장',
        },
        status: 'approved',
        requesterId: 'u-1',
        requesterName: '용접기사',
        safetyManagerName: '안전팀장',
        createdAt: '2026-04-20T08:00:00Z',
      },
    ];

    const csv = generatePtwAuditCsv(permits, '화성 플랜트', 2026);
    assert.ok(csv.startsWith('\uFEFF'), 'UTF-8 BOM 확인');
    assert.match(csv, /산업안전보건법 안전작업허가서/);
    assert.match(csv, /3년간 법적 보존/);
    assert.match(csv, /PTW-2026-0001/);
    assert.match(csv, /소화기비치/);
  });
});
