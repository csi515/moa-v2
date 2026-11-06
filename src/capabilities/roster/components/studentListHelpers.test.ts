import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPianoBillingModeLabel,
  getPianoSessionPassColumnLabel,
  getStudentPassOrMembershipSignal,
  getMonthBillingSignal,
  getTodayAttendanceSignal,
} from './studentListHelpers';
import type { SessionPass } from '@/core/types/schedule';

interface StudentMonthlyBillingSummary {
  studentId: string;
  yearMonth: string;
  tuitionBilled: number;
  tuitionPaid: number;
  materialsBilled: number;
  materialsPaid: number;
  totalBilled: number;
  totalPaid: number;
  totalUnpaid: number;
  tuitionStatus: 'paid' | 'unpaid' | 'partial' | 'overdue' | 'none';
  materialsStatus: 'paid' | 'unpaid' | 'partial' | 'overdue' | 'none';
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'make_up';
  createdAt?: string;
}

describe('studentListHelpers - getStudentPassOrMembershipSignal', () => {
  const dummyStudentSessionPass = {
    id: 'st-session-1',
    billingMode: 'session_pass' as const,
  };

  const dummyStudentMonthly = {
    id: 'st-monthly-1',
    billingMode: 'monthly' as const,
  };

  const dummyStudentDefault = {
    id: 'st-default-1',
  };

  it('회차권 원생: 활성 패스가 있고 잔여 횟수가 1회 이상이면 잔여 N회와 indigo 톤을 반환한다', () => {
    const passes: SessionPass[] = [
      {
        id: 'pass-1',
        organizationId: 'org-1',
        customerId: 'st-session-1',
        name: '피아노 10회권',
        totalSessions: 10,
        usedSessions: 4,
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'pass-2',
        organizationId: 'org-1',
        customerId: 'st-session-1',
        name: '보강 2회권',
        totalSessions: 2,
        usedSessions: 0,
        status: 'active',
        createdAt: '2026-02-01T00:00:00Z',
      },
    ];

    const result = getStudentPassOrMembershipSignal(
      dummyStudentSessionPass,
      passes,
      undefined,
      '2026-11'
    );

    assert.deepEqual(result, {
      label: '잔여 8회',
      tone: 'indigo',
    });
  });

  it('회차권 원생: 패스가 없으면 회차권 없음과 warn 톤을 반환한다', () => {
    const result = getStudentPassOrMembershipSignal(
      dummyStudentSessionPass,
      [],
      undefined,
      '2026-11'
    );

    assert.deepEqual(result, {
      label: '회차권 없음',
      tone: 'warn',
    });
  });

  it('회차권 원생: 취소된 패스만 있으면 회차권 없음과 warn 톤을 반환한다', () => {
    const passes: SessionPass[] = [
      {
        id: 'pass-cancelled',
        organizationId: 'org-1',
        customerId: 'st-session-1',
        name: '환불된 패스',
        totalSessions: 10,
        usedSessions: 5,
        status: 'cancelled',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    const result = getStudentPassOrMembershipSignal(
      dummyStudentSessionPass,
      passes,
      undefined,
      '2026-11'
    );

    assert.deepEqual(result, {
      label: '회차권 없음',
      tone: 'warn',
    });
  });

  it('회차권 원생: 잔여 횟수가 0회 이하이면 0회와 warn 톤을 반환한다', () => {
    const passes: SessionPass[] = [
      {
        id: 'pass-exhausted',
        organizationId: 'org-1',
        customerId: 'st-session-1',
        name: '소진된 패스',
        totalSessions: 10,
        usedSessions: 10,
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    const result = getStudentPassOrMembershipSignal(
      dummyStudentSessionPass,
      passes,
      undefined,
      '2026-11'
    );

    assert.deepEqual(result, {
      label: '0회',
      tone: 'warn',
    });
  });

  it('월 정기 원생: 미납액이 있으면 {N}월 정기 (미납)과 warn 톤을 반환한다', () => {
    const billingSummary: StudentMonthlyBillingSummary = {
      studentId: 'st-monthly-1',
      yearMonth: '2026-11',
      tuitionBilled: 150000,
      tuitionPaid: 0,
      materialsBilled: 0,
      materialsPaid: 0,
      totalBilled: 150000,
      totalPaid: 0,
      totalUnpaid: 150000,
      tuitionStatus: 'unpaid',
      materialsStatus: 'none',
    };

    const result = getStudentPassOrMembershipSignal(
      dummyStudentMonthly,
      [],
      billingSummary,
      '2026-11'
    );

    assert.deepEqual(result, {
      label: '11월 정기 (미납)',
      tone: 'warn',
    });
  });

  it('월 정기 원생: 완납 상태이면 {N}월 정기 (완납)과 ok 톤을 반환한다', () => {
    const billingSummary: StudentMonthlyBillingSummary = {
      studentId: 'st-monthly-1',
      yearMonth: '2026-11',
      tuitionBilled: 150000,
      tuitionPaid: 150000,
      materialsBilled: 0,
      materialsPaid: 0,
      totalBilled: 150000,
      totalPaid: 150000,
      totalUnpaid: 0,
      tuitionStatus: 'paid',
      materialsStatus: 'none',
    };

    const result = getStudentPassOrMembershipSignal(
      dummyStudentMonthly,
      [],
      billingSummary,
      '2026-11'
    );

    assert.deepEqual(result, {
      label: '11월 정기 (완납)',
      tone: 'ok',
    });
  });

  it('월 정기 원생: 청구 내역이 없거나 billingSummary가 없으면 {N}월 정기와 muted 톤을 반환한다', () => {
    const resultWithoutSummary = getStudentPassOrMembershipSignal(
      dummyStudentDefault,
      [],
      undefined,
      '2026-05'
    );

    assert.deepEqual(resultWithoutSummary, {
      label: '5월 정기',
      tone: 'muted',
    });

    const emptyBillingSummary: StudentMonthlyBillingSummary = {
      studentId: 'st-default-1',
      yearMonth: '2026-05',
      tuitionBilled: 0,
      tuitionPaid: 0,
      materialsBilled: 0,
      materialsPaid: 0,
      totalBilled: 0,
      totalPaid: 0,
      totalUnpaid: 0,
      tuitionStatus: 'none',
      materialsStatus: 'none',
    };

    const resultWithEmptyBilled = getStudentPassOrMembershipSignal(
      dummyStudentDefault,
      [],
      emptyBillingSummary,
      '2026-05'
    );

    assert.deepEqual(resultWithEmptyBilled, {
      label: '5월 정기',
      tone: 'muted',
    });
  });
});

describe('studentListHelpers - legacy & existing helpers', () => {
  it('getPianoBillingModeLabel: session_pass이면 회차권, 아니면 일반을 반환한다', () => {
    assert.equal(getPianoBillingModeLabel({ billingMode: 'session_pass' }), '회차권');
    assert.equal(getPianoBillingModeLabel({ billingMode: 'monthly' }), '일반');
    assert.equal(getPianoBillingModeLabel({}), '일반');
  });

  it('getPianoSessionPassColumnLabel: 회차권이 없으면 해당 없음, 있으면 남은 N회를 반환한다', () => {
    assert.equal(getPianoSessionPassColumnLabel('st-1', []), '해당 없음');

    const passes: SessionPass[] = [
      {
        id: 'p1',
        organizationId: 'org-1',
        customerId: 'st-1',
        name: '패스',
        totalSessions: 10,
        usedSessions: 6,
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];
    assert.equal(getPianoSessionPassColumnLabel('st-1', passes), '남은 4회');
  });

  it('getMonthBillingSignal: 미납/완납/청구없음 신호를 적절한 톤으로 반환한다', () => {
    assert.deepEqual(getMonthBillingSignal(undefined), { label: '-', tone: 'muted' });

    assert.deepEqual(
      getMonthBillingSignal({
        studentId: 's1',
        yearMonth: '2026-11',
        tuitionBilled: 100000,
        tuitionPaid: 0,
        materialsBilled: 0,
        materialsPaid: 0,
        totalBilled: 100000,
        totalPaid: 0,
        totalUnpaid: 100000,
        tuitionStatus: 'unpaid',
        materialsStatus: 'none',
      }),
      { label: '미납 ₩100,000', tone: 'warn' }
    );
  });

  it('getTodayAttendanceSignal: 출석 기록 상태에 맞는 신호와 톤을 반환한다', () => {
    const map = new Map<string, AttendanceRecord>();
    assert.deepEqual(getTodayAttendanceSignal('st-unknown', map), {
      label: '미체크',
      tone: 'muted',
    });

    map.set('st-1', {
      id: 'att-1',
      studentId: 'st-1',
      date: '2026-11-06',
      status: 'present',
      createdAt: '2026-11-06T09:00:00Z',
    });
    assert.deepEqual(getTodayAttendanceSignal('st-1', map), {
      label: '출석',
      tone: 'ok',
    });
  });
});
