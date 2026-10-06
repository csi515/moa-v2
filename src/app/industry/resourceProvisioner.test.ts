import assert from 'node:assert/strict';
import { createI18nProvider } from '@/providers/i18nProvider';
import { provisionIndustryResources } from './resourceProvisioner';

async function runTests() {
  // Test 1: 피아노(piano) 업종 프로비저닝 검증
  {
    const i18n = createI18nProvider({ defaultIndustry: 'piano' });
    const resources = provisionIndustryResources({ industry: 'piano', i18n });

    const names = resources.map((r) => r.name);
    assert.deepEqual(names, ['dashboard', 'customers', 'schedules', 'tuition_invoices']);

    const customerRes = resources.find((r) => r.name === 'customers');
    assert.equal(customerRes?.meta?.label, '학생 관리');

    const scheduleRes = resources.find((r) => r.name === 'schedules');
    assert.equal(scheduleRes?.meta?.label, '일정 관리');

    const billingRes = resources.find((r) => r.name === 'tuition_invoices');
    assert.equal(billingRes?.meta?.label, '수강료/결제');
  }

  // Test 2: 필라테스(pilates) 업종 프로비저닝 검증
  {
    const i18n = createI18nProvider({ defaultIndustry: 'pilates' });
    const resources = provisionIndustryResources({ industry: 'pilates', i18n });

    const names = resources.map((r) => r.name);
    assert.deepEqual(names, ['dashboard', 'customers', 'schedules', 'tuition_invoices']);

    const customerRes = resources.find((r) => r.name === 'customers');
    assert.equal(customerRes?.meta?.label, '회원 관리');
  }

  // Test 3: 소매점(retail) 업종 - scheduling, billing 미포함 검증
  {
    const i18n = createI18nProvider({ defaultIndustry: 'retail' });
    const resources = provisionIndustryResources({ industry: 'retail', i18n });

    const names = resources.map((r) => r.name);
    // retail은 roster만 켜져 있고 scheduling, billing은 false
    assert.deepEqual(names, ['dashboard', 'customers']);

    const customerRes = resources.find((r) => r.name === 'customers');
    assert.equal(customerRes?.meta?.label, '고객 관리');
  }

  // Test 4: 사우나(sauna_jjimjilbang) 업종 - billing 미포함 검증
  {
    const i18n = createI18nProvider({ defaultIndustry: 'sauna_jjimjilbang' });
    const resources = provisionIndustryResources({ industry: 'sauna_jjimjilbang', i18n });

    const names = resources.map((r) => r.name);
    // sauna는 roster, scheduling 활성화, billing 비활성화
    assert.deepEqual(names, ['dashboard', 'customers', 'schedules']);
  }

  // Test 5: 피부과(skin_clinic) 업종 프로비저닝 검증
  {
    const i18n = createI18nProvider({ defaultIndustry: 'skin_clinic' });
    const resources = provisionIndustryResources({ industry: 'skin_clinic', i18n });

    const names = resources.map((r) => r.name);
    assert.deepEqual(names, ['dashboard', 'customers', 'schedules', 'tuition_invoices']);

    const customerRes = resources.find((r) => r.name === 'customers');
    assert.equal(customerRes?.meta?.label, '고객 관리');

    const billingRes = resources.find((r) => r.name === 'tuition_invoices');
    assert.equal(billingRes?.meta?.label, '시술비/결제');
  }

  console.log('resourceProvisioner.test.ts: all tests passed! (100% OK)');
}

runTests().catch((err) => {
  console.error('resourceProvisioner.test.ts failed:', err);
  process.exit(1);
});
