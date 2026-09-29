/** 업종별 UI 라벨 (Customer/Staff 도메인 용어) */
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
}
