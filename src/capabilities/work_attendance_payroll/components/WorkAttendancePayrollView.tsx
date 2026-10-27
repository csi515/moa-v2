import React, { useState } from 'react';
import {
  StaffEmploymentProfile,
  DailyTimecard,
  PayrollSlip,
  verifyAttendanceCheckIn,
  generatePayrollSlip,
  generateBankBulkTransferCsv,
  generateTaxAccountantPayrollLedgerCsv,
  BankFormatCode,
} from '../domain/workAttendancePayrollEngine';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';

function triggerCsvDownload(filename: string, csvContent: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const INITIAL_STAFF_PROFILES: StaffEmploymentProfile[] = [
  {
    staffId: 'staff-1',
    staffName: '김민수 (홀 마스터)',
    employmentType: 'hourly_part_time',
    hourlyRate: 11000,
    contractWeeklyHours: 20,
    enrollSocialInsurance: true,
  },
  {
    staffId: 'staff-2',
    staffName: '이지은 (바리스타/주방)',
    employmentType: 'hourly_part_time',
    hourlyRate: 10500,
    contractWeeklyHours: 25,
    enrollSocialInsurance: true,
  },
  {
    staffId: 'staff-3',
    staffName: '박준호 (주말 알바)',
    employmentType: 'hourly_part_time',
    hourlyRate: 10500,
    contractWeeklyHours: 12, // 15시간 미만 초단시간
    enrollSocialInsurance: false,
  },
  {
    staffId: 'staff-4',
    staffName: '최팀장 (매니저)',
    employmentType: 'salaried_regular',
    hourlyRate: 15000,
    baseSalaryMonthly: 3000000,
    contractWeeklyHours: 40,
    enrollSocialInsurance: true,
  },
];

const INITIAL_TIMECARDS: DailyTimecard[] = [
  {
    date: '2026-10-15',
    clockInTime: '09:00',
    clockOutTime: '18:00',
    breakMinutes: 60,
    regularHours: 8.0,
    overtimeHours: 0,
    nightHours: 0,
    totalWorkedHours: 8.0,
  },
  {
    date: '2026-10-15',
    clockInTime: '14:00',
    clockOutTime: '23:00',
    breakMinutes: 60,
    regularHours: 8.0,
    overtimeHours: 0,
    nightHours: 1.0, // 22:00~23:00
    totalWorkedHours: 8.0,
  },
  {
    date: '2026-10-14',
    clockInTime: '10:00',
    clockOutTime: '20:30',
    breakMinutes: 60,
    regularHours: 8.0,
    overtimeHours: 1.5,
    nightHours: 0,
    totalWorkedHours: 9.5,
  },
];

export const WorkAttendancePayrollView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'clock_in' | 'timecards' | 'payroll_slips'>('clock_in');
  const [staffList] = useState<StaffEmploymentProfile[]>(INITIAL_STAFF_PROFILES);
  const [timecards] = useState<DailyTimecard[]>(INITIAL_TIMECARDS);

  // 실시간 출근 상태 모의 (김민수, 최팀장 출근 중)
  const [clockedInStaffIds, setClockedInStaffIds] = useState<string[]>(['staff-1', 'staff-4']);
  const [selectedStaffForSlip, setSelectedStaffForSlip] = useState<PayrollSlip | null>(null);

  // 현장 Wi-Fi/GPS 가상 시뮬레이션 상태
  const [mockWifiConnected, setMockWifiConnected] = useState(true);
  const [authStatusMessage, setAuthStatusMessage] = useState('매장 Wi-Fi (Moa_Store_5G) 정상 연결됨 (출퇴근 인증 가능)');

  // 출퇴근 토글
  const handleToggleClock = (staffId: string) => {
    const isClockedIn = clockedInStaffIds.includes(staffId);
    const auth = verifyAttendanceCheckIn({
      storeWifiBssid: 'AA:BB:CC:11:22:33',
      staffWifiBssid: mockWifiConnected ? 'AA:BB:CC:11:22:33' : 'XX:YY:ZZ:99:88:77',
    });

    if (!auth.isAuthenticated) {
      alert(`⚠️ 출퇴근 인증 실패: 매장 전용 Wi-Fi에 연결되어 있지 않거나 GPS 반경 밖입니다.`);
      return;
    }

    if (isClockedIn) {
      setClockedInStaffIds(clockedInStaffIds.filter((id) => id !== staffId));
      alert(`퇴근 처리가 완료되었습니다. (휴게시간 및 실근로시간 타임카드에 자동 기록)`);
    } else {
      setClockedInStaffIds([...clockedInStaffIds, staffId]);
      alert(`출근 인증이 성공적으로 기록되었습니다. (매장 Wi-Fi 인증 확인)`);
    }
  };

  const org = useOptionalOrganization();
  const orgName = org?.currentOrganization?.name || '사업장';
  const [selectedBank, setSelectedBank] = useState<BankFormatCode>('KB');

  // 급여명세서 사전 계산 목록 생성 (비과세 식대 20만, 자가운전 20만 한도 소득공제 적용)
  const payrollSlips: PayrollSlip[] = staffList.map((staff) => {
    // 4주 주차별 근무시간 가상 분배
    const weeklyHours =
      staff.employmentType === 'salaried_regular'
        ? [40, 40, 40, 40]
        : staff.contractWeeklyHours >= 20
        ? [22, 21, 20, 24]
        : [12, 10, 14, 12];

    const overtime = staff.employmentType === 'salaried_regular' ? 4 : 2;
    const night = staff.employmentType === 'salaried_regular' ? 0 : 3;

    // 식대 20만원 전 직원 비과세 기본 지급, 정규직 매니저는 자가운전 20만원 추가
    const allowances = {
      mealAllowance: 200000,
      drivingAllowance: staff.employmentType === 'salaried_regular' ? 200000 : 0,
    };

    const slip = generatePayrollSlip(staff, '2026-10', weeklyHours, overtime, night, allowances);
    slip.bankName = staff.staffId === 'staff-1' ? '국민은행' : staff.staffId === 'staff-2' ? '신한은행' : '기업은행';
    slip.accountNumber = `110-${staff.staffId.replace('staff-', '')}92-882910`;
    return slip;
  });

  const handleDownloadTaxLedgerCsv = () => {
    const csv = generateTaxAccountantPayrollLedgerCsv(payrollSlips, {
      organizationName: orgName,
      periodYearMonth: '2026-10',
    });
    triggerCsvDownload(`급여대장_세무사회계사제출용_2026-10_${orgName}.csv`, csv);
  };

  const handleDownloadBankTransferCsv = () => {
    const entries = payrollSlips.map((s) => ({
      staffId: s.staffId,
      staffName: s.staffName,
      bankName: s.bankName || '국민은행',
      accountNumber: s.accountNumber || '123-456-789012',
      amount: s.netPay,
      memo: '10월급여',
    }));
    const csv = generateBankBulkTransferCsv(entries, selectedBank);
    triggerCsvDownload(`급여대량이체_${selectedBank}_2026-10_${orgName}.csv`, csv);
  };

  const totalMonthlyPayroll = payrollSlips.reduce((sum, s) => sum + s.statutoryPay.totalGrossPay, 0);
  const totalWeeklyHolidaySum = payrollSlips.reduce((sum, s) => sum + s.statutoryPay.weeklyHolidayPay, 0);
  const totalWorkedHoursSum = payrollSlips.reduce((sum, s) => sum + s.statutoryPay.totalWorkedHours, 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
            직원 근태 & 법정 급여명세서 (Time & Attendance Payroll)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            매장 Wi-Fi/GPS 출퇴근 인증, 근로기준법상 주 15시간 주휴수당, 연장/야간 가산 및 전자 급여명세서 자동 발행
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: mockWifiConnected ? '#10b981' : '#ef4444' }} />
          <span style={{ color: '#374151', fontWeight: 500 }}>{authStatusMessage}</span>
          <button
            onClick={() => {
              const next = !mockWifiConnected;
              setMockWifiConnected(next);
              setAuthStatusMessage(next ? '매장 Wi-Fi (Moa_Store_5G) 정상 연결됨' : '외부 네트워크 연결 (인증 차단 시뮬레이션)');
            }}
            style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer' }}
          >
            Wi-Fi 상태 변경
          </button>
        </div>
      </div>

      {/* KPI 카드 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>현재 현장 근무 중</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#059669', marginTop: '6px' }}>
            {clockedInStaffIds.length}명
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            전체 등록 직원 {staffList.length}명 중
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>당월 총 실근무시간</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#111827', marginTop: '6px' }}>
            {totalWorkedHoursSum}시간
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            휴게시간 자동 차감 완료
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>당월 법정 주휴수당 합계</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2563eb', marginTop: '6px' }}>
            {totalWeeklyHolidaySum.toLocaleString()}원
          </div>
          <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
            주 15시간 이상 알바 자동 산출
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
          <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>당월 총 급여 지급 예정액</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#7c3aed', marginTop: '6px' }}>
            {totalMonthlyPayroll.toLocaleString()}원
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            세전 기준 (4대보험 공제 전)
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '20px', gap: '8px' }}>
        {[
          { key: 'clock_in', label: '실시간 출퇴근 태그 (현장 데스크)' },
          { key: 'timecards', label: '근태 타임카드 이력' },
          { key: 'payroll_slips', label: '월간 법정 급여명세서 마감' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              color: activeTab === tab.key ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 1: 실시간 출퇴근 태그 */}
      {activeTab === 'clock_in' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {staffList.map((staff) => {
            const isClockedIn = clockedInStaffIds.includes(staff.staffId);
            return (
              <div
                key={staff.staffId}
                style={{
                  background: '#fff',
                  border: isClockedIn ? '2px solid #10b981' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#111827' }}>{staff.staffName}</h3>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        background: isClockedIn ? '#ecfdf5' : '#f3f4f6',
                        color: isClockedIn ? '#059669' : '#6b7280',
                      }}
                    >
                      {isClockedIn ? '근무 중' : '미출근'}
                    </span>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>
                    <div>구분: {staff.employmentType === 'salaried_regular' ? '정규직 (월급제)' : '파트타임 (시급제)'}</div>
                    <div>시급: <strong>{staff.hourlyRate.toLocaleString()}원</strong></div>
                    <div>계약 근로시간: 주 {staff.contractWeeklyHours}시간 {staff.contractWeeklyHours >= 15 ? '(주휴수당 대상)' : '(주휴 제외)'}</div>
                  </div>
                </div>

                <div style={{ marginTop: '18px' }}>
                  <button
                    onClick={() => handleToggleClock(staff.staffId)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      background: isClockedIn ? '#ef4444' : '#2563eb',
                      color: '#fff',
                    }}
                  >
                    {isClockedIn ? '퇴근 처리 (Clock Out)' : '출근 인증 (Clock In)'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 탭 2: 근태 타임카드 이력 */}
      {activeTab === 'timecards' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '12px 16px' }}>근무일자</th>
                <th style={{ padding: '12px 16px' }}>출근 시각</th>
                <th style={{ padding: '12px 16px' }}>퇴근 시각</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>휴게시간</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>기본근로</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>연장근로(8h 초과)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>야간근로(22~06)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>실근로 합계</th>
              </tr>
            </thead>
            <tbody>
              {timecards.map((tc, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 500, color: '#111827' }}>{tc.date}</td>
                  <td style={{ padding: '14px 16px', color: '#059669', fontWeight: 600 }}>{tc.clockInTime}</td>
                  <td style={{ padding: '14px 16px', color: '#dc2626', fontWeight: 600 }}>{tc.clockOutTime}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#6b7280' }}>{tc.breakMinutes}분</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#374151' }}>{tc.regularHours}h</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: tc.overtimeHours > 0 ? '#d97706' : '#9ca3af', fontWeight: tc.overtimeHours > 0 ? 600 : 400 }}>
                    {tc.overtimeHours}h
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: tc.nightHours > 0 ? '#7c3aed' : '#9ca3af', fontWeight: tc.nightHours > 0 ? 600 : 400 }}>
                    {tc.nightHours}h
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                    {tc.totalWorkedHours}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 탭 3: 월간 법정 급여명세서 마감 */}
      {activeTab === 'payroll_slips' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>2026년 10월 급여 정산 대장</div>
              <div style={{ fontSize: '12px', color: '#059669', marginTop: '2px' }}>
                ✓ 식대(월 20만) 및 자가운전보조금(월 20만) 비과세 소득공제 자동 적용 완료
              </div>
            </div>

            {/* 은행 대량이체 및 세무사 제출용 엑셀 다운로드 버튼 그룹 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value as BankFormatCode)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: 500,
                }}
              >
                <option value="KB">KB국민은행 대량이체 양식</option>
                <option value="SHINHAN">신한은행 대량이체 양식</option>
                <option value="IBK">IBK기업은행 대량이체 양식</option>
                <option value="NH">NH농협은행 대량이체 양식</option>
                <option value="STANDARD">표준 계좌이체 양식</option>
              </select>

              <button
                type="button"
                onClick={handleDownloadBankTransferCsv}
                style={{
                  background: '#059669',
                  color: '#fff',
                  border: 'none',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                📥 급여 대량이체 파일
              </button>

              <button
                type="button"
                onClick={handleDownloadTaxLedgerCsv}
                style={{
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                📄 세무사 제출용 급여대장
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '12px 14px' }}>직원명</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>총 근로시간</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>기본급</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>주휴수당</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>연장·야간</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', color: '#059669' }}>비과세 소득</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>세전 총급여</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', color: '#4b5563' }}>과세 대상액</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>4대보험 등 공제</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>실수령액</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>명세서 교부</th>
              </tr>
            </thead>
            <tbody>
              {payrollSlips.map((slip) => {
                const nonTax = slip.nonTaxable?.totalNonTaxable ?? 0;
                const taxable = slip.taxableGrossPay ?? (slip.statutoryPay.totalGrossPay - nonTax);

                return (
                  <tr key={slip.staffId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{slip.staffName}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {slip.bankName} {slip.accountNumber}
                      </div>
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right' }}>{slip.statutoryPay.totalWorkedHours}시간</td>
                    <td style={{ padding: '14px 14px', textAlign: 'right' }}>{slip.statutoryPay.regularPay.toLocaleString()}원</td>
                    <td style={{ padding: '14px 14px', textAlign: 'right', color: '#2563eb', fontWeight: 600 }}>
                      {slip.statutoryPay.weeklyHolidayPay > 0 ? `${slip.statutoryPay.weeklyHolidayPay.toLocaleString()}원` : '-'}
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right', color: '#d97706' }}>
                      {(slip.statutoryPay.overtimePay + slip.statutoryPay.nightPay).toLocaleString()}원
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                      {nonTax > 0 ? `-${nonTax.toLocaleString()}원` : '-'}
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                      {slip.statutoryPay.totalGrossPay.toLocaleString()}원
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right', color: '#4b5563' }}>
                      {taxable.toLocaleString()}원
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right', color: '#dc2626' }}>
                      -{slip.deductions.totalDeductions.toLocaleString()}원
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right', fontWeight: 'bold', color: '#059669', fontSize: '15px' }}>
                      {slip.netPay.toLocaleString()}원
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedStaffForSlip(slip)}
                        style={{
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        명세서 보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 전자 급여명세서 팝업 모달 */}
      {selectedStaffForSlip && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '500px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                임금명세서 (근로기준법 제48조)
              </h2>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>귀속월: {selectedStaffForSlip.payrollPeriod}</span>
            </div>

            <div style={{ marginTop: '16px', fontSize: '14px', lineHeight: 1.8 }}>
              <div><strong>성명:</strong> {selectedStaffForSlip.staffName}</div>
              <div><strong>근무 형태:</strong> {selectedStaffForSlip.employmentType === 'salaried_regular' ? '정규직' : '단시간 근로자(알바)'}</div>
              <div><strong>통상 시급:</strong> {selectedStaffForSlip.hourlyRate.toLocaleString()}원</div>
            </div>

            {/* 지급 항목 */}
            <div style={{ marginTop: '16px', background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827', marginBottom: '8px' }}>[지급 내역]</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>기본 근로시간 ({selectedStaffForSlip.statutoryPay.totalWorkedHours}h)</span>
                <span>{selectedStaffForSlip.statutoryPay.regularPay.toLocaleString()}원</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#2563eb' }}>
                <span>법정 주휴수당 ({selectedStaffForSlip.statutoryPay.weeklyHolidayHours}h)</span>
                <span>{selectedStaffForSlip.statutoryPay.weeklyHolidayPay.toLocaleString()}원</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#d97706' }}>
                <span>연장가산 (1.5배, {selectedStaffForSlip.statutoryPay.overtimeHours}h)</span>
                <span>{selectedStaffForSlip.statutoryPay.overtimePay.toLocaleString()}원</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7c3aed' }}>
                <span>야간가산 (0.5배, {selectedStaffForSlip.statutoryPay.nightHours}h)</span>
                <span>{selectedStaffForSlip.statutoryPay.nightPay.toLocaleString()}원</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e5e7eb' }}>
                <span>지급액 계 (세전)</span>
                <span>{selectedStaffForSlip.statutoryPay.totalGrossPay.toLocaleString()}원</span>
              </div>
            </div>

            {/* 비과세 소득 공제 내역 */}
            {selectedStaffForSlip.nonTaxable && selectedStaffForSlip.nonTaxable.totalNonTaxable > 0 && (
              <div style={{ marginTop: '12px', background: '#ecfdf5', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#065f46', marginBottom: '8px' }}>[비과세 소득 공제]</div>
                {selectedStaffForSlip.nonTaxable.mealAllowance > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#047857' }}>
                    <span>식대 비과세 (월 최대 20만)</span>
                    <span>{selectedStaffForSlip.nonTaxable.mealAllowance.toLocaleString()}원</span>
                  </div>
                )}
                {selectedStaffForSlip.nonTaxable.drivingAllowance > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#047857' }}>
                    <span>자가운전보조금 비과세 (월 최대 20만)</span>
                    <span>{selectedStaffForSlip.nonTaxable.drivingAllowance.toLocaleString()}원</span>
                  </div>
                )}
                {selectedStaffForSlip.nonTaxable.researchAllowance > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#047857' }}>
                    <span>연구보조비 비과세 (월 최대 20만)</span>
                    <span>{selectedStaffForSlip.nonTaxable.researchAllowance.toLocaleString()}원</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginTop: '4px', borderTop: '1px solid #a7f3d0', paddingTop: '4px', color: '#065f46' }}>
                  <span>과세 대상 급여 (4대보험/소득세 과표)</span>
                  <span>{selectedStaffForSlip.taxableGrossPay?.toLocaleString()}원</span>
                </div>
              </div>
            )}

            {/* 공제 항목 */}
            <div style={{ marginTop: '12px', background: '#fef2f2', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#991b1b', marginBottom: '8px' }}>[공제 내역 (4대보험 및 세금)]</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>국민연금 (4.5%)</span>
                <span>{selectedStaffForSlip.deductions.nationalPension.toLocaleString()}원</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>건강보험 (3.545%)</span>
                <span>{selectedStaffForSlip.deductions.healthInsurance.toLocaleString()}원</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>장기요양보험 (건보의 12.95%)</span>
                <span>{selectedStaffForSlip.deductions.longTermCare.toLocaleString()}원</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>고용보험 (0.9%)</span>
                <span>{selectedStaffForSlip.deductions.employmentInsurance.toLocaleString()}원</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #fecaca', color: '#dc2626' }}>
                <span>공제액 계</span>
                <span>-{selectedStaffForSlip.deductions.totalDeductions.toLocaleString()}원</span>
              </div>
            </div>

            {/* 실수령액 */}
            <div style={{ marginTop: '16px', padding: '12px', background: '#ecfdf5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#065f46' }}>실지급액 (실수령액)</span>
              <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#059669' }}>
                {selectedStaffForSlip.netPay.toLocaleString()}원
              </span>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setSelectedStaffForSlip(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
              >
                닫기
              </button>
              <button
                onClick={() => {
                  alert(`[법정 전자 교부 완료] ${selectedStaffForSlip.staffName}님의 카카오 알림톡/이메일로 임금명세서 PDF가 발송되었습니다.`);
                  setSelectedStaffForSlip(null);
                }}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                명세서 전자 교부
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
