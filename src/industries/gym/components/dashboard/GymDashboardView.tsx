import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { IndustryDashboardShell } from '@/core/dashboard/IndustryDashboardShell';
import { useIndustryDashboardMetrics } from '@/core/dashboard/useIndustryDashboardMetrics';
import { useModuleLabels } from '@/core/labels';
import { StorageService } from '@/services/storage';
import { useStorageRefresh } from '@/hooks';
import { Dumbbell } from 'lucide-react';

export const GymDashboardView: FC = () => {
  const { setActiveTab, setSelectedStudentId } = useApp();
  const labels = useModuleLabels();
  const refreshKey = useStorageRefresh();
  const { today, students, checkedInToday, classes } = useIndustryDashboardMetrics();
  const pendingRides = StorageService.getShuttleRideRequests().filter(
    (r) => r.rideDate === today && r.status === 'requested'
  ).length;
  void refreshKey;

  return (
    <IndustryDashboardShell
      icon={<Dumbbell className="w-6 h-6" />}
      iconClassName="text-orange-600"
      title="체육관 대시보드"
      description="회원·출결·차량·수업반 현황"
      today={today}
      students={students}
      checkedInToday={checkedInToday}
      customerSingular={labels.customer.singular}
      customerAddLabel={labels.customer.add}
      recentSectionTitle={`최근 등록 ${labels.customer.singular}`}
      recentEmptyDescription="회원을 등록하고 수업 레벨, 보호자, PIN을 설정하세요."
      attendanceCheckedInLabel="오늘 출입 요약"
      attendanceActiveLabel="재적 회원"
      attendanceButtonLabel="출입 관리 열기"
      accentClassName="text-orange-600"
      accentBorderClassName="border-orange-200 text-orange-700 hover:bg-orange-50"
      accentHoverClassName="hover:border-orange-200 hover:bg-orange-50/30"
      accentButtonClassName="bg-orange-600 hover:bg-orange-700"
      metrics={[
        {
          label: `재적 ${labels.customer.singular}`,
          value: `${students.length}명`,
          variant: 'amber',
          onClick: () => {
            setSelectedStudentId(null);
            setActiveTab('students');
          },
        },
        {
          label: '오늘 입실',
          value: `${checkedInToday}명`,
          variant: 'emerald',
          onClick: () => setActiveTab('attendance'),
        },
        {
          label: '차량 신청',
          value: `${pendingRides}건`,
          variant: 'amber',
          onClick: () => setActiveTab('shuttle'),
        },
        {
          label: '수업반',
          value: `${classes.length}개`,
          onClick: () => setActiveTab('classes'),
        },
      ]}
      onOpenStudents={() => {
        setSelectedStudentId(null);
        setActiveTab('students');
      }}
      onSelectStudent={(studentId) => {
        setSelectedStudentId(studentId);
        setActiveTab('students');
      }}
      onOpenAttendance={() => setActiveTab('attendance')}
    />
  );
};
