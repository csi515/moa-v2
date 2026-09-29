import {
  PUSH_TOKEN_STORAGE_KEY,
  type PushDeviceToken,
  type PushPlatform,
} from './types';

function readRaw(): PushDeviceToken[] {
  try {
    const raw = localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PushDeviceToken[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(list: PushDeviceToken[]): void {
  localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, JSON.stringify(list));
}

export function getLocalPushTokens(): PushDeviceToken[] {
  return readRaw();
}

export function upsertLocalPushToken(input: {
  token: string;
  platform: PushPlatform;
  userId: string;
  organizationId?: string;
}): PushDeviceToken {
  const list = readRaw().filter((t) => t.token !== input.token);
  const saved: PushDeviceToken = {
    ...input,
    updatedAt: new Date().toISOString(),
  };
  list.unshift(saved);
  writeRaw(list.slice(0, 20));
  return saved;
}

export function clearLocalPushTokensForUser(userId: string): void {
  writeRaw(readRaw().filter((t) => t.userId !== userId));
}
