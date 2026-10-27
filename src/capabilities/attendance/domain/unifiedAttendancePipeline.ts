/**
 * Unified Attendance Pipeline Engine.
 *
 * 키오스크 PIN, QR, 관리자 수동 출결 등 모든 출결 이벤트의 단일 오케스트레이터입니다.
 * [출결 이벤트] -> [출결 상태 기록 / 원자적 회차권 차감] -> [사이드이펙트 파이프라인] -> [안심 알림]
 */
import { runPinCheckInSideEffects } from '../application/pinCheckInSideEffects';

export type AttendanceEventMethod = 'pin' | 'qr' | 'manual' | 'kiosk';
export type AttendanceEventStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'make_up'
  | 'check_in'
  | 'check_out';

export interface AttendanceEvent {
  organizationId?: string;
  customerId: string;
  customerName?: string;
  method: AttendanceEventMethod;
  timestamp?: string;
  status: AttendanceEventStatus;
  classId?: string;
  className?: string;
  memo?: string;
  actorId?: string;
}

export interface AttendancePipelineContext {
  customer?: any;
  organizationId?: string;
  industry?: string;
  settings?: any;
}

export interface AttendancePipelineStepResult {
  ok: boolean;
  warning?: string;
  data?: any;
}

export interface AttendancePipelineStep {
  id: string;
  name: string;
  enabled: (event: AttendanceEvent, ctx: AttendancePipelineContext) => boolean;
  execute: (
    event: AttendanceEvent,
    ctx: AttendancePipelineContext
  ) => Promise<AttendancePipelineStepResult>;
}

export interface AttendancePipelineResult {
  ok: boolean;
  event: AttendanceEvent;
  warning?: string;
  stepsExecuted: string[];
}

export class UnifiedAttendancePipeline {
  private steps: AttendancePipelineStep[] = [];

  constructor() {
    this.registerDefaultSteps();
  }

  registerStep(step: AttendancePipelineStep): void {
    const existingIdx = this.steps.findIndex((s) => s.id === step.id);
    if (existingIdx >= 0) {
      this.steps[existingIdx] = step;
    } else {
      this.steps.push(step);
    }
  }

  getSteps(): readonly AttendancePipelineStep[] {
    return this.steps;
  }

  private registerDefaultSteps(): void {
    // 1. PIN 체크인 부가 동기화 단계 (사이드이펙트)
    this.registerStep({
      id: 'pin_side_effects',
      name: 'PIN 체크인 부가 동기화',
      enabled: (event) =>
        (event.method === 'pin' || event.method === 'kiosk') &&
        (event.status === 'check_in' || event.status === 'present'),
      execute: async (event) => {
        try {
          const sync = await runPinCheckInSideEffects(event.customerId);
          return { ok: true, warning: sync.warning };
        } catch (err) {
          return {
            ok: false,
            warning: err instanceof Error ? err.message : 'Side effect execution failed',
          };
        }
      },
    });
  }

  async process(
    event: AttendanceEvent,
    ctx: AttendancePipelineContext = {}
  ): Promise<AttendancePipelineResult> {
    const stepsExecuted: string[] = [];
    let warning: string | undefined;

    for (const step of this.steps) {
      if (step.enabled(event, ctx)) {
        stepsExecuted.push(step.id);
        const result = await step.execute(event, ctx);
        if (result.warning && !warning) {
          warning = result.warning;
        }
        if (!result.ok) {
          return {
            ok: false,
            event,
            warning: result.warning || `${step.name} failed`,
            stepsExecuted,
          };
        }
      }
    }

    return {
      ok: true,
      event,
      warning,
      stepsExecuted,
    };
  }
}

/** 시스템 공유 단일 출결 파이프라인 인스턴스 */
export const defaultAttendancePipeline = new UnifiedAttendancePipeline();
