export interface VipConciergeProfile {
  id: string;
  customerId: string;
  customerName: string;
  vipTier: 'vvd' | 'diamond' | 'black' | 'standard_vip';
  allergies: string[];
  dietaryPreferences: string[];
  roomTemperaturePreference: number;
  musicGenrePreference: string;
  doNotDiscussTopics: string[];
  protocolNotes: string;
  updatedAt: string;
}

export function hasAllergyRisk(profile: VipConciergeProfile, ingredientOrMaterial: string): boolean {
  const target = ingredientOrMaterial.trim().toLowerCase();
  return profile.allergies.some((allergy) => allergy.trim().toLowerCase() === target);
}

export function getRecommendedBeverage(profile: VipConciergeProfile): string {
  const isDecaf = profile.dietaryPreferences.some((p) => p.includes('디카페인'));
  const isVegan = profile.dietaryPreferences.some((p) => p.includes('비건'));

  if (isDecaf && isVegan) return '유기농 루이보스 티 (온음료)';
  if (isDecaf) return '디카페인 아메리카노 (온음료)';
  if (isVegan) return '오트 라떼 (식물성)';
  return '시그니처 드립 커피 또는 탄산수';
}

export function filterVipByTier(
  profiles: VipConciergeProfile[],
  tier: VipConciergeProfile['vipTier']
): VipConciergeProfile[] {
  return profiles.filter((p) => p.vipTier === tier);
}
