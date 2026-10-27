import React, { useMemo } from "react";
import {
  Users,
  CalendarCheck,
  CreditCard,
  Sparkles,
  DoorOpen,
  FileText,
  Ticket,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { OnboardingQuestCard } from "@/components/dashboard/OnboardingQuestCard";
import { ActionableEmptyState } from "@/components/common/ActionableEmptyState";
import { useOptionalOrganization } from "@/core/organizations/OrganizationProvider";
import { getIndustryPreset } from "@/app/presets/presetRegistry";
import { useTenantTerms } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const orgContext = useOptionalOrganization();
  const currentOrg = orgContext?.currentOrganization;
  const { t } = useTenantTerms();

  const preset = useMemo(() => {
    const industryKey = currentOrg?.industry_type || "general_academy";
    return getIndustryPreset(industryKey);
  }, [currentOrg?.industry_type]);

  const customerTerm = t("customer", preset?.terms?.customer || "회원");
  const instructorTerm = t("instructor", preset?.terms?.instructor || "선생님/강사");
  const spaceTerm = t("space", preset?.terms?.space || "공간");
  const passTerm = t("pass", preset?.terms?.pass || "이용권");
  const attendanceTerm = t("attendance", "출석");

  const badgeEmoji = preset?.theme?.badgeEmoji || "🏢";
  const orgName = currentOrg?.name || "내 사업장";
  const presetName = preset?.name || "매장";

  const caps = useMemo(() => new Set(preset?.capabilities || []), [preset]);

  // ── 업종 맞춤 3~4대 퀵 액션 (Quick Actions) ──────────────────────────────────
  const quickActions = useMemo(() => {
    const list = [];

    // 1. 공통: 신규 고객 등록
    list.push({
      id: "create_customer",
      label: `+ 신규 ${customerTerm} 등록`,
      desc: `새로운 ${customerTerm}을 등록하고 장부에 연결합니다.`,
      onClick: () => navigate("/customers/create"),
      icon: Users,
      badge: "기본",
      color: "border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100/60 text-indigo-700",
      iconColor: "text-indigo-600 bg-indigo-100",
    });

    // 2. 예약 또는 일정 접수
    if (caps.has("booking")) {
      list.push({
        id: "create_booking",
        label: "+ 당일 예약 일정 접수",
        desc: `${customerTerm}의 방문 및 상담 예약을 생성합니다.`,
        onClick: () => navigate("/schedules/create"),
        icon: CalendarCheck,
        badge: "예약",
        color: "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-700",
        iconColor: "text-emerald-600 bg-emerald-100",
      });
    }

    // 3. 공간 / 타석 / 좌석 배정
    if (caps.has("seat_room") || caps.has("time_block_rental")) {
      list.push({
        id: "manage_spaces",
        label: `${spaceTerm} 배정 및 현황`,
        desc: `실시간 ${spaceTerm} 이용 현황을 점검하고 배정합니다.`,
        onClick: () => navigate("/seat_rooms"),
        icon: DoorOpen,
        badge: spaceTerm,
        color: "border-amber-100 bg-amber-50/50 hover:bg-amber-100/60 text-amber-700",
        iconColor: "text-amber-600 bg-amber-100",
      });
    }

    // 4. 출결 키오스크 실행
    if (caps.has("attendance")) {
      list.push({
        id: "open_kiosk",
        label: `${attendanceTerm} 체크 키오스크`,
        desc: `카운터 키오스크를 띄워 자율 ${attendanceTerm}을 접수합니다.`,
        onClick: () => navigate("/kiosk"),
        icon: Clock,
        badge: "키오스크",
        color: "border-sky-100 bg-sky-50/50 hover:bg-sky-100/60 text-sky-700",
        iconColor: "text-sky-600 bg-sky-100",
      });
    }

    // 5. 시술 차트 / 포트폴리오
    if (caps.has("treatment_chart")) {
      list.push({
        id: "treatment_chart",
        label: "+ 시술 차트 및 기록 작성",
        desc: `${customerTerm}의 당일 시술 및 관리 일지를 기록합니다.`,
        onClick: () => navigate("/treatment_charts"),
        icon: FileText,
        badge: "차트",
        color: "border-rose-100 bg-rose-50/50 hover:bg-rose-100/60 text-rose-700",
        iconColor: "text-rose-600 bg-rose-100",
      });
    }

    // 6. 이용권 / 수강권 발급
    if (caps.has("passes")) {
      list.push({
        id: "manage_passes",
        label: `+ ${passTerm} 발권 및 잔여 차감`,
        desc: `신규 ${passTerm}을 발급하거나 즉시 차감합니다.`,
        onClick: () => navigate("/passes"),
        icon: Ticket,
        badge: passTerm,
        color: "border-purple-100 bg-purple-50/50 hover:bg-purple-100/60 text-purple-700",
        iconColor: "text-purple-600 bg-purple-100",
      });
    }

    // 최대 4개 우선 노출
    return list.slice(0, 4);
  }, [caps, customerTerm, spaceTerm, passTerm, attendanceTerm, navigate]);

  // ── 업종 맞춤 4대 KPI 카드 규격 ──────────────────────────────────────────────
  const kpis = useMemo(() => {
    // 1번: 고객 규모
    const card1 = {
      title: `등록 ${customerTerm} 수`,
      value: "-- 명",
      subtext: "실시간 장부 동기화",
      icon: Users,
      iconColor: "text-indigo-600",
      accent: "text-emerald-600",
    };

    // 2번: 당일 활동 (출결 or 예약 or 일정)
    let card2;
    if (caps.has("attendance")) {
      card2 = {
        title: `오늘 ${attendanceTerm} 현황`,
        value: "-- 명",
        subtext: "키오스크 실시간 집계",
        icon: Clock,
        iconColor: "text-emerald-600",
        accent: "text-slate-500",
      };
    } else if (caps.has("booking")) {
      card2 = {
        title: "오늘 예약 접수",
        value: "-- 건",
        subtext: "캘린더 타임라인 연동",
        icon: CalendarCheck,
        iconColor: "text-emerald-600",
        accent: "text-slate-500",
      };
    } else {
      card2 = {
        title: "당일 운영 현황",
        value: "정상 운영",
        subtext: "현장 공정 가동 중",
        icon: CalendarCheck,
        iconColor: "text-emerald-600",
        accent: "text-emerald-600",
      };
    }

    // 3번: 업종 고유 공간/서비스 지표
    let card3;
    if (caps.has("seat_room") || caps.has("time_block_rental")) {
      card3 = {
        title: `실시간 ${spaceTerm} 가동률`,
        value: "-- %",
        subtext: `${spaceTerm} 점유 및 배정 관제`,
        icon: DoorOpen,
        iconColor: "text-amber-600",
        accent: "text-amber-600",
      };
    } else if (caps.has("treatment_chart")) {
      card3 = {
        title: "당일 시술/관리 일정",
        value: "-- 건",
        subtext: "차트 및 시술 일지 연동",
        icon: FileText,
        iconColor: "text-rose-600",
        accent: "text-slate-500",
      };
    } else if (caps.has("passes")) {
      card3 = {
        title: `유효 ${passTerm} 보유`,
        value: "-- 건",
        subtext: "잔여 횟수/일수 모니터링",
        icon: Ticket,
        iconColor: "text-purple-600",
        accent: "text-purple-600",
      };
    } else {
      card3 = {
        title: "시설 및 자원 상태",
        value: "양호",
        subtext: "점검 체크리스트 정상",
        icon: Sparkles,
        iconColor: "text-amber-600",
        accent: "text-slate-500",
      };
    }

    // 4번: 수납/정산 또는 시스템 안전
    let card4;
    if (caps.has("billing_invoicing")) {
      card4 = {
        title: `당월 ${passTerm} 수납 청구`,
        value: "-- 원",
        subtext: "원장 자동 정산 연동",
        icon: CreditCard,
        iconColor: "text-purple-600",
        accent: "text-slate-500",
      };
    } else {
      card4 = {
        title: "사업장 테넌트 보안",
        value: "안심 격리",
        subtext: "Row-Level Security 보호",
        icon: Sparkles,
        iconColor: "text-sky-600",
        accent: "text-sky-600",
      };
    }

    return [card1, card2, card3, card4];
  }, [caps, customerTerm, spaceTerm, passTerm, attendanceTerm]);

  return (
    <div className="space-y-6">
      {/* ── 1. 업종 브랜딩 헤더 ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-lg shadow-xs">
              {badgeEmoji}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
              {presetName}
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-medium text-slate-500">{orgName}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {presetName} 운영 대시보드
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            오늘의 {customerTerm} 현황과 매장 주요 운영 지표를 실시간으로 확인합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate("/customers/create")}
            className="inline-flex items-center gap-1.5 min-h-[44px] rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-indigo-500 transition-colors"
          >
            <Users className="h-4 w-4" />
            + {customerTerm} 등록
          </button>
        </div>
      </div>

      {/* ── 2. 온보딩 퀘스트 카드 (신규 테넌트 안내) ────────────────── */}
      <OnboardingQuestCard memberCount={0} />

      {/* ── 3. 오늘의 빠른 업무 (Quick Actions) ────────────────────────── */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
          <h2 className="text-sm font-bold text-slate-800">오늘의 빠른 실행 (Quick Actions)</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className={cn(
                  "group flex flex-col justify-between rounded-xl border p-4 text-left transition-all shadow-2xs hover:shadow-sm",
                  action.color
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", action.iconColor)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-600 shadow-2xs">
                    {action.badge}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {action.label}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                    {action.desc}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
                  <span>바로가기</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. 회원 미등록 시 안내 배너 ─────────────────────────────── */}
      <ActionableEmptyState
        iconName="users"
        title={`등록된 ${customerTerm}이(가) 없습니다`}
        description={`첫 ${customerTerm}을 등록하면 출결, 예약, ${passTerm} 발급을 바로 시작할 수 있습니다.`}
        actionButton={{
          label: `+ ${customerTerm} 등록하기`,
          onClick: () => navigate("/customers/create"),
        }}
      />

      {/* ── 5. 업종 맞춤 4대 핵심 KPI 카드 ──────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 mb-3">핵심 운영 지표</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">{kpi.title}</span>
                  <Icon className={cn("h-5 w-5", kpi.iconColor)} />
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {kpi.value}
                </div>
                <span className={cn("mt-1 block text-xs font-medium", kpi.accent)}>
                  {kpi.subtext}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
