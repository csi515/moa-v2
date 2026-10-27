/**
 * 신규 사업장 생성 — 전화번호는 선택, 주소는 필수
 * 실행: npm run test:create-organization-phone
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  prepareCreateOrganizationInput,
  resolveCreateBusinessPhone,
} from './createOrganizationInput';

function run() {
  assert.equal(resolveCreateBusinessPhone(undefined), null);
  assert.equal(resolveCreateBusinessPhone(null), null);
  assert.equal(resolveCreateBusinessPhone(''), null);
  assert.equal(resolveCreateBusinessPhone('   '), null);
  assert.equal(resolveCreateBusinessPhone('02-123-4567'), '02-123-4567');
  assert.equal(resolveCreateBusinessPhone('  010-1111-2222  '), '010-1111-2222');

  const prepared = prepareCreateOrganizationInput({
    name: '모아피아노',
    representativeName: '김원장',
    businessAddress: '서울시 강남구 테헤란로 1',
    industryCategory: 'education',
  });
  assert.equal(prepared.businessPhone, null);
  assert.equal(prepared.name, '모아피아노');

  const preparedWithPhone = prepareCreateOrganizationInput({
    name: '모아피아노',
    representativeName: '김원장',
    businessPhone: '010-0000-0000',
    businessAddress: '서울시 강남구 테헤란로 1',
    industryCategory: 'education',
  });
  assert.equal(preparedWithPhone.businessPhone, '010-0000-0000');

  assert.throws(
    () =>
      prepareCreateOrganizationInput({
        name: '모아피아노',
        representativeName: '김원장',
        businessAddress: '',
        industryCategory: 'education',
      }),
    /사업장 주소를 입력해 주세요/
  );
  assert.throws(
    () =>
      prepareCreateOrganizationInput({
        name: '모아피아노',
        representativeName: '',
        businessAddress: '서울시 강남구',
        industryCategory: 'education',
      }),
    /대표자명을 입력해 주세요/
  );
  assert.doesNotThrow(() =>
    prepareCreateOrganizationInput({
      name: '모아피아노',
      representativeName: '김원장',
      businessPhone: '',
      businessAddress: '서울시 강남구',
      industryCategory: 'education',
    })
  );

  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(
    join(
      here,
      '../../../../supabase/migrations/20260925120000_create_organization_optional_phone.sql'
    ),
    'utf8'
  );
  assert.match(sql, /v_phone := NULLIF/);
  assert.equal(sql.includes("RAISE EXCEPTION '사업장 전화번호를 입력해 주세요.'"), false);
  assert.match(sql, /사업장 주소를 입력해 주세요/);
  assert.match(sql, /사업장 전화번호는 선택/);
  assert.equal(
    sql.includes("NULLIF(trim(COALESCE(p_address_detail), '')), '')"),
    false
  );
  assert.match(sql, /NULLIF\(trim\(COALESCE\(p_address_detail, ''\)\), ''\)/);

  const insert = sql.match(
    /INSERT INTO core\.organizations\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)\s*RETURNING/
  );
  assert.ok(insert, 'create_organization INSERT 본문이 없습니다');
  const columns = insert[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  let depth = 0;
  let valueCount = 1;
  for (const ch of insert[2]) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    else if (ch === ',' && depth === 0) valueCount += 1;
  }
  assert.equal(columns.length, 16);
  assert.equal(valueCount, columns.length, 'INSERT 컬럼 수와 VALUES 수가 같아야 한다');
  assert.match(insert[2], /p_sigungu/);
  assert.equal(sql.includes("RAISE EXCEPTION '사업장 전화번호를 입력해 주세요.'"), false);

  const service = readFileSync(join(here, 'organizationService.ts'), 'utf8');
  assert.match(service, /p_sido: parts\?\.sido/);
  assert.match(service, /p_sigungu: parts\?\.sigungu/);
  assert.match(service, /p_dong: parts\?\.dong/);
  assert.match(service, /p_address_detail: parts\?\.addressDetail/);
  assert.equal(service.includes('detail_address'), false);
  assert.match(service, /p_business_registration_number: prepared\.businessRegistrationNumber \?\? null/);

  const wizard = readFileSync(join(here, '../CreateOrganizationWizard.tsx'), 'utf8');
  assert.match(wizard, /addressParts/);
  assert.equal(wizard.includes('detail_address'), false);

  console.log('createOrganizationPhone.test.ts: ok');
}

run();
