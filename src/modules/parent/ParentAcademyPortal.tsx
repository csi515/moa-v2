import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useStorageRefresh } from '@/hooks/useStorageRefresh';
import { StudentService } from '@/core/students';
import { ToastContainer, ConfirmDialog } from '@/shared/components';
import { SupabaseRoleSync } from '@/SupabaseRoleSync';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  ENROLLMENT_STATUS_LABELS,
  isReadOnlyEnrollment,
  type EnrollmentStatus,
  type GlobalStudent,
  type StudentEnrollment,
} from '@/core/parent/types/globalParent';
import { useParentPortal } from '@/core/parent/context/ParentPortalContext';
import type { IndustryType } from '@/core/industry/types';
import type { Student } from '@/types';
import type { ParentPortalTab } from '@/types/education';
import { ParentPortalTabs } from './ParentPortalTabs';
import { ParentReadOnlyBanner } from './ParentReadOnlyBanner';
import {
  getParentPortalNav,
  getParentPortalRoleLabel,
  getParentPortalSecondaryTabs,
} from './parentPortalNav';
import { consumePendingPortalTab } from '@/core/push';

export interface ParentAcademyPortalProps {
  student: Student;
  organizationId: string;
  organizationName: string;
  enrollmentStatus?: EnrollmentStatus;
  enrollmentLeftAt?: string | null;
  industryType?: IndustryType | string;
  onBack?: () => void;
}

