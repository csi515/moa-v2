import assert from "node:assert/strict";
import type { LiveEvent } from "@refinedev/core";
import { createMoaLiveProvider, liveProvider } from "./liveProvider";

function createMockSupabaseClient() {
  const channels: any[] = [];
  let registeredListeners: Array<{
    event: string;
    schema: string;
    table: string;
    filter?: string;
    listener: (payload: any) => void;
  }> = [];

  const mockChannel = {
    name: "",
    on: (type: string, filterConfig: any, callback: any) => {
      registeredListeners.push({
        ...filterConfig,
        listener: callback,
      });
      return mockChannel;
    },
    subscribe: () => {
      (mockChannel as any).isSubscribed = true;
      return mockChannel;
    },
    send: (msg: any) => {
      return Promise.resolve(msg);
    },
  };

  const client: any = {
    channel: (name: string) => {
      mockChannel.name = name;
      channels.push(mockChannel);
      return mockChannel;
    },
    removeChannel: async (ch: any) => {
      const idx = channels.indexOf(ch);
      if (idx !== -1) {
        channels.splice(idx, 1);
      }
      return Promise.resolve("ok");
    },
    _getRegisteredListeners: () => registeredListeners,
    _getChannels: () => channels,
  };

  return client;
}

async function runTests() {
  // Test 1: client가 null일 때 unconfigured no-op 동작 검증
  {
    const provider = createMoaLiveProvider(null);
    assert.ok(provider);

    const sub = provider.subscribe({
      channel: "resources/customers",
      types: ["created", "updated"],
      callback: () => {},
    });
    assert.ok(sub);
    assert.equal(sub.id, "unconfigured-noop-channel");

    await provider.unsubscribe(sub);
    provider.publish?.({
      channel: "test",
      type: "created",
      payload: {},
      date: new Date(),
    });
  }

  // Test 2: 테넌트 격리 필터(organization_id=eq.org-123) 자동 주입 검증
  {
    const mockClient = createMockSupabaseClient();
    const provider = createMoaLiveProvider(mockClient, {
      resolveOrgId: () => "org-tenant-abc",
    });

    const receivedEvents: LiveEvent[] = [];
    provider.subscribe({
      channel: "resources/customers",
      types: ["created", "updated", "deleted"],
      callback: (event) => {
        receivedEvents.push(event);
      },
    });

    const listeners = mockClient._getRegisteredListeners();
    assert.equal(listeners.length, 3); // INSERT, UPDATE, DELETE

    // 테넌트 필터가 세팅되었는지 확인
    for (const listener of listeners) {
      assert.equal(listener.schema, "core");
      assert.equal(listener.table, "customers");
      assert.equal(listener.filter, "organization_id=eq.org-tenant-abc");
    }

    // 모의 페이로드 발생 (INSERT)
    listeners[0].listener({
      eventType: "INSERT",
      new: { id: "cust-1", name: "홍길동", organization_id: "org-tenant-abc" },
      commit_timestamp: "2026-10-06T12:00:00Z",
    });

    assert.equal(receivedEvents.length, 1);
    assert.equal(receivedEvents[0].type, "created");
    assert.equal(receivedEvents[0].payload.id, "cust-1");
    assert.equal(receivedEvents[0].payload.name, "홍길동");
  }

  // Test 3: 특정 ID 목록 필터링 (params.ids) 검증
  {
    const mockClient = createMockSupabaseClient();
    const provider = createMoaLiveProvider(mockClient, {
      resolveOrgId: () => "org-tenant-abc",
    });

    const receivedEvents: LiveEvent[] = [];
    provider.subscribe({
      channel: "resources/customers",
      types: ["updated"],
      params: { ids: ["target-id-1"] },
      callback: (event) => {
        receivedEvents.push(event);
      },
    });

    const listeners = mockClient._getRegisteredListeners();
    const updateListener = listeners.find((l: any) => l.event === "UPDATE");
    assert.ok(updateListener);

    // 다른 ID에 대한 UPDATE는 필터링되어 콜백이 호출되지 않음
    updateListener.listener({
      eventType: "UPDATE",
      new: { id: "other-id", name: "이순신" },
      commit_timestamp: "2026-10-06T12:01:00Z",
    });
    assert.equal(receivedEvents.length, 0);

    // 타겟 ID에 대한 UPDATE는 수신됨
    updateListener.listener({
      eventType: "UPDATE",
      new: { id: "target-id-1", name: "홍길동-수정" },
      commit_timestamp: "2026-10-06T12:02:00Z",
    });
    assert.equal(receivedEvents.length, 1);
    assert.equal(receivedEvents[0].payload.name, "홍길동-수정");
  }

  // Test 4: unsubscribe 호출 시 채널 제거 검증
  {
    const mockClient = createMockSupabaseClient();
    const provider = createMoaLiveProvider(mockClient);

    const ch = provider.subscribe({
      channel: "resources/schedules",
      types: ["*"],
      callback: () => {},
    });

    assert.equal(mockClient._getChannels().length, 1);
    await provider.unsubscribe(ch);
    assert.equal(mockClient._getChannels().length, 0);
  }

  // Test 5: 싱글톤 liveProvider 인스턴스 검증
  {
    assert.ok(liveProvider);
    assert.equal(typeof liveProvider.subscribe, "function");
    assert.equal(typeof liveProvider.unsubscribe, "function");
  }

  console.log("liveProvider.test.ts: all tests passed! (100% OK)");
}

runTests().catch((err) => {
  console.error("liveProvider.test.ts failed:", err);
  process.exit(1);
});
