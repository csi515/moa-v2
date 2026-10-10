import assert from 'node:assert/strict';
import {
  normalizeToE164,
  formatPhoneDisplay,
  maskPhoneNumber,
} from './phoneValidation';

// 1. Domestic South Korea Standard Mobile (010)
{
  const r1 = normalizeToE164('010-1234-5678');
  assert.equal(r1.isValid, true);
  assert.equal(r1.e164, '+821012345678');
  assert.equal(r1.nationalDigits, '01012345678');
  assert.equal(r1.countryCallingCode, '82');
  assert.equal(r1.isDomestic, true);

  const r2 = normalizeToE164('01012345678');
  assert.equal(r2.isValid, true);
  assert.equal(r2.e164, '+821012345678');
}

// 2. Domestic South Korea Landline (02 Seoul)
{
  const r = normalizeToE164('02-123-4567');
  assert.equal(r.isValid, true);
  assert.equal(r.e164, '+8221234567');
  assert.equal(r.nationalDigits, '021234567');
  assert.equal(r.isDomestic, true);
}

// 3. Domestic with explicit +82
{
  const r1 = normalizeToE164('+82-10-9876-5432');
  assert.equal(r1.isValid, true);
  assert.equal(r1.e164, '+821098765432');
  assert.equal(r1.nationalDigits, '01098765432');
  assert.equal(r1.isDomestic, true);

  // Redundant 0 after +82: +82010...
  const r2 = normalizeToE164('+8201098765432');
  assert.equal(r2.isValid, true);
  assert.equal(r2.e164, '+821098765432');
}

// 4. Foreign numbers (US, Vietnam, Japan)
{
  const us = normalizeToE164('+1 (415) 555-2671');
  assert.equal(us.isValid, true);
  assert.equal(us.e164, '+14155552671');
  assert.equal(us.countryCallingCode, '1');
  assert.equal(us.isDomestic, false);

  const vn = normalizeToE164('+84 90 123 4567');
  assert.equal(vn.isValid, true);
  assert.equal(vn.e164, '+84901234567');
  assert.equal(vn.countryCallingCode, '84');
  assert.equal(vn.isDomestic, false);

  const jp = normalizeToE164('+81 90 1234 5678');
  assert.equal(jp.isValid, true);
  assert.equal(jp.e164, '+819012345678');
  assert.equal(jp.countryCallingCode, '81');
  assert.equal(jp.isDomestic, false);
}

// 5. Invalid numbers
{
  assert.equal(normalizeToE164('').isValid, false);
  assert.equal(normalizeToE164(null).isValid, false);
  assert.equal(normalizeToE164('abc').isValid, false);
  assert.equal(normalizeToE164('123').isValid, false);
}

// 6. formatPhoneDisplay
{
  assert.equal(formatPhoneDisplay('01012345678'), '010-1234-5678');
  assert.equal(formatPhoneDisplay('+821012345678'), '010-1234-5678');
  assert.equal(formatPhoneDisplay('+821012345678', 'international'), '+82 10-1234-5678');
  assert.equal(formatPhoneDisplay('021234567'), '02-123-4567');
  assert.equal(formatPhoneDisplay(''), '-');
}

// 7. maskPhoneNumber
{
  assert.equal(maskPhoneNumber('010-1234-5678'), '010-****-5678');
  assert.equal(maskPhoneNumber('01012345678'), '010-****-5678');
  assert.equal(maskPhoneNumber('02-123-4567'), '02-***-4567');
}

console.log('PASS: phoneValidation.test.ts');
