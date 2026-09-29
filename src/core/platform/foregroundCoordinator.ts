/**
 * 네이티브 foreground 복귀 작업 조율.
 * 웹 경로에서는 쓰지 않는다. 단계는 선행 조건 순서를 유지한다.
 */

export const FOREGROUND_STEPS = ['auth', 'org', 'hydrate', 'push'] as const;

export type ForegroundStep = (typeof FOREGROUND_STEPS)[number];

type ForegroundHandler = () => void | Promise<void>;

const handlers = new Map<ForegroundStep, ForegroundHandler>();
let inFlight: Promise<void> | null = null;
let queued = false;

export function registerForegroundStep(
  step: ForegroundStep,
  handler: ForegroundHandler
): () => void {
  handlers.set(step, handler);
  return () => {
    if (handlers.get(step) === handler) handlers.delete(step);
  };
}

async function runQueuedPasses(): Promise<void> {
  do {
    queued = false;
    for (const step of FOREGROUND_STEPS) {
      await handlers.get(step)?.();
    }
  } while (queued);
}

/** 이미 실행 중이면 한 번만 더 이어서 실행한다. */
export function runForegroundResume(): Promise<void> {
  if (inFlight) {
    queued = true;
    return inFlight;
  }
  inFlight = runQueuedPasses().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function isForegroundResumeInFlight(): boolean {
  return inFlight != null;
}

export function resetForegroundCoordinatorForTests(): void {
  handlers.clear();
  inFlight = null;
  queued = false;
}
