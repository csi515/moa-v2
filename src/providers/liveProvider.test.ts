import assert from "node:assert/strict";
import { createMoaLiveProvider } from "./liveProvider";

console.log("[TEST] liveProvider pure logic running...");

// 1. Unconfigured client returns safe no-op provider
{
  const noopProvider = createMoaLiveProvider(null);
  assert.equal(typeof noopProvider.subscribe, "function");
  assert.equal(typeof noopProvider.unsubscribe, "function");
  assert.equal(typeof noopProvider.publish, "function");

  const channel = noopProvider.subscribe({
    channel: "resources/customers",
    types: ["*"],
    callback: () => {},
  });
  assert.equal(channel.id, "unconfigured-noop-channel");
}

// 2. Mock client channel subscription & filtering verification
{
  let createdChannelName = "";
  let registeredListener: ((payload: any) => void) | null = null;
  let registeredConfig: any = null;

  const mockChannel = {
    on: (type: string, config: any, listener: any) => {
      registeredConfig = config;
      registeredListener = listener;
      return mockChannel;
    },
    subscribe: () => ({ id: "mock-channel-id" }),
  };

  const mockClient: any = {
    channel: (name: string) => {
      createdChannelName = name;
      return mockChannel;
    },
  };

  const provider = createMoaLiveProvider(mockClient, {
    resolveOrgId: () => "org-1234",
    defaultSchema: "core",
  });

  // Test customers subscription (uses organization_id)
  provider.subscribe({
    channel: "resources/customers",
    types: ["created", "updated"],
    callback: () => {},
  });

  assert.equal(registeredConfig.schema, "core");
  assert.equal(registeredConfig.table, "customers");
  assert.equal(registeredConfig.filter, "organization_id=eq.org-1234");
  assert.match(createdChannelName, /^live:resources\/customers/);

  // Test onboarding_tokens subscription (uses tenant_id)
  provider.subscribe({
    channel: "resources/onboarding_tokens",
    types: ["*"],
    callback: () => {},
  });

  assert.equal(registeredConfig.table, "onboarding_tokens");
  assert.equal(registeredConfig.filter, "tenant_id=eq.org-1234");
}

// 3. Callback invocation & event mapping
{
  let receivedEvent: any = null;
  let listenerFn: any = null;

  const mockChannel = {
    on: (_type: string, _config: any, listener: any) => {
      listenerFn = listener;
      return mockChannel;
    },
    subscribe: () => ({ id: "mock-channel-id" }),
  };

  const mockClient: any = {
    channel: () => mockChannel,
  };

  const provider = createMoaLiveProvider(mockClient, {
    resolveOrgId: () => "org-test",
  });

  provider.subscribe({
    channel: "resources/attendance_sessions",
    types: ["created", "updated", "deleted"],
    callback: (event) => {
      receivedEvent = event;
    },
  });

  // Simulate Supabase Realtime UPDATE event for same tenant
  assert.ok(listenerFn);
  listenerFn({
    eventType: "UPDATE",
    commit_timestamp: "2026-10-09T00:00:00Z",
    new: { id: "session-999", status: "present", organization_id: "org-test" },
  });

  assert.equal(receivedEvent.channel, "resources/attendance_sessions");
  assert.equal(receivedEvent.type, "updated");
  assert.equal(receivedEvent.payload.id, "session-999");
  assert.equal(receivedEvent.payload.status, "present");

  // Cross-tenant event suppression: Simulate Realtime event belonging to a different tenant
  let foreignEventCalled = false;
  provider.subscribe({
    channel: "resources/attendance_sessions",
    types: ["*"],
    callback: () => {
      foreignEventCalled = true;
    },
  });

  assert.ok(listenerFn);
  listenerFn({
    eventType: "INSERT",
    commit_timestamp: "2026-10-09T00:00:00Z",
    new: { id: "session-cross-tenant", status: "present", organization_id: "org-foreign" },
  });
  assert.equal(foreignEventCalled, false, "foreign tenant realtime event must be dropped by listener");
}

// 4. Fail-closed: Missing activeOrgId returns safe no-op channel for tenant resources
{
  let channelCreated = false;
  const mockClient: any = {
    channel: () => {
      channelCreated = true;
      return {};
    },
  };

  const provider = createMoaLiveProvider(mockClient, {
    resolveOrgId: () => null,
  });

  const noopChannel = provider.subscribe({
    channel: "resources/customers",
    types: ["*"],
    callback: () => {},
  });

  assert.equal(noopChannel.id, "unscoped-customers-noop-channel");
  assert.equal(channelCreated, false, "client.channel must not be invoked when activeOrgId is unresolved");
}

console.log("[TEST] liveProvider tests ALL PASSED!");
