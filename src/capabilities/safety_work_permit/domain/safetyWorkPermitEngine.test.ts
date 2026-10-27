import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessGasSafety,
  canApprovePermit,
  validatePermitTimeWindow,
  type SafetyWorkPermit,
  type GasTestRecord,
} from './safetyWorkPermitEngine';

describe('safetyWorkPermitEngine test suite', () => {
  it('적정 가스 농도 범위(산소 18~23.5%, 가연성<10% LEL, CO<=30, H2S<=10)를 정확히 판정한다', () => {
    const safeGas: GasTestRecord = {
      oxygenPercent: 20.9,
      combustibleGasPercent: 0,
      carbonMonoxidePpm: 5,
      hydrogenSulfidePpm: 0,
      testedAt: '2026-04-20T08:30:00Z',
      testerName: '안전과장',
    };
    const res = assessGasSafety(safeGas);
    assert.equal(res.safe, true);
    assert.equal(res.reasons.length, 0);

    const dangerGas: GasTestRecord = {
      oxygenPercent: 16.5, // 결핍
      combustibleGasPercent: 15, // 폭발 위험
      carbonMonoxidePpm: 50, // 초과
      hydrogenSulfidePpm: 12, // 초과
      testedAt: '2026-04-20T08:30:00Z',
      testerName: '안전과장',
    };
    const dangerRes = assessGasSafety(dangerGas);
    assert.equal(dangerRes.safe, false);
    assert.equal(dangerRes.reasons.length, 4);
  });

  it('화기작업 시 소화기 미비치 상태에서는 승인을 차단한다', () => {
    const permit: SafetyWorkPermit = {
      id: 'ptw-1',
      permitNumber: 'PTW-2026-0001',
      workType: 'hot_work',
      workTitle: '배관 용접 작업',
      workLocation: '제1공장 2층',
      workerCount: 3,
      startTime: '2026-04-20T09:00',
      endTime: '2026-04-20T17:00',
      safetyMeasures: {
        fireExtinguisherChecked: false, // 미비치
      },
      status: 'requested',
      requesterId: 'u-1',
      requesterName: '용접팀장',
      createdAt: '2026-04-20T08:00:00Z',
    };

    const check = canApprovePermit(permit);
    assert.equal(check.allowed, false);
    assert.match(check.reason || '', /소화기/);
  });

  it('밀폐공간 작업 시 가스 측정 적정 확인 후 승인을 허용한다', () => {
    const permit: SafetyWorkPermit = {
      id: 'ptw-2',
      permitNumber: 'PTW-2026-0002',
      workType: 'confined_space',
      workTitle: '지하 맨홀 청소',
      workLocation: '폐수처리장 집수정',
      workerCount: 2,
      startTime: '2026-04-20T10:00',
      endTime: '2026-04-20T12:00',
      safetyMeasures: {
        ventilationChecked: true,
      },
      gasTest: {
        oxygenPercent: 20.8,
        combustibleGasPercent: 0,
        carbonMonoxidePpm: 2,
        hydrogenSulfidePpm: 0,
        testedAt: '2026-04-20T09:50',
        testerName: '안전점검원',
      },
      status: 'gas_tested',
      requesterId: 'u-2',
      requesterName: '환경안전팀',
      createdAt: '2026-04-20T09:00:00Z',
    };

    const check = canApprovePermit(permit);
    assert.equal(check.allowed, true);
  });

  it('최대 유효시간 8시간 초과 시 오류를 반환한다', () => {
    const valid = validatePermitTimeWindow('2026-04-20T09:00', '2026-04-20T17:00', 8);
    assert.equal(valid.valid, true);

    const exceed = validatePermitTimeWindow('2026-04-20T09:00', '2026-04-20T18:00', 8);
    assert.equal(exceed.valid, false);
    assert.match(exceed.error || '', /최대 유효 시간/);
  });
});
