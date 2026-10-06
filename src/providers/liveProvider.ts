import type { LiveEvent, LiveProvider } from "@refinedev/core";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import * as orgService from "@/core/organizations/services/organizationService";
import { StorageService } from "@/services/storage";
import {
  isTenantScopedResource,
  TENANT_SCOPED_RESOURCES,
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
 * 테넌트 격리(organization_id 자동 필터링) 및 리소스 변경 이벤트를 실시간 중계합니다.
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

      // 테넌트 격리 필터 구성: 테넌트 종속 리소스는 현재 활성 organization_id 이벤트만 수신
      let filter: string | undefined = undefined;
      if (isTenantScopedResource(resource) && activeOrgId) {
        filter = `organization_id=eq.${activeOrgId}`;
      }

      // 외부 params.filters에 첫 번째 필터가 명시된 경우
      if (!filter && params?.filters && params.filters.length > 0) {
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
