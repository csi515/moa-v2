import { useEffect, useMemo, useState, type FC } from 'react';
import { CalendarDays, ClipboardCheck, DoorOpen, Home, LogOut, User } from 'lucide-react';
import { AdultStudentGuidePanel } from '@/core/help';
import { normalizeIndustryType } from '@/core/industry/types';
import { CustomerPracticeRoomView } from './CustomerPracticeRoomView';
import { CustomerHomeView } from './CustomerHomeView';
import { CustomerScheduleView } from './CustomerScheduleView';
import { CustomerAttendanceView } from './CustomerAttendanceView';
import { CustomerNoticesView } from './CustomerNoticesView';
import { CustomerMyOrgsView } from './CustomerMyOrgsView';
import {
  getMyPassSummary,
  type StudentPortalEnrollment,
} from './services/studentPortalService';
import type { MyLinkedCustomerOrg } from './services/myLinkedCustomerOrgsService';

export type CustomerTab = 'home' | 'schedule' | 'attendance' | 'practice' | 'account';

function showPracticeTab(industryType: string): boolean {
  return normalizeIndustryType(industryType) === 'piano';
}

interface Props {
  displayName: string;
  email: string;
  enrollment: StudentPortalEnrollment;
  enrollments: StudentPortalEnrollment[];
  linkedOrgs: MyLinkedCustomerOrg[];
  onSelectEnrollment: (e: StudentPortalEnrollment) => void;
  tab: CustomerTab;
  onTabChange: (t: CustomerTab) => void;
  onExit: () => void;
  canExit: boolean;
  onSignOut: () => void;
  orgName: string;
}

export const CustomerPortalBody: FC<Props> = ({
  displayName,
  email,
  enrollment,
  enrollments,
  linkedOrgs,
  onSelectEnrollment,
  tab,
  onTabChange,
  onExit,
  canExit,
  onSignOut,
  orgName,
}) => {
  const passSummary = useMemo(
    () => getMyPassSummary(enrollment.customerId),
    [enrollment.customerId]
  );

  const withPractice = showPracticeTab(enrollment.industryType);
  const [pointsActive, setPointsActive] = useState(false);

  useEffect(() => {
    if (tab !== 'account') setPointsActive(false);
  }, [tab]);

  const navItems = useMemo(
    () =>
      [
        { id: 'home' as const, label: '홈', icon: Home },
        { id: 'schedule' as const, label: '일정', icon: CalendarDays },
        { id: 'attendance' as const, label: '출결', icon: ClipboardCheck },
        ...(withPractice
          ? [{ id: 'practice' as const, label: '연습실', icon: DoorOpen }]
          : []),
        { id: 'account' as const, label: '계정', icon: User },
      ] as const,
    [withPractice]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] font-bold text-indigo-600">{orgName}</p>
          <h1 className="text-base font-black text-slate-900">{displayName}</h1>
          {enrollments.length > 1 && (
            <select
              value={enrollment.enrollmentId}
              onChange={(e) => {
                const next = enrollments.find((x) => x.enrollmentId === e.target.value);
                if (next) onSelectEnrollment(next);
              }}
              className="mt-2 w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-h-[44px]"
            >
              {enrollments.map((e) => (
                <option key={e.enrollmentId} value={e.enrollmentId}>
                  {e.organizationName}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 pb-24">
        {tab === 'home' && (
          <CustomerHomeView
            customerId={enrollment.customerId}
            studentId={enrollment.customerId}
            organizationId={enrollment.organizationId}
            passSummary={passSummary}
            onOpenAttendance={() => onTabChange('attendance')}
            displayName={displayName}
          />
        )}
        {tab === 'schedule' && (
          <CustomerScheduleView
            customerId={enrollment.customerId}
            organizationId={enrollment.organizationId}
            displayName={displayName}
          />
        )}
        {tab === 'attendance' && (
          <CustomerAttendanceView
            customerId={enrollment.customerId}
            organizationId={enrollment.organizationId}
            industryType={enrollment.industryType}
            displayName={displayName}
          />
        )}
        {tab === 'practice' && withPractice && (
          <CustomerPracticeRoomView organizationId={enrollment.organizationId} />
        )}
        {tab === 'account' && (
          <div className="space-y-4">
            <CustomerMyOrgsView
              organizations={linkedOrgs}
              onPointsActiveChange={setPointsActive}
            />
            {!pointsActive && (
              <>
                <CustomerNoticesView
                  customerId={enrollment.customerId}
                  organizationId={enrollment.organizationId}
                  displayName={displayName}
                />
                <AdultStudentGuidePanel industry={enrollment.industryType} />
                <div className="space-y-3 bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-bold text-slate-900">계정</p>
                  <p className="text-xs text-slate-500">{email}</p>
                  {canExit && (
                    <button
                      type="button"
                      onClick={onExit}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
                    >
                      관리 화면으로
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="w-full min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-bold inline-flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-1 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] flex justify-around z-40">
        {navItems.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`flex flex-col items-center py-1 px-1 min-h-[44px] flex-1 text-[10px] ${
              tab === t.id ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <t.icon className="w-5 h-5" />
            <span className="mt-0.5">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
