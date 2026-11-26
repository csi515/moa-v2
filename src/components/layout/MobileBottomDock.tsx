import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Calendar,
  ScanLine,
  Wallet,
  Menu,
  FileSpreadsheet,
  LayoutGrid,
  Ticket,
  MessageSquare,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { useTenantTerms } from '@/core/terms/useTenantTerms';

interface BottomTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

const THEME_ACTIVE_TEXT_COLORS: Record<string, string> = {
  emerald: 'text-emerald-600',
  rose: 'text-rose-600',
  orange: 'text-orange-600',
  amber: 'text-amber-600',
  sky: 'text-sky-600',
  teal: 'text-teal-600',
  purple: 'text-slate-800',
  slate: 'text-slate-900',
  indigo: 'text-slate-800',
};

export function MobileBottomDock() {
  const org = useOptionalOrganization();
  const currentOrg = org?.currentOrganization;
  const terms = useTenantTerms();

  const preset = useMemo(() => {
    return currentOrg?.industry_type ? getIndustryPreset(currentOrg.industry_type) : null;
  }, [currentOrg?.industry_type]);

  const capabilities = useMemo(() => {
    return new Set(preset?.capabilities || []);
  }, [preset]);

  const accentColor = preset?.theme?.accentColor || 'indigo';
  const activeColorClass = THEME_ACTIVE_TEXT_COLORS[accentColor] || THEME_ACTIVE_TEXT_COLORS.indigo;

  // 업종별 5대 핵심 탭 동적 산출
  const tabs = useMemo<BottomTab[]>(() => {
    // 1. 홈 탭 (고정)
    const t1: BottomTab = {
      href: '/',
      label: '홈',
      icon: Home,
    };

    // 2. 스케줄/공간 탭
    let t2: BottomTab;
    if (capabilities.has('booking') || capabilities.has('scheduling')) {
      t2 = {
        href: '/booking/week',
        label: terms.bookingTerm || '시간표',
        icon: Calendar,
      };
    } else if (capabilities.has('seat_room') || capabilities.has('rental_equipment')) {
      t2 = {
        href: '/resources',
        label: terms.spaceTerm ? `${terms.spaceTerm}현황` : '공간/좌석',
        icon: LayoutGrid,
      };
    } else {
      t2 = {
        href: '/booking/week',
        label: '시간표',
        icon: Calendar,
      };
    }

    // 3. 현장 운영/출결/차트/주문 탭
    let t3: BottomTab;
    if (capabilities.has('attendance')) {
      t3 = {
        href: '/kiosk/attendance',
        label: '출결패드',
        icon: ScanLine,
      };
    } else if (capabilities.has('treatment_chart')) {
      t3 = {
        href: '/roster',
        label: '고객/차트',
        icon: FileSpreadsheet,
      };
    } else if (capabilities.has('table_order_kds') || capabilities.has('pickup_orders')) {
      t3 = {
        href: '/orders',
        label: '주문현황',
        icon: UtensilsCrossed,
      };
    } else if (capabilities.has('passes')) {
      t3 = {
        href: '/passes',
        label: terms.passTerm || '이용권',
        icon: Ticket,
      };
    } else {
      t3 = {
        href: '/roster',
        label: terms.customerTerm || '고객',
        icon: FileSpreadsheet,
      };
    }

    // 4. 수납/상담 탭
    let t4: BottomTab;
    if (capabilities.has('billing_invoicing') || capabilities.has('ledger_simple') || capabilities.has('billing')) {
      t4 = {
        href: '/billing',
        label: '장부/정산',
        icon: Wallet,
      };
    } else if (capabilities.has('consultation_crm') || capabilities.has('trial_funnel')) {
      t4 = {
        href: '/consultation',
        label: '상담관리',
        icon: MessageSquare,
      };
    } else {
      t4 = {
        href: '/billing',
        label: '장부',
        icon: Wallet,
      };
    }

    // 5. 더보기 탭 (고정)
    const t5: BottomTab = {
      href: '/workspace/settings',
      label: '설정',
      icon: Menu,
    };

    return [t1, t2, t3, t4, t5];
  }, [capabilities, terms]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.href}
            to={tab.href}
            className={({ isActive }) =>
              `flex min-h-12 flex-1 flex-col items-center justify-center text-[11px] font-bold tracking-tight transition-colors ${
                isActive ? `${activeColorClass}` : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-5 w-5 mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="truncate max-w-[60px]">{tab.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
