/**
 * Moa-v2 Type-Safe RPC Invoker Kernel
 *
 * Supabase SDK의 엄격한 Database 스키마에 아직 포함되지 않았거나
 * 동적으로 정의된 RPC 함수를 안전하게 호출하기 위한 커널 래퍼입니다.
 * 'as any' 캐스팅을 원천 차단하고 구조적 타이핑(Structural Typing)으로 안전성을 보장합니다.
 */

export interface RpcResponse<TData> {
  data: TData | null;
  error: { message: string; details?: string; hint?: string; code?: string } | null;
}

interface StructuralRpcClient {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{
    data: unknown;
    error: { message: string; details?: string; hint?: string; code?: string } | null;
  }>;
}

/**
 * Supabase 클라이언트의 rpc 메서드를 타입 안전하게 호출합니다.
 *
 * @example
 * const { data, error } = await callRpc<MealSurveySettingsRow>(
 *   client,
 *   'ensure_meal_survey_settings',
 *   { p_org: organizationId }
 * );
 */
export async function callRpc<
  TData = unknown,
  TArgs extends Record<string, unknown> = Record<string, unknown>,
>(
  client: unknown,
  fnName: string,
  args?: TArgs
): Promise<RpcResponse<TData>> {
  if (!client || typeof (client as StructuralRpcClient).rpc !== 'function') {
    return {
      data: null,
      error: {
        message: `Invalid RPC client: 'rpc' method not found for function '${fnName}'`,
      },
    };
  }

  const rpcClient = client as unknown as StructuralRpcClient;
  const result = await rpcClient.rpc(fnName, args);

  return {
    data: (result.data as TData) ?? null,
    error: result.error,
  };
}
