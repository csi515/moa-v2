import React from 'react';
import type { Student } from '@/types';
import type { ParentPortalTab } from '@/types/education';
import type { IndustryType } from '@/core/industry/types';
import { TuitionService } from '@/capabilities/finance';
import { ScheduleService } from '@/core/services/scheduleService';
import { formatCurrency } from '@/utils/formatters';
import { SummaryMetricCard } from '@/shared/components';
import { ParentHeroCard, ParentNoticePreview } from './parentHomeShared';
import { getParentHomeWidgetSlot } from '../slots/parentPortalSlots';
import { getSessionStatusLabel } from '@/capabilities/attendance/services/attendanceService';
import { useParentAttendanceSessions } from '@/core/parent/hooks/useParentAttendanceSessions';
import { normalizeIndustryType } from '@/core/industry/types';
import { getCustomerLabel, getPlaceLabel } from '@/core/industry/industryUi';

interface UnifiedPortalHomeProps {
  student: Student;
  organizationId: string;
  readOnly?: boolean;
  onNavigate: (tab: ParentPortalTab) => void;
  industryType?: IndustryType | string;
}

export function UnifiedPortalHome({
  student,
  organizationId,
  readOnly: _readOnly = false,
  onNavigate,
  industryType = 'piano',
}: UnifiedPortalHomeProps) {
  const normIndustry = normalizeIndustryType(industryType);
  const customerLabel = getCustomerLabel(normIndustry);
  const placeLabel = getPlaceLabel(normIndustry);
  const summary = TuitionService.getStudentBillingSummary(student.id);
  const unpaid = summary.grandUnpaid ?? summary.totalUnpaid;

  const { todaySession } = useParentAttendanceSessions(
    organizationId,
    student.id,
    5
  );
  const sessionStatus = getSessionStatusLabel(todaySession);
  const attendanceStatusLabel = sessionStatus ? sessionStatus.label : '미체크';

  const isPassStudent = student.billingMode === 'session_pass';
  const remainingPasses = ScheduleService.getCustomerRemainingSessions(student.id);

  // 업종별 전용 홈 위젯 슬롯 조회
  const CustomHomeWidget = getParentHomeWidgetSlot(normIndustry);

  return (
    <div className="space-y-4">
      {/* 1. 상단 프로필 Hero 카드 */}
      <ParentHeroCard
        student={student}
        subtitle={`${customerLabel} · ${placeLabel}`}
        gradientClass="bg-gradient-to-br from-indigo-600 to-slate-800"
      />

      {/* 2. 핵심 요약 메트릭 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryMetricCard
          label="오늘 출결"
          value={attendanceStatusLabel}
          variant={attendanceStatusLabel === '출석' || attendanceStatusLabel === '등원' ? 'emerald' : 'default'}
          onClick={() => onNavigate('attendance')}
        />
        <SummaryMetricCard
          label={isPassStudent ? '이용권 잔여' : '수강/등록'}
          value={isPassStudent ? `${remainingPasses}회` : '정규'}
          onClick={() => onNavigate(isPassStudent ? 'bookings' : 'tuition')}
        />
        <SummaryMetricCard
          className="col-span-2 sm:col-span-1"
          label="미납액"
          value={formatCurrency(unpaid)}
          variant={unpaid > 0 ? 'rose' : 'default'}
          onClick={() => onNavigate('tuition')}
        />
      </div>

      {/* 3. 업종별 주입 위젯 (피아노 오늘 과제/레슨, 어린이집 알림장/투약, 필라테스 다가오는 예약 등) */}
      {CustomHomeWidget && (
        <CustomHomeWidget
          student={student}
          organizationId={organizationId}
          onNavigate={onNavigate}
          industryType={normIndustry}
        />
      )}

      {/* 4. 공통 알림 미리보기 */}
      <ParentNoticePreview
        student={student}
        organizationId={organizationId}
        onNavigate={onNavigate}
      />
    </div>
  );
}