export const ParentAcademyPortal: React.FC<ParentAcademyPortalProps> = ({
  student,
  organizationId,
  organizationName,
  enrollmentStatus = 'active' as EnrollmentStatus,
  enrollmentLeftAt,
  industryType: industryTypeProp,
  onBack,
}) => {
  const { showToast, triggerRefresh } = useApp();
  const {
    portalTree,
    selectedStudent,
    switchChildInPortal,
    selectEnrollment,
    goToChildren,
    goToAcademies,
  } = useParentPortal();
  const industryType = industryTypeProp;
  const readOnly = isReadOnlyEnrollment(enrollmentStatus);
  const portalNav = useMemo(() => getParentPortalNav(industryType), [industryType]);
  const allowedTabs = useMemo(
    () =>
      new Set([
        ...portalNav.map((t) => t.id),
        ...getParentPortalSecondaryTabs(industryType),
      ]),
    [portalNav, industryType]
  );

  const [activeTab, setActiveTab] = useState<ParentPortalTab>('home');
  const [childMenuOpen, setChildMenuOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);

  const children = portalTree?.children ?? [];
  const enrollments = selectedStudent?.enrollments ?? [];

  useEffect(() => {
    const pending = consumePendingPortalTab();
    if (pending && allowedTabs.has(pending as ParentPortalTab)) {
      setActiveTab(pending as ParentPortalTab);
    }
  }, [allowedTabs, organizationId, student.id]);

  useEffect(() => {
    if (!allowedTabs.has(activeTab)) {
      setActiveTab('home');
    }
  }, [allowedTabs, activeTab]);

  const statusLabel = ENROLLMENT_STATUS_LABELS[enrollmentStatus];
  const statusBadgeClass = readOnly
    ? 'bg-slate-100 text-slate-600'
    : enrollmentStatus === 'leave'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-indigo-50 text-indigo-700';

  const handleSelectChild = (child: GlobalStudent) => {
    setChildMenuOpen(false);
    setOrgMenuOpen(false);
    switchChildInPortal(child);
  };

  const handleSelectEnrollment = (enrollment: StudentEnrollment) => {
    setOrgMenuOpen(false);
    selectEnrollment(enrollment);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col">
      {isSupabaseConfigured() && <SupabaseRoleSync />}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-start gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-xl hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
              aria-label="뒤로"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          )}
          <div className="min-w-0 flex-1 space-y-1 relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setOrgMenuOpen(false);
                  setChildMenuOpen((o) => !o);
                }}
                className="flex items-center gap-1 max-w-full min-h-[44px] -my-1 py-1 pr-2 rounded-lg hover:bg-slate-50"
                aria-expanded={childMenuOpen}
                aria-haspopup="listbox"
              >
                <span className="min-w-0 text-left">
                  <span className="block text-[10px] font-bold text-slate-400">
                    {getParentPortalRoleLabel(industryType)}
                  </span>
                  <h1 className="text-base font-black text-slate-900 truncate">
                    {selectedStudent?.displayName || student.name}
                  </h1>
                </span>
                {children.length > 1 && <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
              {childMenuOpen && children.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute left-0 top-full mt-1 z-40 min-w-[12rem] max-w-[min(100vw-2rem,20rem)] bg-white border border-slate-200 rounded-xl shadow-lg py-1"
                >
                  {children.map((child) => (
                    <li key={child.studentId}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={child.studentId === selectedStudent?.studentId}
                        onClick={() => handleSelectChild(child)}
                        className={`w-full text-left px-3 py-2.5 text-sm min-h-[44px] ${
                          child.studentId === selectedStudent?.studentId
                            ? 'font-bold text-indigo-700 bg-indigo-50'
                            : 'text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {child.displayName}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          사업장 {child.enrollments.length}곳
                        </span>
                      </button>
                    </li>
                  ))}
                  <li className="border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setChildMenuOpen(false);
                        goToChildren();
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-500 min-h-[44px] hover:bg-slate-50"
                    >
                      자녀 목록으로
                    </button>
                  </li>
                </ul>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setChildMenuOpen(false);
                  setOrgMenuOpen((o) => !o);
                }}
                className="flex items-center gap-1 max-w-full text-xs text-slate-500 min-h-[36px] pr-2 rounded-lg hover:bg-slate-50"
                aria-expanded={orgMenuOpen}
              >
                <span className="truncate">{organizationName}</span>
                {enrollments.length > 1 && <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
              </button>
              {orgMenuOpen && enrollments.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute left-0 top-full mt-1 z-40 min-w-[14rem] max-w-[min(100vw-2rem,22rem)] bg-white border border-slate-200 rounded-xl shadow-lg py-1"
                >
                  {enrollments.map((enr) => (
                    <li key={enr.enrollmentId}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={enr.organizationId === organizationId}
                        onClick={() => handleSelectEnrollment(enr)}
                        className={`w-full text-left px-3 py-2.5 text-sm min-h-[44px] ${
                          enr.organizationId === organizationId
                            ? 'font-bold text-indigo-700 bg-indigo-50'
                            : 'text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {enr.organizationName}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {ENROLLMENT_STATUS_LABELS[enr.status]}
                        </span>
                      </button>
                    </li>
                  ))}
                  {enrollments.length > 1 && (
                    <li className="border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setOrgMenuOpen(false);
                          goToAcademies();
                        }}
                        className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-500 min-h-[44px] hover:bg-slate-50"
                      >
                        사업장 목록으로
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 mt-1 ${statusBadgeClass}`}>
            {statusLabel}
          </span>
        </div>
      </header>

      <div className="flex-1 max-w-3xl w-full mx-auto p-4 pb-24 md:grid md:grid-cols-1 lg:max-w-3xl">
        <ParentReadOnlyBanner status={enrollmentStatus} leftAt={enrollmentLeftAt} />

        <ParentPortalTabs
          tab={activeTab}
          student={student}
          organizationId={organizationId}
          readOnly={readOnly}
          showToast={showToast}
          onRefresh={triggerRefresh}
          onNavigate={setActiveTab}
          industryType={industryType}
          onSwitchChild={goToChildren}
        />
      </div>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-1 py-1 flex justify-around z-40 safe-area-pb">
        {portalNav.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setChildMenuOpen(false);
              setOrgMenuOpen(false);
              setActiveTab(t.id);
            }}
            className={`flex flex-col items-center py-1 px-1.5 text-[10px] min-w-0 min-h-[44px] flex-1 max-w-[5.5rem] ${
              activeTab === t.id ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            {t.icon}
            <span className="mt-0.5 truncate w-full text-center">{t.label}</span>
          </button>
        ))}
      </nav>

      <ToastContainer />
      <ConfirmDialog />
    </div>
  );
};

/** StorageHydrator 이후 customer_id로 Student 조회 (StudentService 경로) */
export function useStudentFromEnrollment(customerId: string): Student | null {
  const refreshKey = useStorageRefresh();
  return useMemo(() => {
    return StudentService.getStudentById(customerId) ?? null;
  }, [customerId, refreshKey]);
}
