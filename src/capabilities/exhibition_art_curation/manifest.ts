import { defineCapability } from '../_shared/capabilityTypes';

export const exhibition_art_curationCapability = defineCapability({
  id: 'exhibition_art_curation',
  displayName: '원내 작품 전시·아트 렌탈 및 캡션 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
