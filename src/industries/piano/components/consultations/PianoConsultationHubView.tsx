import { useState, useMemo, useEffect, type FC } from 'react';
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Filter,
  GraduationCap,
  MessageSquareText,
  Phone,
  Plus,
  QrCode,
  Search,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { PageHeader, PaginationBar } from '@/shared/components';
import { Modal } from '@/shared/components/ui/Modal';
import { AvailabilitySettingsView } from '@/capabilities/scheduling/availability';
import { ConsultationQrModal } from '@/core/schedules/components/ConsultationQrModal';
import { CreateConsultationScheduleModal } from '@/core/schedules/components/CreateConsultationScheduleModal';
import { ConsultationRecordModal } from '@/capabilities/consultation';
import { StudentFormModal } from '@/capabilities/roster';
import { mapConsultationToStudentDraft } from '@/capabilities/consultation/utils/consultationStudentMapper';
import {
  usePianoConsultationHub,
  formatConsultationSchedule,
  getUnifiedStatusBadge,
  type ConsultationFilterStatus,
  type UnifiedConsultationRow,
} from './usePianoConsultationHub';

/**
 * 피아노 통합 상담 대장 테이블 뷰 (Unified Consultation Table)
 * - 4개 파편화 탭 폐지 -> 단일 통합 상담 대장
 * - 원스톱 모달 상담 일지 기록 및 원생 전환 지원
 */
