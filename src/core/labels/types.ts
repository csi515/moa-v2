import type {
  TerminologyBillingLabels,
  TerminologyFacilityLabels,
} from '@/core/terminology/types';

/** 업종별 UI 라벨 (Customer/Staff/Billing/Facility 도메인 용어) */
export interface ModuleLabels {
  customer: {
    singular: string;
    plural: string;
    management: string;
    section: string;
    add: string;
    search: string;
  };
  contact: {
    singular: string;
    plural: string;
    management: string;
  };
  staff: {
    singular: string;
    plural: string;
    management: string;
    section?: string;
  };
  service: {
    singular: string;
    plural: string;
    management: string;
    section?: string;
  };
  schedule: {
    singular: string;
    plural: string;
    management: string;
    section?: string;
  };
  billing?: TerminologyBillingLabels;
  facility?: TerminologyFacilityLabels;
}

