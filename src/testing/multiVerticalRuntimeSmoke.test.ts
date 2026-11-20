/**
 * Moa-v2 Multi-Vertical Runtime Parity & Architecture Smoke Suite
 *
 * 5대 핵심 버티컬(교육: piano, 피트니스: gym, 공간: study_cafe, 상거래: retail, 케어: daycare)의
 * 런타임 프리셋 조립, 리소스 프로비저닝, 다형성 결제 품목 분배 및 테넌트 스토리지 무결성을 검증합니다.
 *
 * 실행: npx tsx src/testing/multiVerticalRuntimeSmoke.test.ts
 */
import assert from 'node:assert/strict';
import { assemblePreset } from '@/app/presets/presetAssembler';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { provisionIndustryResources } from '@/app/industry/resourceProvisioner';
import { getTerminologyDictionary } from '@/core/terminology/dictionaries';
import { translateTerm } from '@/core/terminology/translate';
import { studentToCustomer, customerToStudent } from '@/core/students/studentAdapter';
import { partitionPayableItems, type PayableItem } from '@/capabilities/billing/finance/payableItem';
import { resolveStorageKey, setOrganizationId } from '@/services/adapters';
import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';
import type { IndustryPresetId } from '@/app/presets/presetRegistry';

interface VerticalScenario {
  id: string;
  name: string;
  expectedCategory: string;
  expectedMemberTerm: string;
  requiredCapabilities: string[];
}

const FIVE_REPRESENTATIVE_VERTICALS: VerticalScenario[] = [
  {
    id: 'piano',
    name: '피아노 학원',
    expectedCategory: 'education',
    expectedMemberTerm: '학생',
    requiredCapabilities: ['attendance', 'passes', 'billing_invoicing'],
  },
  {
    id: 'gym',
    name: '피트니스/헬스장',
    expectedCategory: 'fitness',
    expectedMemberTerm: '회원',
    requiredCapabilities: ['passes', 'attendance', 'locker'],
  },
  {
    id: 'study_cafe',
    name: '스터디카페',
    expectedCategory: 'studio',
    expectedMemberTerm: '고객',
    requiredCapabilities: ['seat_room', 'passes'],
  },
  {
    id: 'retail',
    name: '일반 리테일/매장',
    expectedCategory: 'other',
    expectedMemberTerm: '고객',
    requiredCapabilities: ['inventory', 'ledger_simple'],
  },
  {
    id: 'daycare',
    name: '어린이집/데이케어',
    expectedCategory: 'childcare',
    expectedMemberTerm: '원아',
    requiredCapabilities: ['attendance', 'billing_invoicing'],
  },
];

console.log('🚀 [TEST] Multi-Vertical Runtime Smoke Suite Starting...\n');

// 1. 프리셋 조립 & 리소스 프로비저닝 런타임 무결성 검증
console.log('=== [1] Preset Dynamic Assembly & Resource Provisioning ===');
for (const v of FIVE_REPRESENTATIVE_VERTICALS) {
  const preset = getIndustryPreset(v.id);
  assert.ok(preset, `[${v.id}] 프리셋 정의가 존재해야 합니다.`);
  assert.ok(preset.id === v.id || preset.id === `${v.id}_fitness`, `[${v.id}] 프리셋 ID 일치`);

  // assemblePreset 런타임 실행 (컴포넌트 리소스 및 온보딩 스키마 결합)
  const assembled = assemblePreset(v.id);
  assert.ok(assembled, `[${v.id}] assemblePreset 실행 성공`);
  assert.ok(Array.isArray(assembled.resources), `[${v.id}] resources 배열 반환`);
  assert.ok(assembled.resources.length > 0, `[${v.id}] 최소 1개 이상의 Refine 리소스가 등록되어야 함`);

  // 필수 Capability 포함 여부 검증
  for (const capId of v.requiredCapabilities) {
    assert.ok(
      preset.capabilities.includes(capId as unknown as CapabilityId),
      `[${v.id}] 필수 Capability '${capId}' 가 누락되었습니다.`
    );
  }

  // provisionIndustryResources 런타임 실행
  const mockI18n = { translate: (_key: string, fallback?: string) => fallback ?? _key };
  const provisioned = provisionIndustryResources({
    industry: v.id as unknown as IndustryPresetId,
    i18n: mockI18n,
    activeCapabilities: [...preset.capabilities],
  });
  assert.ok(provisioned.length > 0, `[${v.id}] 프로비저닝된 리소스가 존재해야 함`);

  console.log(`  ✓ ${v.name} (${v.id}): ${assembled.resources.length}개 리소스 조립 완료`);
}

