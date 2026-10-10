import React from 'react';
import type { ResourceProps } from '@refinedev/core';
import {
  Users,
  Calendar,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  Lock,
  Ticket,
  Package,
  Receipt,
  BookOpenCheck,
  WalletCards,
  MessageSquareText,
  Sparkles,
  FileSignature,
  CalendarDays,
  CalendarClock,
  KanbanSquare,
  ClipboardCheck,
  UserCheck,
  UserCheck2,
} from 'lucide-react';
import type { IndustryType } from '@/core/industry/catalog';
import { getIndustryCapabilities } from './industryCapabilityMap';
import type { MoaI18nProvider } from '@/providers/i18nProvider';
import { assemblePreset, PresetAssemblyError } from '@/app/presets/presetAssembler';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Calendar,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  Lock,
  Ticket,
  Package,
  Receipt,
  BookOpenCheck,
  WalletCards,
  MessageSquareText,
  Sparkles,
  FileSignature,
  CalendarDays,
  CalendarClock,
  KanbanSquare,
  ClipboardCheck,
  UserCheck,
  UserCheck2,
};

export interface ProvisionResourcesOptions {
  industry: IndustryType | string | null | undefined;
  i18n: MoaI18nProvider;
}

/**
 * 활성 업종과 Capability에 따라 Refine의 ResourceProps 배열을 동적으로 프로비저닝합니다.
 *
 * 1. dashboard: 전 업종 공통
 * 2. roster: 활성 시 customers ("학생/회원/고객 관리") 프로비저닝
 * 3. scheduling: 활성 시 schedules ("일정 관리") 프로비저닝
 * 4. billing: 활성 시 tuition_invoices ("수강료/회비/결제") 프로비저닝
 * 5. Preset Assembler: 활성 업종 프리셋에 포함된 모든 Capability 리소스 (lockers, passes, rentals 등) 동적 결합
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

  // 5. Preset Assembler를 통한 동적 Capability 리소스 병합
  if (industry) {
    const preset = getIndustryPreset(industry);
    if (preset) {
      try {
        const assembled = assemblePreset(preset.id);
        const existingNames = new Set(resources.map((r) => r.name));

        for (const item of assembled.resources) {
          if (!existingNames.has(item.name)) {
            existingNames.add(item.name);
            const IconComponent = (item.meta.icon && ICON_MAP[item.meta.icon]) || LayoutGrid;
            resources.push({
              name: item.name,
              list: item.list,
              create: item.create,
              edit: item.edit,
              show: item.show,
              meta: {
                ...item.meta,
                icon: React.createElement(IconComponent, { className: 'h-4 w-4' }),
              },
            });
          }
        }
      } catch (err) {
        // 필수 Capability 누락 등 치명적 조립 오류는 명시적으로 상위로 전파
        if (err instanceof PresetAssemblyError) {
          throw err;
        }
        console.warn(`[provisionIndustryResources] Preset assembly skipped for ${industry}:`, err);
      }
    }
  }

  return resources;
}
