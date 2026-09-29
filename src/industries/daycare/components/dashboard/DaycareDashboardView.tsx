import type { FC } from 'react';
import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { IndustryDashboardShell } from '@/core/dashboard/IndustryDashboardShell';
import { useIndustryDashboardMetrics } from '@/core/dashboard/useIndustryDashboardMetrics';
import { useModuleLabels } from '@/core/labels';
import { filterParentNotices } from '@/core/notices';
import { StorageService } from '@/services/storage';
import { useStorageRefresh } from '@/hooks';
import { Baby, BookOpen, Megaphone, Pill } from 'lucide-react';
import { findHealthCert, healthCertWarningLabel, isHealthCertWarning } from '@/industries/daycare/care/complianceUtils';
import { buildTodayCareClose } from '@/industries/daycare/care/dailyClose';
import { requestCareFocus } from '@/industries/daycare/care/careFocus';
import { DailyCloseList } from '@/industries/daycare/care/components/DailyCloseList';
import { PickupHandoffPanel } from '@/industries/daycare/care/components/PickupHandoffPanel';

export const DaycareDashboardView: FC = () => {
  const { setActiveTab, setSelectedStudentId } = useApp();
  const labels = useModuleLabels();
  const refreshKey = useStorageRefresh();
  const { today, students, checkedInToday, teachers, classes } = useIndustryDashboardMetrics();
  const todayJournals = useMemo(
    () => StorageService.getCareJournals().filter((j) => j.journalDate === today).length,
    [refreshKey, today]
  );
  const pendingMeds = useMemo(
    () =>
      StorageService.getMedicationRequests().filter(
        (m) => m.requestDate === today && m.status === 'requested'
      ).length,
    [refreshKey, today]
  );
  const healthWarnings = useMemo(() => {
    const certs = StorageService.getStaffHealthCerts();
    return teachers
      .filter((teacher) => teacher.status === 'active')
      .map((teacher) => ({ teacher, cert: findHealthCert(certs, teacher.id) }))
      .filter((item) => isHealthCertWarning(item.cert?.expiresAt));
  }, [refreshKey, teachers]);
  const close = useMemo(
    () => buildTodayCareClose(students, today),
    [students, today, refreshKey]
  );
  const draftNotices = useMemo(
    () =>
      filterParentNotices(StorageService.getNotifications()).filter(
        (n) => (n.status || 'pending') === 'pending'
      ).length,
    [refreshKey]
  );

  return (
    <IndustryDashboardShell
      icon={<Baby className="w-6 h-6" />}
      iconClassName="text-sky-600"
      title="어린이집 대시보드"
      description="원아·등하원·보육 기록"
      today={today}
      metricsGridClassName="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      metrics={[
        {
          label: `재원 ${labels.customer.singular}`,
          value: `${students.length}명`,
          variant: 'indigo',
          onClick: () => {
            setSelectedStudentId(null);
            setActiveTab('students');
          },
        },
        {
          label: '오늘 등원',
          value: `${checkedInToday}명`,
          variant: 'emerald',
          onClick: () => setActiveTab('attendance'),
        },
        {
          label: '오늘 알림장',
          value: `${todayJournals}건`,
          variant: 'teal',
          onClick: () => setActiveTab('journals'),
        },
        {
          label: '투약 대기',
          value: `${pendingMeds}건`,
          variant: pendingMeds > 0 ? 'amber' : 'default',
          onClick: () => setActiveTab('medications'),
        },
        {
          label: labels.staff.plural,
          value: `${teachers.length}명`,
          onClick: () => setActiveTab('teachers'),
        },
        {
          label: '운영 반',
          value: `${classes.length}개`,
          onClick: () => setActiveTab('classes'),
        },
      ]}
      students={students}
      checkedInToday={checkedInToday}
      customerSingular={labels.customer.singular}
      customerAddLabel={labels.customer.add}
      recentSectionTitle={`최근 등록 ${labels.customer.singular}`}
      recentEmptyDescription="원아를 등록하고 연령반·보호자·등하원 PIN을 설정하세요."
      recentJoinDatePrefix="입소"
      attendanceCheckedInLabel="오늘 등하원·보육"
      attendanceCheckInShortLabel="등원"
      attendanceActiveLabel="재원 원아"
      extraPanels={
        <div className="space-y-3">
          <DailyCloseList
            close={close}
            onWriteJournal={(studentId) => {
              requestCareFocus({ kind: 'journal', studentId });
              setActiveTab('journals');
            }}
            onOpenMedications={() => setActiveTab('medications')}
            onOpenMeals={() => {
              requestCareFocus({ kind: 'records', ops: 'meals' });
              setActiveTab('journals');
            }}
          />
          <PickupHandoffPanel close={close} />
          {healthWarnings.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                requestCareFocus({ kind: 'records', ops: 'health' });
                setActiveTab('journals');
              }}
              className="w-full text-left px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200"
            >
              <p className="text-xs font-bold text-amber-800">보건증 확인 {healthWarnings.length}명</p>
              <p className="text-[11px] text-amber-800 mt-1">
                {healthWarnings
                  .map((item) => `${item.teacher.name} ${healthCertWarningLabel(item.cert?.expiresAt)}`)
                  .join(' · ')}
              </p>
            </button>
          ) : null}
        </div>
      }
      attendanceActions={
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className="py-3 min-h-[44px] rounded-xl border border-sky-200 text-sky-700 text-xs font-bold hover:bg-sky-50 transition-colors"
          >
            등·하원
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('journals')}
            className="inline-flex items-center justify-center gap-1.5 py-3 min-h-[44px] rounded-xl border border-sky-200 text-sky-700 text-xs font-bold hover:bg-sky-50 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            알림장 {todayJournals}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('medications')}
            className="inline-flex items-center justify-center gap-1.5 py-3 min-h-[44px] rounded-xl border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-50 transition-colors"
          >
            <Pill className="w-3.5 h-3.5" />
            투약 대기 {pendingMeds}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notices')}
            className="inline-flex items-center justify-center gap-1.5 py-3 min-h-[44px] rounded-xl border border-sky-200 text-sky-700 text-xs font-bold hover:bg-sky-50 transition-colors"
          >
            <Megaphone className="w-3.5 h-3.5" />
            가정통신문{draftNotices > 0 ? ` 임시 ${draftNotices}` : ''}
          </button>
        </div>
      }
      accentClassName="text-sky-600"
      accentBorderClassName="border-sky-200 text-sky-700 hover:bg-sky-50"
      accentHoverClassName="hover:border-sky-200 hover:bg-sky-50/30"
      accentButtonClassName="bg-sky-600 hover:bg-sky-700"
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
