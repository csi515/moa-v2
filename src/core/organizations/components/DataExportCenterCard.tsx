import React, { useState } from 'react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import { exportTableToCsv, type CsvColumn } from '@/core/utils/exportTableToCsv';
import { interceptExportWithAudit } from '@/core/audit/auditExportInterceptor';
import { SettingsCard } from '@/shared/components/ui';
import {
  FileSpreadsheet,
  Download,
  Users,
  CheckSquare,
  CreditCard,
  MessageSquareText,
  Zap,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

type StudentItem = ReturnType<typeof StorageService.getStudents>[number];
type AttendanceItem = ReturnType<typeof StorageService.getAttendance>[number];
type InvoiceItem = ReturnType<typeof StorageService.getInvoices>[number];
type ConsultationItem = ReturnType<typeof StorageService.getConsultations>[number];

export interface DataExportCenterCardProps {
  placeLabel?: string;
  customerLabel?: string;
  feeLabel?: string;
}

export const DataExportCenterCard: React.FC<DataExportCenterCardProps> = ({
  placeLabel = '학원',
  customerLabel = '원생',
  feeLabel = '수강료',
}) => {
  const { showToast } = useApp();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id || 'local-org';

  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. 원생 명부 대장 내보내기
  const exportStudents = async (): Promise<number> => {
    const students = StorageService.getStudents();
    const columns: CsvColumn<StudentItem>[] = [
      { header: `${customerLabel}명`, key: 'name' },
      {
        header: '상태',
        formatter: (s) => (s.status === 'active' ? '재원' : s.status === 'leave' ? '휴원' : '퇴원'),
      },
      { header: '연락처', formatter: (s) => s.phone || '' },
      { header: '생년월일', formatter: (s) => s.birthDate || '' },
      {
        header: '성별',
        formatter: (s) => (s.gender === 'M' ? '남' : s.gender === 'F' ? '여' : ''),
      },
      {
        header: '학교/학년',
        formatter: (s) => `${s.school || ''} ${s.grade || ''}`.trim(),
      },
      { header: '보호자명', formatter: (s) => s.parentName || '' },
      { header: '보호자연락처', formatter: (s) => s.parentPhone || '' },
      { header: '보호자관계', formatter: (s) => (s as any).parentRelationship || '보호자' },
      { header: '등록일자', formatter: (s) => s.joinDate || s.createdAt || '' },
      { header: '특이사항 및 메모', formatter: (s) => s.specialNotes || s.memo || '' },
    ];

    await interceptExportWithAudit(
      {
        organizationId: orgId,
        entityType: 'customer',
        action: 'customer_roster_excel_export',
        metadata: { count: students.length, target: 'students' },
      },
      () => {
        exportTableToCsv(`${placeLabel}_${customerLabel}명부대장_${todayStr}`, columns, students);
      }
    );

    return students.length;
  };

  // 2. 출결 기록 대장 내보내기
  const exportAttendance = async (): Promise<number> => {
    const records = StorageService.getAttendance();
    const columns: CsvColumn<AttendanceItem>[] = [
      { header: '출결일자', key: 'date' },
      { header: `${customerLabel}명`, key: 'studentName' },
      { header: '클래스/반', key: 'className' },
      {
        header: '출결상태',
        formatter: (r) => {
          switch (r.status) {
            case 'present':
              return '출석';
            case 'absent':
              return '결석';
            case 'late':
              return '지각';
            case 'early_leave':
              return '조퇴';
            case 'make_up':
              return '보강';
            default:
              return r.status;
          }
        },
      },
      { header: '결석사유', formatter: (r) => r.absentReason || '' },
      { header: '보강예정일', formatter: (r) => r.makeUpDate || '' },
      { header: '메모', formatter: (r) => r.memo || '' },
      { header: '기록자', formatter: (r) => r.createdBy || '' },
      { header: '기록시각', formatter: (r) => r.createdAt || '' },
    ];

    await interceptExportWithAudit(
      {
        organizationId: orgId,
        entityType: 'customer',
        action: 'attendance_records_excel_export',
        metadata: { count: records.length, target: 'attendance' },
      },
      () => {
        exportTableToCsv(`${placeLabel}_출결기록대장_${todayStr}`, columns, records);
      }
    );

    return records.length;
  };

  // 3. 수강료 수납·미납 장부 내보내기
  const exportInvoices = async (): Promise<number> => {
    const invoices = StorageService.getInvoices();
    const columns: CsvColumn<InvoiceItem>[] = [
      { header: '청구월', key: 'yearMonth' },
      { header: `${customerLabel}명`, key: 'studentName' },
      { header: '청구제목', formatter: (inv) => inv.title || `${inv.yearMonth} ${feeLabel}` },
      { header: '청구합계(원)', key: 'totalAmount' },
      { header: '수납금액(원)', key: 'paidAmount' },
      { header: '미납금액(원)', key: 'unpaidAmount' },
      { header: '납부기한', key: 'dueDate' },
      {
        header: '수납상태',
        formatter: (inv) => {
          switch (inv.status) {
            case 'paid':
              return '완납';
            case 'unpaid':
              return '미납';
            case 'partial':
              return '부분수납';
            case 'overdue':
              return '연체';
            default:
              return inv.status;
          }
        },
      },
      { header: '납부일자', formatter: (inv) => inv.paidDate || inv.paidAt || '' },
      { header: '결제수단', formatter: (inv) => inv.paymentMethod || '' },
      { header: '메모', formatter: (inv) => inv.notes || '' },
    ];

    await interceptExportWithAudit(
      {
        organizationId: orgId,
        entityType: 'payment',
        action: 'tuition_invoices_excel_export',
        metadata: { count: invoices.length, target: 'invoices' },
      },
      () => {
        exportTableToCsv(`${placeLabel}_${feeLabel}수납미납장부_${todayStr}`, columns, invoices);
      }
    );

    return invoices.length;
  };

  // 4. 상담 기록 대장 내보내기
  const exportConsultations = async (): Promise<number> => {
    const consultations = StorageService.getConsultations();
    const columns: CsvColumn<ConsultationItem>[] = [
      { header: '상담일자', key: 'date' },
      { header: `${customerLabel}명`, key: 'studentName' },
      { header: '보호자명', key: 'parentName' },
      {
        header: '상담유형',
        formatter: (c) => {
          switch (c.type) {
            case 'parent':
              return '학부모 상담';
            case 'student':
              return '원생 상담';
            case 'career':
              return '진로/입시 상담';
            case 'learning':
              return '학습/진도 상담';
            default:
              return c.type;
          }
        },
      },
      { header: '상담내용', key: 'content' },
      { header: '상담결과', key: 'result' },
      { header: '다음상담일', formatter: (c) => c.nextDate || '' },
      { header: '상담자', key: 'counselorName' },
      { header: '작성시각', formatter: (c) => c.createdAt || '' },
    ];

    await interceptExportWithAudit(
      {
        organizationId: orgId,
        entityType: 'customer',
        action: 'consultation_records_excel_export',
        metadata: { count: consultations.length, target: 'consultations' },
      },
      () => {
        exportTableToCsv(`${placeLabel}_상담기록대장_${todayStr}`, columns, consultations);
      }
    );

    return consultations.length;
  };

  // 개별 파일 내보내기 핸들러
  const handleSingleExport = async (
    key: string,
    label: string,
    exportFn: () => Promise<number>
  ) => {
    setExportingKey(key);
    try {
      const count = await exportFn();
      showToast(`${label} (${count}건) 엑셀 다운로드가 완료되었습니다.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '엑셀 다운로드에 실패했습니다.';
      showToast(msg, 'error');
    } finally {
      setExportingKey(null);
    }
  };

  // 4대 대장 순차 일괄 다운로드
  const handleExportAll = async () => {
    setIsExportingAll(true);
    try {
      showToast('학원 전체 기록 일괄 내보내기를 시작합니다...', 'info');

      // 브라우저 팝업/다운로드 동시 차단 방지를 위한 순차 다운로드
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      await exportStudents();
      await delay(400);

      await exportAttendance();
      await delay(400);

      await exportInvoices();
      await delay(400);

      await exportConsultations();

      showToast(`${placeLabel} 4대 핵심 대장(명부·출결·수납·상담) 다운로드가 모두 완료되었습니다.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '일괄 다운로드 중 오류가 발생했습니다.';
      showToast(msg, 'error');
    } finally {
      setIsExportingAll(false);
    }
  };

  // 실시간 건수 조회
  const studentCount = StorageService.getStudents().length;
  const attendanceCount = StorageService.getAttendance().length;
  const invoiceCount = StorageService.getInvoices().length;
  const consultationCount = StorageService.getConsultations().length;

  return (
    <SettingsCard
      title={`${placeLabel} 데이터 엑셀(CSV) 통합 내보내기 센터`}
      icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          {customerLabel} 명부, 출결 기록, {feeLabel} 수납 장부, 상담 일지를 엑셀(CSV) 파일로 내보냅니다.
          <strong>UTF-8 with BOM</strong>이 적용되어 마이크로소프트 엑셀(Excel)에서 한글 깨짐 없이 즉시 열람할 수 있으며,
          개인정보 보호를 위해 보안 감사 로그(Audit Log)가 안전하게 기록됩니다.
        </p>

        {/* 원클릭 일괄 다운로드 배너 */}
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-indigo-50/50 to-white p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-indigo-600 text-white">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  {placeLabel} 전체 기록 한 번에 일괄 다운로드
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                원생 명부, 출결 내역, 수납 장부, 상담 일지 4개 엑셀 파일을 브라우저에서 순차적으로 즉시 다운로드합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportAll}
              disabled={isExportingAll || exportingKey !== null}
              className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {isExportingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>다운로드 진행 중…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>⚡ 4대 대장 일괄 다운로드</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 개별 대장 다운로드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* 1. 원생 명부 대장 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-800">{customerLabel} 명부 대장</h5>
                <p className="text-[11px] text-slate-400">총 {studentCount}명 등록됨</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSingleExport('students', `${customerLabel} 명부 대장`, exportStudents)}
              disabled={isExportingAll || exportingKey !== null}
              className="px-3 py-2 min-h-[38px] bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingKey === 'students' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>다운로드</span>
            </button>
          </div>

          {/* 2. 출결 기록 대장 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-800">출결 기록 대장</h5>
                <p className="text-[11px] text-slate-400">총 {attendanceCount}건 기록됨</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSingleExport('attendance', '출결 기록 대장', exportAttendance)}
              disabled={isExportingAll || exportingKey !== null}
              className="px-3 py-2 min-h-[38px] bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingKey === 'attendance' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>다운로드</span>
            </button>
          </div>

          {/* 3. 수강료 수납·미납 장부 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-800">{feeLabel} 수납·미납 장부</h5>
                <p className="text-[11px] text-slate-400">총 {invoiceCount}건 청구됨</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSingleExport('invoices', `${feeLabel} 수납·미납 장부`, exportInvoices)}
              disabled={isExportingAll || exportingKey !== null}
              className="px-3 py-2 min-h-[38px] bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingKey === 'invoices' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>다운로드</span>
            </button>
          </div>

          {/* 4. 상담 기록 대장 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <MessageSquareText className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-800">상담 기록 대장</h5>
                <p className="text-[11px] text-slate-400">총 {consultationCount}건 일지</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSingleExport('consultations', '상담 기록 대장', exportConsultations)}
              disabled={isExportingAll || exportingKey !== null}
              className="px-3 py-2 min-h-[38px] bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingKey === 'consultations' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>다운로드</span>
            </button>
          </div>
        </div>

        {/* 보안 안내 배너 */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>개인정보보호법에 따라 다운로드된 엑셀 파일은 안전한 보관 및 관리가 필요합니다.</span>
        </div>
      </div>
    </SettingsCard>
  );
};
