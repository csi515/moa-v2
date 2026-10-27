import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(): void {
  const filePath = resolve(process.cwd(), 'src/pages/workspace/CompanyAppLauncherDashboard.tsx');
  const content = readFileSync(filePath, 'utf-8');

  // 1. 7개 정예 앱 라벨 확인 (작업표준·위험성평가 포함, 독립 조직도 제외)
  assert.ok(content.includes("label: '연구소'"), '연구소 앱이 포함되어야 합니다.');
  assert.ok(content.includes("label: '셔틀버스'"), '셔틀버스 앱이 포함되어야 합니다.');
  assert.ok(content.includes("label: 'MBO'"), 'MBO 앱이 포함되어야 합니다.');
  assert.ok(content.includes("label: '공용 자원'"), '공용 자원 앱이 포함되어야 합니다.');
  assert.ok(content.includes("label: '작업표준·위험성평가'"), '작업표준·위험성평가 앱이 포함되어야 합니다.');
  assert.ok(content.includes("label: '사내 소통'"), '사내 소통 앱이 포함되어야 합니다.');
  assert.ok(content.includes("label: '설정'"), '설정 앱이 포함되어야 합니다.');

  // 2. 조직도는 독립 앱 그리드가 아닌 설정 내로 통합되었음을 확인
  assert.ok(!content.includes("label: '조직도'"), '조직도는 독립 앱 그리드에 없어야 합니다.');
  assert.ok(content.includes("description: '조직도·부서, 권한 관리'"), '설정 앱 설명에 조직도가 포함되어야 합니다.');

  // 3. 작업표준·위험성평가 진입점 및 경로 확인
  assert.ok(content.includes("to: '/workspace/sop-risk'"), '작업표준·위험성평가 경로는 /workspace/sop-risk 이어야 합니다.');

  // 4. 공용 자원의 설명이 "건강관리실, 차량 예약"인지 확인
  assert.ok(
    content.includes("description: '건강관리실, 차량 예약'"),
    '공용 자원 설명은 "건강관리실, 차량 예약"이어야 합니다.'
  );

  // 5. 근태·휴가 앱 및 전자결재 앱이 홈 그리드에서 배제되었는지 확인
  assert.ok(!content.includes("label: '근태·휴가'"), '근태·휴가 앱은 없어야 합니다.');
  assert.ok(!content.includes("label: '전자 결재'"), '전자 결재 독립 앱은 없어야 합니다.');

  // 6. 설정 화면(DynamicRoleSettingsPage.tsx)에 조직도 탭이 통합되었는지 확인
  const settingsFilePath = resolve(process.cwd(), 'src/pages/settings/DynamicRoleSettingsPage.tsx');
  const settingsContent = readFileSync(settingsFilePath, 'utf-8');
  assert.ok(settingsContent.includes('OrganizationTreePage'), '설정 화면에 OrganizationTreePage가 포함되어야 합니다.');
  assert.ok(settingsContent.includes('조직도·부서 관리'), '설정 화면에 조직도·부서 관리 탭이 있어야 합니다.');
  assert.ok(settingsContent.includes('직급 및 권한 매트릭스'), '설정 화면에 직급 및 권한 탭이 있어야 합니다.');

  console.log('companyAppLauncher.test.ts: ok');
}

run();