// 2. 용어 다형성 (Terminology Polymorphism) 런타임 검증
console.log('\n=== [2] Terminology Polymorphism ===');
for (const v of FIVE_REPRESENTATIVE_VERTICALS) {
  const dict = getTerminologyDictionary(v.id as unknown as IndustryPresetId);
  assert.ok(dict, `[${v.id}] 업종별 용어 사전이 존재해야 함`);
  const memberTerm = translateTerm(dict, 'customer.singular');
  assert.equal(
    memberTerm,
    v.expectedMemberTerm,
    `[${v.id}] 고객 단수 명칭 불일치: 기대값 '${v.expectedMemberTerm}', 실제값 '${memberTerm}'`
  );
  console.log(`  ✓ ${v.name}: 대상 호칭 -> '${memberTerm}'`);
}

// 3. 다형성 결합 결제 품목 분배 (PayableItem Partitioning) 검증
console.log('\n=== [3] Polymorphic Payable Items Partitioning ===');
{
  const mockItems: PayableItem[] = [
    { id: 'tuition-1', type: 'tuition', title: '정규 피아노 수강료', amount: 180000 },
    { id: 'pass-1', type: 'pass', title: '헬스 3개월 정기권', amount: 300000 },
    { id: 'book-1', type: 'retail_item', title: '바이엘 1권', amount: 12000 },
    { id: 'snack-1', type: 'retail_item', title: '단백질 쉐이크', amount: 3500 },
  ];

  const partitioned = partitionPayableItems(mockItems);
  assert.deepEqual(partitioned.tuitionItemIds, ['tuition-1', 'pass-1']);
  assert.deepEqual(partitioned.retailItemIds, ['book-1', 'snack-1']);
  console.log('  ✓ 수강료/수강권 및 리테일 상품 품목이 올바르게 분배됨 (tuition: 2건, retail: 2건)');
}

// 4. 범용 Customer <-> Legacy Student 어댑터 양방향 안전성 검증
console.log('\n=== [4] Customer-Student Bidirectional Adapter Safety ===');
{
  const sourceStudent = {
    id: 'stud-test-001',
    name: '홍길동',
    phone: '01012345678',
    parentName: '홍판서',
    parentPhone: '01087654321',
    status: 'active' as const,
    tuitionFee: 150000,
    paymentDay: 25,
    createdAt: '2026-11-19T00:00:00.000Z',
    updatedAt: '2026-11-19T00:00:00.000Z',
  };

  const customer = studentToCustomer(sourceStudent);
  assert.equal(customer.id, sourceStudent.id);
  assert.equal(customer.name, sourceStudent.name);
  assert.equal(customer.contacts?.[0]?.name, '홍판서');
  assert.equal(customer.metadata?.tuitionFee, 150000);

  const restored = customerToStudent(customer);
  assert.equal(restored.id, sourceStudent.id);
  assert.equal(restored.name, sourceStudent.name);
  assert.equal(restored.parentName, '홍판서');
  assert.equal(restored.tuitionFee, 150000);
  console.log('  ✓ Student -> Customer -> Student 양방향 변환 시 데이터 무결성 보존 확인');
}

// 5. 스토리지 테넌트 격리 키 결정론 검증
console.log('\n=== [5] Tenant Storage Key Determinism ===');
{
  setOrganizationId('org-alpha-123');
  const keyAlpha = resolveStorageKey('moa_tokens');
  assert.equal(keyAlpha, 'moa_tokens_org-alpha-123');

  setOrganizationId('org-beta-456');
  const keyBeta = resolveStorageKey('moa_tokens');
  assert.equal(keyBeta, 'moa_tokens_org-beta-456');

  setOrganizationId(null);
  const keyNull = resolveStorageKey('moa_tokens');
  assert.equal(keyNull, 'moa_tokens');
  console.log('  ✓ 활성 조직에 따른 스토리지 키 격리 정상 동작 확인');
}

console.log('\n🎉 [PASS] Multi-Vertical Runtime Smoke Suite Passed 100%!');
