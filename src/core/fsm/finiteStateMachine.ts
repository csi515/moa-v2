/**
 * 선언적 유한 상태 머신 엔진 (Declarative Finite State Machine).
 *
 * 예약, 전자결재, 공정 파이프라인, 전자계약 등 전사 업무의 상태 전이를
 * if 분기 하드코딩 대신 선언적 매트릭스(Matrix)와 역할 권한(Role) 가드로 엄격히 제어합니다.
 *
 * 아키텍처 규칙:
 * - core 계층에 위치하므로 capability/industry 모듈을 직접 import하지 않습니다.
 * - @/types barrel을 import하지 않습니다.
 */

export interface TransitionRule<TState extends string, TEvent extends string, TContext = unknown> {
  from: TState;
  to: TState;
  event: TEvent;
  allowedRoles?: readonly string[];
  guard?: (context: TContext, payload?: unknown) => boolean | string;
  description?: string;
}

export interface StateMachineDefinition<TState extends string, TEvent extends string, TContext = unknown> {
  domain: string;
  initialState: TState;
  finalStates?: readonly TState[];
  transitions: readonly TransitionRule<TState, TEvent, TContext>[];
}

export interface TransitionAttemptOptions {
  actorRole?: string;
  actorId?: string;
  reason?: string;
  payload?: unknown;
}

export interface TransitionResult<TState extends string> {
  success: boolean;
  fromState: TState;
  toState: TState;
  error?: string;
  reason?: string;
}

/**
 * 상태 머신 인스턴스 생성
 */
export function createStateMachine<TState extends string, TEvent extends string, TContext = unknown>(
  definition: StateMachineDefinition<TState, TEvent, TContext>
) {
  const { domain, initialState, finalStates = [], transitions } = definition;

  // 빠른 조회를 위한 복합 키 매핑: `${from}:${event}`
  const transitionMap = new Map<string, TransitionRule<TState, TEvent, TContext>>();
  for (const rule of transitions) {
    transitionMap.set(`${rule.from}:${rule.event}`, rule);
  }

  return {
    domain,
    initialState,

    /**
     * 특정 이벤트에 대해 전이 가능 여부 판정
     */
    canTransition(
      currentState: TState,
      event: TEvent,
      context?: TContext,
      options?: TransitionAttemptOptions
    ): boolean {
      const rule = transitionMap.get(`${currentState}:${event}`);
      if (!rule) return false;

      // 1. 역할 권한 검사
      if (rule.allowedRoles && rule.allowedRoles.length > 0) {
        if (!options?.actorRole || !rule.allowedRoles.includes(options.actorRole)) {
          return false;
        }
      }

      // 2. 가드 조건 검사
      if (rule.guard && context) {
        const guardRes = rule.guard(context, options?.payload);
        if (guardRes !== true) return false;
      }

      return true;
    },

    /**
     * 상태 전이 실행
     */
    transition(
      currentState: TState,
      event: TEvent,
      context?: TContext,
      options?: TransitionAttemptOptions
    ): TransitionResult<TState> {
      const rule = transitionMap.get(`${currentState}:${event}`);

      // 1. 등록되지 않은 상태 전이 시도 방어
      if (!rule) {
        return {
          success: false,
          fromState: currentState,
          toState: currentState,
          error: `[FSM:${domain}] '${currentState}' 상태에서는 '${event}' 이벤트를 실행할 수 없습니다.`,
        };
      }

      // 2. 권한 검사 방어
      if (rule.allowedRoles && rule.allowedRoles.length > 0) {
        if (!options?.actorRole || !rule.allowedRoles.includes(options.actorRole)) {
          return {
            success: false,
            fromState: currentState,
            toState: currentState,
            error: `[FSM:${domain}] '${event}' 실행 권한이 없습니다. (필요 권한: ${rule.allowedRoles.join(', ')})`,
          };
        }
      }

      // 3. 비즈니스 가드 조건 검사
      if (rule.guard && context) {
        const guardRes = rule.guard(context, options?.payload);
        if (guardRes !== true) {
          return {
            success: false,
            fromState: currentState,
            toState: currentState,
            error: typeof guardRes === 'string' ? guardRes : `[FSM:${domain}] 상태 전이 가드 조건을 충족하지 못했습니다.`,
          };
        }
      }

      return {
        success: true,
        fromState: currentState,
        toState: rule.to,
        reason: options?.reason,
      };
    },

    /**
     * 현재 상태에서 전이 가능한 다음 전이 룰 목록 조회
     */
    getAvailableTransitions(currentState: TState): readonly TransitionRule<TState, TEvent, TContext>[] {
      return transitions.filter((r) => r.from === currentState);
    },

    /**
     * 종료 상태 여부 판정
     */
    isFinalState(state: TState): boolean {
      return finalStates.includes(state);
    },
  };
}
