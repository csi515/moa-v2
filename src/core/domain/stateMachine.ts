/**
 * 선언적 상태 전이. if/else 복제 대신 machine 테이블을 쓴다.
 */

export type StateTransition<TState extends string, TCommand extends string> = {
  from: TState;
  command: TCommand;
  to: TState;
};

export type StateMachine<TState extends string, TCommand extends string> = {
  name: string;
  states: readonly TState[];
  initial: TState;
  transitions: readonly StateTransition<TState, TCommand>[];
};

export class IllegalStateTransitionError extends Error {
  readonly code = 'illegal_state_transition';
  readonly machine: string;
  readonly from: string;
  readonly command: string;

  constructor(machine: string, from: string, command: string) {
    super(`${machine}: ${from} 에서 ${command} 는 허용되지 않습니다.`);
    this.name = 'IllegalStateTransitionError';
    this.machine = machine;
    this.from = from;
    this.command = command;
  }
}

export function findTransition<TState extends string, TCommand extends string>(
  machine: StateMachine<TState, TCommand>,
  from: TState,
  command: TCommand
): StateTransition<TState, TCommand> | null {
  return (
    machine.transitions.find((row) => row.from === from && row.command === command) ?? null
  );
}

export function canTransition<TState extends string, TCommand extends string>(
  machine: StateMachine<TState, TCommand>,
  from: TState,
  command: TCommand
): boolean {
  return findTransition(machine, from, command) != null;
}

export function applyTransition<TState extends string, TCommand extends string>(
  machine: StateMachine<TState, TCommand>,
  from: TState,
  command: TCommand
): TState {
  const found = findTransition(machine, from, command);
  if (!found) {
    throw new IllegalStateTransitionError(machine.name, from, command);
  }
  return found.to;
}

export function allowedCommands<TState extends string, TCommand extends string>(
  machine: StateMachine<TState, TCommand>,
  from: TState
): TCommand[] {
  return machine.transitions.filter((row) => row.from === from).map((row) => row.command);
}
