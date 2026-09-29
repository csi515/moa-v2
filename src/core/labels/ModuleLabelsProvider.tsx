import { createContext, useContext, type ReactNode } from 'react';
import type { ModuleLabels } from './types';

const defaultLabels: ModuleLabels = {
  customer: {
    singular: '회원',
    plural: '회원',
    management: '회원 관리',
    section: '회원',
    add: '회원 등록',
    search: '회원 검색',
  },
  contact: {
    singular: '보호자',
    plural: '보호자',
    management: '보호자 관리',
  },
  staff: {
    singular: '강사',
    plural: '강사',
    management: '강사 관리',
  },
  service: {
    singular: '수업',
    plural: '수업',
    management: '수업 관리',
  },
  schedule: {
    singular: '일정',
    plural: '일정',
    management: '일정 관리',
  },
};

const ModuleLabelsContext = createContext<ModuleLabels>(defaultLabels);

export function ModuleLabelsProvider({
  labels = defaultLabels,
  children,
}: {
  labels?: ModuleLabels;
  children: ReactNode;
}) {
  return (
    <ModuleLabelsContext.Provider value={labels}>{children}</ModuleLabelsContext.Provider>
  );
}

export function useModuleLabels(): ModuleLabels {
  return useContext(ModuleLabelsContext);
}
