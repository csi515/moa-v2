/** 신규 사업장 생성 입력 계약. Supabase 클라이언트에 의존하지 않는다. */

export function resolveCreateBusinessRegistrationNumber(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits || /^0+$/.test(digits)) return undefined;
  return trimmed;
}

/** 마법사는 받지 않음. 값이 있으면 그대로, 없거나 공백이면 null. placeholder 금지. */
export function resolveCreateBusinessPhone(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function prepareCreateOrganizationInput(options: {
  name: string;
  representativeName?: string;
  businessPhone?: string | null;
  businessAddress?: string;
  industryCategory?: string;
  businessRegistrationNumber?: string;
}): {
  name: string;
  representativeName: string;
  businessPhone: string | null;
  businessAddress: string;
  industryCategory: string;
  businessRegistrationNumber: string | undefined;
} {
  const name = options.name.trim();
  if (!name) {
    throw new Error('사업장명을 입력해 주세요.');
  }
  const representativeName = options.representativeName?.trim() ?? '';
  if (!representativeName) {
    throw new Error('대표자명을 입력해 주세요.');
  }
  const businessAddress = options.businessAddress?.trim() ?? '';
  if (!businessAddress) {
    throw new Error('사업장 주소를 입력해 주세요.');
  }
  const industryCategory = options.industryCategory?.trim() ?? '';
  if (!industryCategory) {
    throw new Error('업종을 입력해 주세요.');
  }

  return {
    name,
    representativeName,
    businessPhone: resolveCreateBusinessPhone(options.businessPhone),
    businessAddress,
    industryCategory,
    businessRegistrationNumber: resolveCreateBusinessRegistrationNumber(
      options.businessRegistrationNumber
    ),
  };
}
