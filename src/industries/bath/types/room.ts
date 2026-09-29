/** 객실 용도. 시설 특성은 별도 컬럼/metadata. */
export const BATH_ROOM_TYPES = ['private', 'family', 'couple', 'vip', 'rest'] as const;
export type BathRoomType = (typeof BATH_ROOM_TYPES)[number];

export const BATH_ROOM_TYPE_LABELS: Record<BathRoomType, string> = {
  private: '개인실',
  family: '가족실',
  couple: '커플실',
  vip: '특실',
  rest: '휴게실',
};

/** 바닥/공간 유형. room_type과 분리. */
export const BATH_FLOOR_TYPES = ['ondol', 'wood', 'tile', 'mixed'] as const;
export type BathFloorType = (typeof BATH_FLOOR_TYPES)[number];

export const BATH_FLOOR_TYPE_LABELS: Record<BathFloorType, string> = {
  ondol: '온돌',
  wood: '마루',
  tile: '타일',
  mixed: '혼합',
};

/** bookable_resources.kind — Core는 이 값을 분기하지 않는다. */
export const BATH_ROOM_RESOURCE_KIND = 'bath_room';

export type BathRoom = {
  id: string;
  organizationId: string;
  resourceId: string;
  roomNumber: string;
  name: string;
  roomType: BathRoomType;
  floorType: BathFloorType;
  capacity: number;
  bathtubCount: number;
  hasScrubStation: boolean;
  hasShower: boolean;
  hasToilet: boolean;
  basePrice: number;
  active: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BathRoomWriteInput = {
  roomNumber: string;
  name: string;
  roomType: BathRoomType;
  floorType: BathFloorType;
  capacity: number;
  bathtubCount?: number;
  hasScrubStation?: boolean;
  hasShower?: boolean;
  hasToilet?: boolean;
  basePrice?: number;
  active?: boolean;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

export type BathRoomListQuery = {
  active?: boolean;
  roomType?: BathRoomType;
};
