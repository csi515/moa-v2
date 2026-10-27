/** PIN 해시 (org + customer + pin 조합, 서버 RPC와 동일 알고리즘) */
export async function hashCheckInPin(
  organizationId: string,
  customerId: string,
  pin: string
): Promise<string> {
  const payload = `${organizationId}:${customerId}:${pin.trim()}`;
  const data = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 4자리 고유 PIN 생성 (충돌 시 재시도) */
export function generatePinCode(length = 4): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/** PIN 형식 검증 */
export function isValidPinFormat(pin: string): boolean {
  const trimmed = pin.trim();
  return /^\d{4,8}$/.test(trimmed);
}
