import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import type { GlobalStudent, ParentPortalTree, StudentEnrollment } from '../types/globalParent';
import { ACTIVE_ENROLLMENT_STATUSES } from '../types/globalParent';
import { fetchParentPortalTree } from '../services/parentPortalService';

export type ParentShellStep = 'children' | 'academies' | 'portal';

export interface SelectStudentOptions {
  /** 전환 시 같은 학원 enrollment를 우선 유지 */
  preferOrganizationId?: string;
  /**
   * true면 학원이 여러 곳이어도 포털 단계를 유지하고,
   * 선호 org가 없으면 학원 선택만 연다(홈으로 튕기지 않음).
   */
  stayInPortal?: boolean;
}

interface ParentPortalContextType {
  portalTree: ParentPortalTree | null;
  loading: boolean;
  error: string | null;
  step: ParentShellStep;
  selectedStudent: GlobalStudent | null;
  selectedEnrollment: StudentEnrollment | null;
  refreshPortalTree: () => Promise<void>;
  selectStudent: (student: GlobalStudent, options?: SelectStudentOptions) => void;
  selectEnrollment: (enrollment: StudentEnrollment) => void;
  /** 포털 헤더에서 자녀 전환 — 가능하면 같은 학원·포털 유지 */
  switchChildInPortal: (student: GlobalStudent) => void;
  goToChildren: () => void;
  goToAcademies: () => void;
}

const ParentPortalContext = createContext<ParentPortalContextType | undefined>(undefined);

function pickEnrollment(
  student: GlobalStudent,
  preferOrganizationId?: string
): StudentEnrollment | null {
  const active = student.enrollments.filter((e) =>
    ACTIVE_ENROLLMENT_STATUSES.includes(e.status)
  );
  const pool = active.length > 0 ? active : student.enrollments;
  if (pool.length === 0) return null;
  if (preferOrganizationId) {
    const preferred = pool.find((e) => e.organizationId === preferOrganizationId);
    if (preferred) return preferred;
  }
  if (pool.length === 1) return pool[0];
  return null;
}

export const ParentPortalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [portalTree, setPortalTree] = useState<ParentPortalTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<ParentShellStep>('children');
  const [selectedStudent, setSelectedStudent] = useState<GlobalStudent | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<StudentEnrollment | null>(null);

  const refreshPortalTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tree = await fetchParentPortalTree();
      setPortalTree(tree);
    } catch (err) {
      setError(err instanceof Error ? err.message : '포털 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshPortalTree();
  }, [refreshPortalTree]);

  const selectStudent = useCallback((student: GlobalStudent, options?: SelectStudentOptions) => {
    setSelectedStudent(student);

    const enrollment = pickEnrollment(student, options?.preferOrganizationId);
    if (enrollment) {
      setSelectedEnrollment(enrollment);
      setStep('portal');
      return;
    }

    setSelectedEnrollment(null);
    if (options?.stayInPortal && student.enrollments.length > 0) {
      setStep('academies');
      return;
    }
    setStep(student.enrollments.length > 0 ? 'academies' : 'children');
  }, []);

  const selectEnrollment = useCallback((enrollment: StudentEnrollment) => {
    setSelectedEnrollment(enrollment);
    setStep('portal');
  }, []);

  const switchChildInPortal = useCallback(
    (student: GlobalStudent) => {
      selectStudent(student, {
        preferOrganizationId: selectedEnrollment?.organizationId,
        stayInPortal: true,
      });
    },
    [selectStudent, selectedEnrollment?.organizationId]
  );

  const goToChildren = useCallback(() => {
    setStep('children');
    setSelectedStudent(null);
    setSelectedEnrollment(null);
  }, []);

  const goToAcademies = useCallback(() => {
    setStep('academies');
    setSelectedEnrollment(null);
  }, []);

  const value = useMemo(
    () => ({
      portalTree,
      loading,
      error,
      step,
      selectedStudent,
      selectedEnrollment,
      refreshPortalTree,
      selectStudent,
      selectEnrollment,
      switchChildInPortal,
      goToChildren,
      goToAcademies,
    }),
    [
      portalTree,
      loading,
      error,
      step,
      selectedStudent,
      selectedEnrollment,
      refreshPortalTree,
      selectStudent,
      selectEnrollment,
      switchChildInPortal,
      goToChildren,
      goToAcademies,
    ]
  );

  return <ParentPortalContext.Provider value={value}>{children}</ParentPortalContext.Provider>;
};

export function useParentPortal(): ParentPortalContextType {
  const ctx = useContext(ParentPortalContext);
  if (!ctx) {
    throw new Error('useParentPortal must be used within ParentPortalProvider');
  }
  return ctx;
}
