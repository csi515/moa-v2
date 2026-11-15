import type { Database } from '@/lib/supabase/database.types';

/**
 * Moa-v2 멀티 스키마 테이블 매핑 타입
 */
export type CoreTables = Database['core']['Tables'];
export type PianoTables = Database['piano']['Tables'];
export type BathTables = Database['bath']['Tables'];
export type PlatformTables = Database['platform']['Tables'];

/** 모든 스키마의 테이블 이름 유니온 */
export type MoaResourceName =
  | keyof CoreTables
  | keyof PianoTables
  | keyof BathTables
  | keyof PlatformTables
  | (string & {});

/** 리소스 이름에 따른 Row 타입 추론 */
export type ResourceRow<T extends string> = T extends keyof CoreTables
  ? CoreTables[T]['Row']
  : T extends keyof PianoTables
  ? PianoTables[T]['Row']
  : T extends keyof BathTables
  ? BathTables[T]['Row']
  : T extends keyof PlatformTables
  ? PlatformTables[T]['Row']
  : Record<string, unknown>;

/** 리소스 이름에 따른 Insert 타입 추론 */
export type ResourceInsert<T extends string> = T extends keyof CoreTables
  ? CoreTables[T]['Insert']
  : T extends keyof PianoTables
  ? PianoTables[T]['Insert']
  : T extends keyof BathTables
  ? BathTables[T]['Insert']
  : T extends keyof PlatformTables
  ? PlatformTables[T]['Insert']
  : Record<string, unknown>;

/** 리소스 이름에 따른 Update 타입 추론 */
export type ResourceUpdate<T extends string> = T extends keyof CoreTables
  ? CoreTables[T]['Update']
  : T extends keyof PianoTables
  ? PianoTables[T]['Update']
  : T extends keyof BathTables
  ? BathTables[T]['Update']
  : T extends keyof PlatformTables
  ? PlatformTables[T]['Update']
  : Record<string, unknown>;