export const PianoConsultationHubView: FC = () => {
  const [showQr, setShowQr] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  // 상담 기록 모달 상태
  const [recordModalRow, setRecordModalRow] = useState<UnifiedConsultationRow | null>(null);

  // 원생 등록 모달 상태
  const [registeringRow, setRegisteringRow] = useState<UnifiedConsultationRow | null>(null);

  const {
    currentOrganization,
    isScoped,
    filteredRows,
    loadingAll,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    summaryCounts,
    confirmRow,
    isConfirmingId,
    refreshConsultations,
  } = usePianoConsultationHub();

  const orgName = currentOrganization?.name || '사업장';
  const publicCode = currentOrganization?.public_code;
  const showOwnerTools = !isScoped;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleOpenRecord = (row: UnifiedConsultationRow) => {
    setRecordModalRow(row);
  };

  const handleCloseRecord = () => {
    setRecordModalRow(null);
  };

  const handleOpenRegister = (row: UnifiedConsultationRow) => {
    setRegisteringRow(row);
  };

  const handleCloseRegister = () => {
    setRegisteringRow(null);
  };

  return (
    <div className="space-y-4 pb-6">
      {/* 1. 페이지 헤더 */}
      <PageHeader
        density="compact"
        icon={<MessageSquareText className="w-6 h-6" />}
        title="상담 관리"
        description="상담 문의 접수, 예약 일정, 대기/확정 관리 및 상담 일지 원스톱 대장"
        actions={
          showOwnerTools && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(true)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title="학부모가 온라인으로 예약할 수 있는 요일과 시간대를 설정합니다."
              >
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">예약 가능 시간대</span>
                <span className="sm:hidden">가능시간</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQr(true)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title="학부모에게 전송하거나 블로그/인스타에 올리는 예약 링크 및 QR 코드"
              >
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">학부모 예약 링크·QR</span>
                <span className="sm:hidden">예약 링크·QR</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreateSchedule(true)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>+ 직접 상담 등록</span>
              </button>
            </div>
          )
        }
      />

      {/* 2. 상단 요약 뱃지 칩 (원클릭 필터 전환) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'TODAY' ? 'ALL' : 'TODAY')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'TODAY'
              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold flex items-center gap-1.5 ${
                filterStatus === 'TODAY' ? 'text-amber-100' : 'text-slate-500'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              오늘 예정
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-extrabold ${
                filterStatus === 'TODAY' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              당일
            </span>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black">
            {summaryCounts.todayCount}
            <span className="text-xs font-medium ml-1">건</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'PENDING'
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold flex items-center gap-1.5 ${
                filterStatus === 'PENDING' ? 'text-indigo-100' : 'text-slate-500'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              대기 문의
            </span>
            {summaryCounts.pendingCount > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-extrabold ${
                  filterStatus === 'PENDING' ? 'bg-indigo-700 text-white' : 'bg-amber-100 text-amber-800'
                }`}
              >
                확인 필요
              </span>
            )}
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black">
            {summaryCounts.pendingCount}
            <span className="text-xs font-medium ml-1">건</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'CONFIRMED' ? 'ALL' : 'CONFIRMED')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'CONFIRMED'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold flex items-center gap-1.5 ${
                filterStatus === 'CONFIRMED' ? 'text-emerald-100' : 'text-slate-500'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              예약 확정
            </span>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black">
            {summaryCounts.confirmedCount}
            <span className="text-xs font-medium ml-1">건</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'COMPLETED'
              ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold flex items-center gap-1.5 ${
                filterStatus === 'COMPLETED' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              기록 완료
            </span>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black">
            {summaryCounts.completedCount}
            <span className="text-xs font-medium ml-1">건</span>
          </div>
        </button>
      </div>

      {/* 3. 검색 및 필터 바 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="신청자, 원생 이름, 연락처, 희망 과정 검색..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none min-h-[44px]"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ConsultationFilterStatus)}
            className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none min-h-[44px] shrink-0"
          >
            <option value="ALL">전체 상태</option>
            <option value="TODAY">오늘 상담</option>
            <option value="PENDING">대기 문의</option>
            <option value="CONFIRMED">예약 확정</option>
            <option value="COMPLETED">상담 완료</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium shrink-0 self-end sm:self-center">
          총 <strong className="text-indigo-600 font-bold">{filteredRows.length}</strong>건 조회됨
        </div>
      </div>

      {/* 4. 메인 통합 상담 대장 테이블 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xs">
        {loadingAll ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Clock className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
            <p className="text-xs font-semibold">통합 상담 대장을 불러오는 중입니다...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">조회된 상담 내역이 없습니다</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery || filterStatus !== 'ALL'
                  ? '검색어나 필터 조건을 변경해 보세요.'
                  : '상담 QR이나 예약 링크를 통해 새 상담 문의를 접수해 보세요.'}
              </p>
            </div>
            {(searchQuery || filterStatus !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus('ALL');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
              >
                전체 목록 보기
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 데스크톱 전용 7열 테이블 뷰 */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 pl-5 pr-3">상담 일시</th>
                  <th className="py-3.5 px-3">상태</th>
                  <th className="py-3.5 px-3">고객명 (대상)</th>
                  <th className="py-3.5 px-3">연락처</th>
                  <th className="py-3.5 px-3">희망 과정 / 유형</th>
                  <th className="py-3.5 px-3 text-center">상담 기록</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedRows.map((row) => {
                  const scheduleInfo = formatConsultationSchedule(row.scheduledAt);
                  const statusBadge = getUnifiedStatusBadge(row.status);
                  const isConfirming = isConfirmingId === row.id;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      {/* 1. 상담 일시 */}
                      <td className="py-3.5 pl-5 pr-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className={`w-3.5 h-3.5 ${scheduleInfo.isToday ? 'text-amber-500' : 'text-slate-400'}`} />
                          <span
                            className={
                              scheduleInfo.isToday
                                ? 'font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md'
                                : 'font-semibold text-slate-700'
                            }
                          >
                            {scheduleInfo.display}
                          </span>
                        </div>
                      </td>

                      {/* 2. 상태 뱃지 */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${statusBadge.badgeClass}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* 3. 고객명 (대상) */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {row.applicantName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {row.applicantName}
                              {row.isRegisteredStudent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold">
                                  원생
                                </span>
                              )}
                            </div>
                            {row.studentName && row.studentName !== row.applicantName && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                대상: <span className="font-semibold text-slate-700">{row.studentName}</span>
                                {row.relationship && ` (${row.relationship})`}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. 연락처 */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 font-mono">
                        {row.phone ? (
                          <a
                            href={`tel:${row.phone}`}
                            className="inline-flex items-center gap-1 hover:text-indigo-600"
                            title="전화 걸기"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{row.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* 5. 희망 과정 / 유형 */}
                      <td className="py-3.5 px-3 max-w-[200px]">
                        <span className="font-semibold text-slate-800 line-clamp-1">
                          {row.coursePreference}
                        </span>
                        {row.notes && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5" title={row.notes}>
                            {row.notes}
                          </p>
                        )}
                      </td>

                      {/* 6. 상담 기록 작성 / 조회 */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {row.hasRecord ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRecord(row)}
                            className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>기록 보기/수정</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenRecord(row)}
                            className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:text-indigo-600 text-slate-600 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5 text-indigo-600" />
                            <span>+ 기록 작성</span>
                          </button>
                        )}
                      </td>

                      {/* 7. 작업 (확정 / 원생 등록) */}
                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {row.status === 'pending' && (
                            <button
                              type="button"
                              disabled={isConfirming}
                              onClick={() => confirmRow(row)}
                              className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isConfirming ? '처리 중' : '확정'}</span>
                            </button>
                          )}

                          {!row.isRegisteredStudent ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRegister(row)}
                              className="px-2.5 py-1.5 min-h-[36px] rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="신규 원생으로 등록"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>원생 등록</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium px-2 py-1">
                              등록 완료
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 모바일 전용 반응형 상담 카드 리스트 (가로 스크롤 완전 제거) */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginatedRows.map((row) => {
              const scheduleInfo = formatConsultationSchedule(row.scheduledAt);
              const statusBadge = getUnifiedStatusBadge(row.status);
              const isConfirming = isConfirmingId === row.id;

              return (
                <div key={row.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/60 transition-colors">
                  {/* 1. 상단: 고객 정보 & 상태 뱃지 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
                        {row.applicantName.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {row.applicantName}
                          </span>
                          {row.isRegisteredStudent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold">
                              원생
                            </span>
                          )}
                        </div>
                        {row.studentName && row.studentName !== row.applicantName && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            대상: <span className="font-semibold text-slate-700">{row.studentName}</span>
                            {row.relationship && ` (${row.relationship})`}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${statusBadge.badgeClass}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* 2. 일정 및 세부 내용 */}
                  <div className="grid grid-cols-1 gap-1.5 text-xs bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-3.5 h-3.5 shrink-0 ${scheduleInfo.isToday ? 'text-amber-500' : 'text-slate-400'}`} />
                      <span className={scheduleInfo.isToday ? 'font-black text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded' : 'font-semibold text-slate-700'}>
                        {scheduleInfo.display}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-700 font-medium truncate">
                        {row.coursePreference || '과정 미지정'}
                      </span>
                    </div>
                    {row.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`tel:${row.phone}`} className="text-indigo-600 font-mono font-medium hover:underline">
                          {row.phone}
                        </a>
                      </div>
                    )}
                    {row.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 pt-1 border-t border-slate-200/60 line-clamp-2">
                        {row.notes}
                      </p>
                    )}
                  </div>

                  {/* 3. 모바일 하단 액션 버튼 그룹 */}
                  <div className="flex items-center gap-2 pt-1">
                    {row.phone && (
                      <a
                        href={`tel:${row.phone}`}
                        className="min-h-[40px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs inline-flex items-center justify-center gap-1.5 flex-1 transition-colors shadow-2xs"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>전화</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenRecord(row)}
                      className={`min-h-[40px] px-3 rounded-xl border font-bold text-xs inline-flex items-center justify-center gap-1.5 flex-1 transition-colors ${
                        row.hasRecord
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 shadow-2xs'
                      }`}
                    >
                      {row.hasRecord ? <FileText className="w-3.5 h-3.5 text-indigo-600" /> : <Plus className="w-3.5 h-3.5 text-indigo-600" />}
                      <span>{row.hasRecord ? '기록 보기' : '+ 일지 기록'}</span>
                    </button>
                    {row.status === 'pending' && (
                      <button
                        type="button"
                        disabled={isConfirming}
                        onClick={() => confirmRow(row)}
                        className="min-h-[40px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1 flex-1 shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isConfirming ? '처리 중' : '확정'}</span>
                      </button>
                    )}
                    {!row.isRegisteredStudent ? (
                      <button
                        type="button"
                        onClick={() => handleOpenRegister(row)}
                        className="min-h-[40px] px-3 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-xs inline-flex items-center justify-center gap-1 flex-1 shadow-2xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>원생 등록</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium px-2 py-1 text-center flex-1">
                        등록 완료
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalItems={filteredRows.length}
        pageSize={pageSize}
        pageSizeOptions={[10, 15, 30]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      {/* 상담 기록 팝업 모달 (Task 3) */}
      {recordModalRow && (
        <ConsultationRecordModal
          isOpen={Boolean(recordModalRow)}
          onClose={handleCloseRecord}
          onSaved={() => {
            void refreshConsultations();
          }}
          onPromoteToStudent={(draft) => {
            setRegisteringRow(draft as any);
          }}
          initialData={{
            id: recordModalRow.consultationRecord?.id,
            studentId: recordModalRow.registeredStudentId,
            studentName: recordModalRow.studentName || recordModalRow.applicantName,
            parentName: recordModalRow.applicantName,
            phone: recordModalRow.phone,
            date: recordModalRow.consultationRecord?.date || recordModalRow.scheduledAt?.slice(0, 10),
            type: recordModalRow.consultationRecord?.type,
            content: recordModalRow.consultationRecord?.content || recordModalRow.notes,
            result: recordModalRow.consultationRecord?.result,
            nextDate: recordModalRow.consultationRecord?.nextDate,
          }}
        />
      )}

      {/* 원생 등록 모달 */}
      {registeringRow && (
        <StudentFormModal
          isOpen={Boolean(registeringRow)}
          onClose={handleCloseRegister}
          student={
            (registeringRow as any).specialNotes !== undefined
              ? (registeringRow as any)
              : (mapConsultationToStudentDraft({
                  consultationId: registeringRow.id,
                  studentName: registeringRow.studentName,
                  parentName: registeringRow.applicantName,
                  phone: registeringRow.phone,
                  coursePreference: registeringRow.coursePreference,
                  notes: registeringRow.notes,
                }) as any)
          }
          onSaved={() => {
            void refreshConsultations();
            handleCloseRegister();
          }}
        />
      )}

      {/* 원장 상담 도구 모달 */}
      {showQr && (
        <ConsultationQrModal
          organizationName={orgName}
          publicCode={publicCode}
          onClose={() => setShowQr(false)}
        />
      )}
      {showCreateSchedule && (
        <CreateConsultationScheduleModal
          onClose={() => setShowCreateSchedule(false)}
          onCreated={() => {
            void refreshConsultations();
          }}
        />
      )}

      {/* 상담 가능시간 및 예약 규칙 모달 */}
      {showAvailabilityModal && (
        <Modal
          isOpen={showAvailabilityModal}
          onClose={() => setShowAvailabilityModal(false)}
          title="상담 가능시간 및 예약 규칙 설정"
          description="학부모가 온라인/QR로 상담을 신청할 수 있는 요일별 시간대와 슬롯 간격을 설정합니다."
          maxWidth="2xl"
        >
          <div className="p-4 sm:p-6">
            <AvailabilitySettingsView
              embedded
              title="상담 가능시간"
              defaultSlotTitle="상담"
              defaultSlotMinutes={30}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
