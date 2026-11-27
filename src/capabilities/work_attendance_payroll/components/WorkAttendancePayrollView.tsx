import { showToast } from '@/shared/feedback/uiFeedback';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/ui/EmptyState';
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
      showToast('출퇴근 인증 실패: 매장 전용 Wi-Fi에 연결되어 있지 않거나 GPS 반경 밖입니다.', 'warning');
      return;
    }

    if (isClockedIn) {
      setClockedInStaffIds(clockedInStaffIds.filter((id) => id !== staffId));
      showToast('퇴근 처리가 완료되었습니다. (타임카드 자동 기록)', 'success');
    } else {
      setClockedInStaffIds([...clockedInStaffIds, staffId]);
      showToast('출근 인증이 성공적으로 기록되었습니다. (매장 Wi-Fi 확인)', 'success');
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
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            직원 근태 & 법정 급여명세서 (Time & Attendance Payroll)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            매장 Wi-Fi/GPS 출퇴근 인증, 근로기준법상 주 15시간 주휴수당, 연장/야간 가산 및 전자 급여명세서 자동 발행
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${mockWifiConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-slate-700 font-medium">{authStatusMessage}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const next = !mockWifiConnected;
              setMockWifiConnected(next);
              setAuthStatusMessage(next ? '매장 Wi-Fi (Moa_Store_5G) 정상 연결됨' : '외부 네트워크 연결 (인증 차단 시뮬레이션)');
            }}
            className="ml-2"
          >
            Wi-Fi 상태 변경
          </Button>
        </div>
      </div>

      {/* KPI 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">현재 현장 근무 중</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1.5 tabular-nums font-mono">
            {clockedInStaffIds.length}명
          </div>
          <div className="text-xs text-slate-400 mt-1">
            전체 등록 직원 {staffList.length}명 중
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">당월 총 실근무시간</div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums font-mono">
            {totalWorkedHoursSum}시간
          </div>
          <div className="text-xs text-slate-400 mt-1">
            휴게시간 자동 차감 완료
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">당월 법정 주휴수당 합계</div>
          <div className="text-2xl font-bold text-blue-600 mt-1.5 tabular-nums font-mono">
            {totalWeeklyHolidaySum.toLocaleString()}원
          </div>
          <div className="text-xs text-blue-600/80 mt-1">
            주 15시간 이상 알바 자동 산출
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">당월 총 급여 지급 예정액</div>
          <div className="text-2xl font-bold text-blue-600 mt-1.5 tabular-nums font-mono">
            {totalMonthlyPayroll.toLocaleString()}원
          </div>
          <div className="text-xs text-slate-400 mt-1">
            세전 기준 (4대보험 공제 전)
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-slate-200 gap-2">
        {[
          { key: 'clock_in', label: '실시간 출퇴근 태그 (현장 데스크)' },
          { key: 'timecards', label: '근태 타임카드 이력' },
          { key: 'payroll_slips', label: '월간 법정 급여명세서 마감' },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'primary' : 'ghost'}
            size="md"
            onClick={() => setActiveTab(tab.key as any)}
            className="rounded-b-none"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 탭 1: 실시간 출퇴근 태그 */}
      {activeTab === 'clock_in' && (
        staffList.length === 0 ? (
          <EmptyState
            title="등록된 직원이 없습니다."
            description="새로운 직원을 등록하여 출퇴근 인증 및 타임카드를 관리하세요."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {staffList.map((staff) => {
              const isClockedIn = clockedInStaffIds.includes(staff.staffId);
              return (
                <div
                  key={staff.staffId}
                  className={`bg-white rounded-xl p-5 flex flex-col justify-between transition-all ${
                    isClockedIn
                      ? 'border-2 border-emerald-500 shadow-2xs'
                      : 'border border-slate-200 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-slate-900">{staff.staffName}</h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          isClockedIn
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isClockedIn ? '근무 중' : '미출근'}
                      </span>
                    </div>
                    <div className="mt-2.5 text-xs text-slate-600 space-y-1">
                      <div>구분: {staff.employmentType === 'salaried_regular' ? '정규직 (월급제)' : '파트타임 (시급제)'}</div>
                      <div>시급: <strong className="tabular-nums font-mono text-slate-900">{staff.hourlyRate.toLocaleString()}원</strong></div>
                      <div>계약 근로시간: 주 <span className="tabular-nums font-mono">{staff.contractWeeklyHours}</span>시간 {staff.contractWeeklyHours >= 15 ? '(주휴수당 대상)' : '(주휴 제외)'}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <Button
                      variant={isClockedIn ? 'danger' : 'primary'}
                      size="md"
                      onClick={() => handleToggleClock(staff.staffId)}
                      className="w-full"
                    >
                      {isClockedIn ? '퇴근 처리 (Clock Out)' : '출근 인증 (Clock In)'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* 탭 2: 근태 타임카드 이력 */}
      {activeTab === 'timecards' && (
        timecards.length === 0 ? (
          <EmptyState
            title="기록된 타임카드가 없습니다."
            description="직원이 출퇴근을 기록하면 일자별 근로시간 및 야간/연장 시간이 자동으로 산출됩니다."
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">근무일자</th>
                    <th className="px-4 py-3">출근 시각</th>
                    <th className="px-4 py-3">퇴근 시각</th>
                    <th className="px-4 py-3 text-center">휴게시간</th>
                    <th className="px-4 py-3 text-right">기본근로</th>
                    <th className="px-4 py-3 text-right">연장근로(8h 초과)</th>
                    <th className="px-4 py-3 text-right">야간근로(22~06)</th>
                    <th className="px-4 py-3 text-right">실근로 합계</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timecards.map((tc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-slate-900 tabular-nums">{tc.date}</td>
                      <td className="px-4 py-3.5 text-emerald-600 font-semibold tabular-nums font-mono">{tc.clockInTime}</td>
                      <td className="px-4 py-3.5 text-red-600 font-semibold tabular-nums font-mono">{tc.clockOutTime}</td>
                      <td className="px-4 py-3.5 text-center text-slate-500 tabular-nums font-mono">{tc.breakMinutes}분</td>
                      <td className="px-4 py-3.5 text-right text-slate-700 tabular-nums font-mono">{tc.regularHours}h</td>
                      <td className={`px-4 py-3.5 text-right tabular-nums font-mono ${tc.overtimeHours > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                        {tc.overtimeHours}h
                      </td>
                      <td className={`px-4 py-3.5 text-right tabular-nums font-mono ${tc.nightHours > 0 ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                        {tc.nightHours}h
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 tabular-nums font-mono">
                        {tc.totalWorkedHours}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* 탭 3: 월간 법정 급여명세서 마감 */}
      {activeTab === 'payroll_slips' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="font-bold text-base text-slate-900">2026년 10월 급여 정산 대장</div>
              <div className="text-xs text-emerald-700 mt-0.5">
                ✓ 식대(월 20만) 및 자가운전보조금(월 20만) 비과세 소득공제 자동 적용 완료
              </div>
            </div>

            {/* 은행 대량이체 및 세무사 제출용 엑셀 다운로드 버튼 그룹 */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value as BankFormatCode)}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="KB">KB국민은행 대량이체 양식</option>
                <option value="SHINHAN">신한은행 대량이체 양식</option>
                <option value="IBK">IBK기업은행 대량이체 양식</option>
                <option value="NH">NH농협은행 대량이체 양식</option>
                <option value="STANDARD">표준 계좌이체 양식</option>
              </select>

              <Button
                variant="success"
                size="md"
                onClick={handleDownloadBankTransferCsv}
              >
                📥 급여 대량이체 파일
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleDownloadTaxLedgerCsv}
              >
                📄 세무사 제출용 급여대장
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">직원명</th>
                  <th className="px-3.5 py-3 text-right">총 근로시간</th>
                  <th className="px-3.5 py-3 text-right">기본급</th>
                  <th className="px-3.5 py-3 text-right">주휴수당</th>
                  <th className="px-3.5 py-3 text-right">연장·야간</th>
                  <th className="px-3.5 py-3 text-right text-emerald-600">비과세 소득</th>
                  <th className="px-3.5 py-3 text-right">세전 총급여</th>
                  <th className="px-3.5 py-3 text-right text-slate-600">과세 대상액</th>
                  <th className="px-3.5 py-3 text-right">4대보험 등 공제</th>
                  <th className="px-3.5 py-3 text-right">실수령액</th>
                  <th className="px-3.5 py-3 text-center">명세서 교부</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollSlips.map((slip) => {
                  const nonTax = slip.nonTaxable?.totalNonTaxable ?? 0;
                  const taxable = slip.taxableGrossPay ?? (slip.statutoryPay.totalGrossPay - nonTax);

                  return (
                    <tr key={slip.staffId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3.5 py-3.5">
                        <div className="font-bold text-slate-900">{slip.staffName}</div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {slip.bankName} {slip.accountNumber}
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5 text-right tabular-nums font-mono">{slip.statutoryPay.totalWorkedHours}시간</td>
                      <td className="px-3.5 py-3.5 text-right tabular-nums font-mono">{slip.statutoryPay.regularPay.toLocaleString()}원</td>
                      <td className="px-3.5 py-3.5 text-right text-blue-600 font-semibold tabular-nums font-mono">
                        {slip.statutoryPay.weeklyHolidayPay > 0 ? `${slip.statutoryPay.weeklyHolidayPay.toLocaleString()}원` : '-'}
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-amber-600 tabular-nums font-mono">
                        {(slip.statutoryPay.overtimePay + slip.statutoryPay.nightPay).toLocaleString()}원
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-emerald-600 font-semibold tabular-nums font-mono">
                        {nonTax > 0 ? `-${nonTax.toLocaleString()}원` : '-'}
                      </td>
                      <td className="px-3.5 py-3.5 text-right font-semibold text-slate-900 tabular-nums font-mono">
                        {slip.statutoryPay.totalGrossPay.toLocaleString()}원
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-slate-600 tabular-nums font-mono">
                        {taxable.toLocaleString()}원
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-red-600 tabular-nums font-mono">
                        -{slip.deductions.totalDeductions.toLocaleString()}원
                      </td>
                      <td className="px-3.5 py-3.5 text-right font-bold text-emerald-600 text-sm sm:text-base tabular-nums font-mono">
                        {slip.netPay.toLocaleString()}원
                      </td>
                      <td className="px-3.5 py-3.5 text-center">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedStaffForSlip(slip)}
                        >
                          명세서 보기
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 전자 급여명세서 표준 Modal */}
      {selectedStaffForSlip && (
        <Modal
          isOpen={!!selectedStaffForSlip}
          onClose={() => setSelectedStaffForSlip(null)}
          title="임금명세서 (근로기준법 제48조)"
        >
          <div className="space-y-4 text-slate-800 text-xs sm:text-sm">
            <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-100 pb-2">
              <span>사업장: <strong>{orgName}</strong></span>
              <span>귀속월: <strong className="tabular-nums">{selectedStaffForSlip.payrollPeriod}</strong></span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div><strong>성명:</strong> {selectedStaffForSlip.staffName}</div>
              <div><strong>근무 형태:</strong> {selectedStaffForSlip.employmentType === 'salaried_regular' ? '정규직' : '단시간 근로자(알바)'}</div>
              <div><strong>통상 시급:</strong> <span className="tabular-nums font-mono font-bold">{selectedStaffForSlip.hourlyRate.toLocaleString()}원</span></div>
            </div>

            {/* 지급 항목 */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900">[지급 내역]</div>
              <div className="flex justify-between">
                <span>기본 근로시간 ({selectedStaffForSlip.statutoryPay.totalWorkedHours}h)</span>
                <span className="tabular-nums font-mono">{selectedStaffForSlip.statutoryPay.regularPay.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-blue-600 font-medium">
                <span>법정 주휴수당 ({selectedStaffForSlip.statutoryPay.weeklyHolidayHours}h)</span>
                <span className="tabular-nums font-mono">{selectedStaffForSlip.statutoryPay.weeklyHolidayPay.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-amber-600 font-medium">
                <span>연장가산 (1.5배, {selectedStaffForSlip.statutoryPay.overtimeHours}h)</span>
                <span className="tabular-nums font-mono">{selectedStaffForSlip.statutoryPay.overtimePay.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-blue-600 font-medium">
                <span>야간가산 (0.5배, {selectedStaffForSlip.statutoryPay.nightHours}h)</span>
                <span className="tabular-nums font-mono">{selectedStaffForSlip.statutoryPay.nightPay.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-slate-200 text-slate-900">
                <span>지급액 계 (세전)</span>
                <span className="tabular-nums font-mono">{selectedStaffForSlip.statutoryPay.totalGrossPay.toLocaleString()}원</span>
              </div>
            </div>

            {/* 비과세 소득 공제 내역 */}
            {selectedStaffForSlip.nonTaxable && selectedStaffForSlip.nonTaxable.totalNonTaxable > 0 && (
              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 space-y-2 text-emerald-900">
                <div className="font-bold text-emerald-800">[비과세 소득 공제]</div>
                {selectedStaffForSlip.nonTaxable.mealAllowance > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>식대 비과세 (월 최대 20만)</span>
                    <span className="tabular-nums font-mono">{selectedStaffForSlip.nonTaxable.mealAllowance.toLocaleString()}원</span>
                  </div>
                )}
                {selectedStaffForSlip.nonTaxable.drivingAllowance > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>자가운전보조금 비과세 (월 최대 20만)</span>
                    <span className="tabular-nums font-mono">{selectedStaffForSlip.nonTaxable.drivingAllowance.toLocaleString()}원</span>
                  </div>
                )}
                {selectedStaffForSlip.nonTaxable.researchAllowance > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>연구보조비 비과세 (월 최대 20만)</span>
                    <span className="tabular-nums font-mono">{selectedStaffForSlip.nonTaxable.researchAllowance.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-emerald-200 text-emerald-900">
                  <span>과세 대상 급여 (4대보험/소득세 과표)</span>
                  <span className="tabular-nums font-mono">{selectedStaffForSlip.taxableGrossPay?.toLocaleString()}원</span>
                </div>
              </div>
            )}

            {/* 공제 항목 */}
            <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 space-y-2 text-rose-900">
              <div className="font-bold text-rose-800">[공제 내역 (4대보험 및 세금)]</div>
              <div className="flex justify-between text-rose-700">
                <span>국민연금 (4.5%)</span>
                <span className="tabular-nums font-mono">{selectedStaffForSlip.deductions.nationalPension.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>건강보험 (3.545%)</span>
                <span className="tabular-nums font-mono">{selectedStaffForSlip.deductions.healthInsurance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>장기요양보험 (건보의 12.95%)</span>
                <span className="tabular-nums font-mono">{selectedStaffForSlip.deductions.longTermCare.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>고용보험 (0.9%)</span>
                <span className="tabular-nums font-mono">{selectedStaffForSlip.deductions.employmentInsurance.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-rose-200 text-rose-800">
                <span>공제액 계</span>
                <span className="tabular-nums font-mono">-{selectedStaffForSlip.deductions.totalDeductions.toLocaleString()}원</span>
              </div>
            </div>

            {/* 실수령액 */}
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-300 flex justify-between items-center">
              <span className="font-bold text-sm sm:text-base text-emerald-900">실지급액 (실수령액)</span>
              <span className="font-bold text-lg sm:text-xl text-emerald-600 tabular-nums font-mono">
                {selectedStaffForSlip.netPay.toLocaleString()}원
              </span>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedStaffForSlip(null)}
              >
                닫기
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  showToast(`[법정 전자 교부 완료] ${selectedStaffForSlip.staffName}님의 카카오 알림톡/이메일로 임금명세서 PDF가 발송되었습니다.`, 'success');
                  setSelectedStaffForSlip(null);
                }}
              >
                명세서 전자 교부
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
