import React from 'react';
import type { ResourceProps } from '@refinedev/core';
import { Users, Calendar, CreditCard, LayoutDashboard } from 'lucide-react';
import type { IndustryType } from '@/core/industry/catalog';
import { getIndustryCapabilities } from './industryCapabilityMap';
import type { MoaI18nProvider } from '@/providers/i18nProvider';

export interface ProvisionResourcesOptions {
  industry: IndustryType | string | null | undefined;
  i18n: MoaI18nProvider;
}

/**
 * 활성 업종과 Capability에 따라 Refine의 ResourceProps 배열을 동적으로 프로비저닝합니다.
 *
 * - dashboard: 전 업종 공통
 * - roster: 활성 시 customers ("학생/회원/고객 관리") 프로비저닝
 * - scheduling: 활성 시 schedules ("일정 관리") 프로비저닝
 * - billing: 활성 시 tuition_invoices ("수강료/회비/결제") 프로비저닝
 */
export function provisionIndustryResources(
  options: ProvisionResourcesOptions
): ResourceProps[] {
  const { industry, i18n } = options;
  const capabilities = getIndustryCapabilities(industry);

  const resources: ResourceProps[] = [
    // 1. 대시보드는 모든 업종 공통
    {
      name: 'dashboard',
      list: '/',
      meta: {
        label: i18n.translate('resources.dashboard.name', '대시보드'),
        icon: React.createElement(LayoutDashboard, { className: 'h-4 w-4' }),
      },
    },
  ];

  // 2. roster capability: 고객/학생/회원 관리
  // (명시적으로 false가 아닌 한 기본 활성화)
  if (capabilities.roster !== false) {
    const customerSingular = i18n.translate('customer.singular', '고객');
    resources.push({
      name: 'customers',
      list: '/students',
      create: '/students/create',
      edit: '/students/:id/edit',
      show: '/students/:id',
      meta: {
        label: `${customerSingular} 관리`,
        icon: React.createElement(Users, { className: 'h-4 w-4' }),
      },
    });
  }

  // 3. scheduling capability: 일정/수업 관리
  if (capabilities.scheduling === true) {
    const scheduleSingular = i18n.translate('schedule.singular', '일정');
    resources.push({
      name: 'schedules',
      list: '/schedules',
      meta: {
        label: `${scheduleSingular} 관리`,
        icon: React.createElement(Calendar, { className: 'h-4 w-4' }),
      },
    });
  }

  // 4. billing capability: 수강료/회비/결제 관리
  if (capabilities.billing === true) {
    const billingFee = i18n.translate('billing.fee', '수강료');
    resources.push({
      name: 'tuition_invoices',
      list: '/billing',
      meta: {
        label: `${billingFee}/결제`,
        icon: React.createElement(CreditCard, { className: 'h-4 w-4' }),
      },
    });
  }

  return resources;
}
