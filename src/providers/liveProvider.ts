import type { LiveEvent, LiveProvider } from "@refinedev/core";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import * as orgService from "@/core/organizations/services/organizationService";
import { StorageService } from "@/services/storage";
import {
  isTenantScopedResource,
  TENANT_SCOPED_RESOURCES,
  getTenantColumnForResource,
} from "./dataProvider";

export interface LiveProviderOptions {
  /** 조직 ID 리졸버 (테스트 주입용) */
  resolveOrgId?: () => string | null;
  /** 기본 데이터베이스 스키마 (기본값: 'core') */
  defaultSchema?: string;
}

const SUPABASE_TO_REFINE_EVENTS: Record<string, LiveEvent["type"]> = {
  INSERT: "created",
  UPDATE: "updated",
  DELETE: "deleted",
};

const REFINE_TO_SUPABASE_EVENTS: Record<string, string> = {
  created: "INSERT",
  updated: "UPDATE",
  deleted: "DELETE",
  "*": "*",
};

/** 실시간 동기화 지원 핵심 테넌트 리소스 목록 */
export const REALTIME_TENANT_RESOURCES = [
  ...TENANT_SCOPED_RESOURCES,
  "onboarding_tokens",
  "attendance_sessions",
  "session_passes",
  "lockers",
] as const;

function resolveSafeOrgId(): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return orgService.getStoredOrganizationId() || StorageService.getOrganizationId() || null;
    }
  } catch {
    // Node.js 또는 SSR 환경 안전 폴백
  }
  return null;
}

/**
 * Supabase Realtime 기반 Moa LiveProvider 생성 팩토리.
 * 테넌트 격리(organization_id / tenant_id 자동 필터링) 및 리소스 변경 이벤트를 실시간 중계합니다.
 * 'onboarding_tokens', 'customers', 'attendance_sessions' 등의 이벤트 발생 시 Refine 캐시를 자동 무효화합니다.
 */
export function createMoaLiveProvider(
  client: SupabaseClient<any, any, any> | null,
  options: LiveProviderOptions = {}
): LiveProvider {
  const resolveOrgId = options.resolveOrgId || resolveSafeOrgId;
  const defaultSchema = options.defaultSchema || "core";

  if (!client) {
    return {
      subscribe: () => ({ id: "unconfigured-noop-channel", unsubscribe: () => {} }),
      unsubscribe: () => {},
      publish: () => {},
    };
  }

  return {
    subscribe: ({ channel, types, params, callback, meta }): RealtimeChannel => {
      const resource = channel.replace("resources/", "");
      const activeOrgId = resolveOrgId();

      const isRealtimeTarget =
        isTenantScopedResource(resource) ||
        (REALTIME_TENANT_RESOURCES as readonly string[]).includes(resource);

      // Fail-closed: If resource requires tenant scoping but no active organization is resolved,
      // return a safe no-op channel rather than subscribing globally without filters.
      if (isRealtimeTarget && !activeOrgId) {
        return {
          id: `unscoped-${resource}-noop-channel`,
          unsubscribe: () => {},
        } as any;
      }

      // 테넌트 격리 필터 구성: 리소스별 테넌트 컬럼 지원 (onboarding_tokens는 tenant_id, 나머지는 organization_id)
      let filter: string | undefined = undefined;
      let tenantColumn: string | undefined = undefined;

      if (isRealtimeTarget && activeOrgId) {
        tenantColumn = getTenantColumnForResource(resource);
        filter = `${tenantColumn}=eq.${activeOrgId}`;
      } else if (params?.filters && params.filters.length > 0) {
        // 비테넌트 리소스에 한해 외부 params.filters의 첫 번째 필터 허용
        const firstFilter = params.filters[0];
        if ("field" in firstFilter && firstFilter.field) {
          filter = `${firstFilter.field}=eq.${firstFilter.value}`;
        }
      }

      const events = types.map((t) => REFINE_TO_SUPABASE_EVENTS[t] || t);
      const chName = `live:${channel}:${events.join("|")}${filter ? `:${filter}` : ""}`;
      let realtimeChannel = client.channel(chName);

      const targetSchema = meta?.schema || defaultSchema;

      const listener = (payload: any) => {
        const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
        const refineType = SUPABASE_TO_REFINE_EVENTS[eventType] || "*";

        if (types.includes("*") || types.includes(refineType)) {
          const record = payload.new || payload.old || {};

          // 심층 방어: 테넌트 리소스의 경우 수신 레코드의 테넌트 ID가 활성 조직과 일치하는지 검증
          if (isRealtimeTarget && activeOrgId && tenantColumn) {
            const recordOrg = record[tenantColumn];
            if (recordOrg && String(recordOrg) !== String(activeOrgId)) {
              return;
            }
          }

          // 특정 ID 목록만 감시하는 경우 필터링
          if (params?.ids && params.ids.length > 0) {
            const matchesId = params.ids.map(String).includes(String(record.id));
            if (!matchesId) return;
          }

          callback({
            channel,
            type: refineType,
            date: new Date(payload.commit_timestamp || Date.now()),
            payload: record,
          });
        }
      };

      for (const ev of events) {
        realtimeChannel = realtimeChannel.on(
          "postgres_changes" as any,
          {
            event: ev as any,
            schema: targetSchema,
            table: resource,
            ...(filter ? { filter } : {}),
          },
          listener
        );
      }

      return realtimeChannel.subscribe();
    },

    unsubscribe: async (ch: any) => {
      if (ch && typeof client.removeChannel === "function") {
        await client.removeChannel(ch);
      }
    },

    publish: (event: LiveEvent) => {
      const ch = client.channel(`broadcast:${event.channel}`);
      ch.send({
        type: "broadcast",
        event: event.type,
        payload: event.payload,
      });
    },
  };
}

/**
 * 기본 싱글톤 liveProvider 인스턴스.
 * Supabase가 설정되어 있지 않으면 no-op 안전 모드로 자동 동작합니다.
 */
export const liveProvider: LiveProvider = createMoaLiveProvider(supabase);
