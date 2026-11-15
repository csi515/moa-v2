/**
 * Moa-v2 사업장 종류별 필요 기능 매트릭스(SSOT) 자동 생성기
 * 실행: npx tsx --import ./scripts/tsx-css-stub.mjs scripts/generate-preset-capability-matrix.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  listIndustryPresets,
  CAPABILITY_BUNDLES,
  PRESET_ALIASES,
} from '../src/app/presets/presetRegistry';

interface PresetInfo {
  id: string;
  name: string;
  category?: string;
  readinessLevel: string;
  capabilities: string[];
  requiredCapabilities: string[];
  terms?: Record<string, string>;
  operatingHours?: {
    slot_minutes?: number;
    open_time?: string;
    close_time?: string;
  };
}

const CATEGORY_MAP: Record<string, { title: string; order: number; desc: string }> = {
  education: {
    title: '1. 교육 및 학원 (Education & Academy)',
    order: 1,
    desc: '원생 출결, 수강권(회수/기간), 레슨 시간표, 학부모 알림 및 진도 관리 중심',
  },
  fitness: {
    title: '2. 웰니스 및 피트니스 (Wellness & Fitness)',
    order: 2,
    desc: '회원권 패스, 시설 락커, 수업/PT 예약, 운동 출결 및 강사 매칭 중심',
  },
  beauty: {
    title: '3. 뷰티 및 케어 (Beauty & Care)',
    order: 3,
    desc: '시술 예약, 차트/상담 CRM, 디자이너 배정, 시술권 및 재고 관리 중심',
  },
  space: {
    title: '4. 공간 및 숙박 (Space & Hospitality)',
    order: 4,
    desc: '좌석/룸/스터디존 배정, 시간제 티켓, 락커 보관, 시설 정비 체크리스트 중심',
  },
  retail: {
    title: '5. 리테일 및 F&B (Retail & Food Service)',
    order: 5,
    desc: '상품 판매, 재고 수불, 바우처, 발주/공급망, 테이블 및 주문 관리 중심',
  },
  service: {
    title: '6. 라이프 서비스 및 정비 (Life Service & Maintenance)',
    order: 6,
    desc: '작업 오더 파이프라인, 정비/점검 체크리스트, 서비스 예약, 부품 재고 중심',
  },
  enterprise: {
    title: '7. 기업 및 특수 도메인 (Enterprise & Specialized)',
    order: 7,
    desc: '전자결재, 부서/업무 파이프라인, MBO 목표, 사내 복지/공간, ISO 규격 관리 중심',
  },
};

function inferCategory(id: string, explicitCategory?: string): string {
  if (explicitCategory && CATEGORY_MAP[explicitCategory]) {
    return explicitCategory;
  }
  if (
    id.includes('academy') ||
    id === 'piano' ||
    id === 'exam_tutoring' ||
    id === 'culture_center' ||
    id === 'daycare'
  ) {
    return 'education';
  }
  if (
    id === 'pilates' ||
    id === 'yoga_studio' ||
    id === 'gym_fitness' ||
    id === 'pt_fitness' ||
    id === 'indoor_golf' ||
    id === 'swim_school' ||
    id === 'climbing_activity' ||
    id === 'boxing_mma'
  ) {
    return 'fitness';
  }
  if (
    id === 'hair_salon' ||
    id === 'barber_shop' ||
    id === 'nail_salon' ||
    id === 'skin_clinic' ||
    id === 'massage_spa' ||
    id === 'tattoo_studio'
  ) {
    return 'beauty';
  }
  if (
    id === 'study_cafe' ||
    id === 'shared_office' ||
    id === 'space_rental' ||
    id === 'locker_storage' ||
    id === 'guesthouse' ||
    id === 'small_hotel' ||
    id === 'sauna_jjimjilbang'
  ) {
    return 'space';
  }
  if (
    id === 'retail' ||
    id === 'apparel_store' ||
    id === 'convenience_store' ||
    id === 'pet_supplies' ||
    id === 'cafe' ||
    id === 'restaurant'
  ) {
    return 'retail';
  }
  if (
    id === 'auto_repair' ||
    id === 'cleaning_service' ||
    id === 'pet_grooming' ||
    id === 'pet_hotel' ||
    id === 'equipment_rental' ||
    id === 'craft_repair' ||
    id === 'self_carwash' ||
    id === 'photo_studio'
  ) {
    return 'service';
  }
  return 'enterprise';
}

function generateMarkdown(): string {
  const presets = listIndustryPresets() as PresetInfo[];
  const grouped: Record<string, PresetInfo[]> = {};

  for (const p of presets) {
    const cat = inferCategory(p.id, p.category);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  const allCaps = new Set<string>();
  for (const p of presets) {
    p.capabilities.forEach((c) => allCaps.add(c));
  }

  let md = `# Moa-v2 사업장 종류별 필요 기능 매트릭스 (Preset Capability Matrix SSOT)

> **불변 원칙 (Constitution)**: Core는 업종을 모르고, Capability는 업종 중립적이며, Preset은 업종별 Capability 조합을 선언적으로 정의합니다.
> 본 문서는 Moa-v2에 등록된 **총 ${presets.length}개 업종별 프리셋**과 **${allCaps.size}개 재사용 기능(Capability)**의 연계 구성을 정의하는 단일 진실 공급원(SSOT)입니다.
> 
> *자동 생성 및 검증: \`npm run check:preset-parity\`*

---

## 1. 범례 및 기능 구성 규칙

* 🔴 **필수 (Required)**: 해당 사업장 운영의 핵심 불변 기능으로, 비활성화가 불가능함 (\`requiredCapabilities\`).
* 🟢 **기본 활성화 (Default Active)**: 프리셋 선택 시 기본 활성화되며, 원장/관리자가 스위치보드에서 토글 가능함 (\`capabilities\`).
* ⚪ **선택 부가 (Add-on)**: 기본값은 비활성화이나 필요 시 스위치보드에서 추가 활성화 가능.
* ❌ **미지원 / 비권장 (N/A)**: 해당 업종 업무 도메인과 무관함.

---

## 2. 7대 산업군별 프리셋 요약 및 도메인 용어 매트릭스

| 산업군 | 업종 수 | 대표 업종 | 주요 도메인 용어 (고객 / 공간 / 담당자) |
| :--- | :---: | :--- | :--- |
`;

  const sortedCatKeys = Object.keys(CATEGORY_MAP).sort(
    (a, b) => CATEGORY_MAP[a].order - CATEGORY_MAP[b].order
  );

  for (const catKey of sortedCatKeys) {
    const info = CATEGORY_MAP[catKey];
    const catPresets = grouped[catKey] || [];
    const sampleNames = catPresets.slice(0, 3).map((p) => p.name).join(', ');
    md += `| **${info.title.split(' (')[0]}** | ${catPresets.length}개 | ${sampleNames} 등 | 원생/회원/고객, 연습실/룸/좌석, 강사/디자이너 등 |\n`;
  }

  md += `\n---\n\n## 3. 산업군별 상세 프리셋 및 필요 기능 정의\n\n`;

  for (const catKey of sortedCatKeys) {
    const info = CATEGORY_MAP[catKey];
    const catPresets = grouped[catKey] || [];
    md += `### ${info.title}\n\n`;
    md += `> ${info.desc}\n\n`;

    md += `| 업종 ID | 국문 명칭 | 완성도 | 고객 호칭 | 공간 호칭 | 필수 기능 (Required) | 기본 활성화 기능 (Capabilities) |\n`;
    md += `| :--- | :--- | :---: | :---: | :---: | :--- | :--- |\n`;

    for (const p of catPresets) {
      const custTerm = p.terms?.customer ?? '고객';
      const spaceTerm = p.terms?.space ?? '공간';
      const reqList = p.requiredCapabilities && p.requiredCapabilities.length > 0
        ? p.requiredCapabilities.map((c) => `\`${c}\``).join(', ')
        : '*(선언 위임)*';
      const capList = p.capabilities.map((c) => {
        const isReq = p.requiredCapabilities?.includes(c);
        return isReq ? `**\`${c}\`**` : `\`${c}\``;
      }).join(', ');

      md += `| \`${p.id}\` | **${p.name}** | \`${p.readinessLevel}\` | ${custTerm} | ${spaceTerm} | ${reqList} | ${capList} |\n`;
    }

    md += `\n`;
  }

  md += `---

## 4. 핵심 8대 대표 업종 정밀 기능 매트릭스

| 원자적 기능 (Capability) | 피아노 | 영수학원 | 필라테스 | 헬스/PT | 헤어살롱 | 셀렉트샵 | 스터디카페 | 일반기업 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
`;

  const CORE_8_PRESETS = [
    'piano',
    'general_academy',
    'pilates',
    'gym_fitness',
    'hair_salon',
    'retail',
    'study_cafe',
    'general_enterprise',
  ];

  const presetsMap = new Map<string, PresetInfo>(presets.map((p) => [p.id, p]));

  // 주요 20개 핵심 capability 추출
  const MAJOR_CAPS = [
    { id: 'attendance', name: '출결 관리' },
    { id: 'passes', name: '이용권 / 회원권' },
    { id: 'booking', name: '예약 / 레슨 배정' },
    { id: 'seat_room', name: '좌석 / 룸 / 공간' },
    { id: 'locker', name: '락커 보관함' },
    { id: 'billing_invoicing', name: '수납 / 청구' },
    { id: 'consultation_crm', name: '상담 / CRM' },
    { id: 'inventory', name: '재고 / 소모품' },
    { id: 'entry_pass_ticket', name: '출입 바코드 / 티켓' },
    { id: 'curriculum_progress', name: '진도 / 커리큘럼' },
    { id: 'exam_grade_analytics', name: '성적 / 평가 분석' },
    { id: 'learning_journal', name: '학습 / 레슨 일지' },
    { id: 'treatment_chart', name: '시술 / 차트 관리' },
    { id: 'loyalty_stamp', name: '스탬프 / 쿠폰' },
    { id: 'approval_workflow', name: '전자결재' },
    { id: 'task_pipeline', name: '업무 파이프라인' },
    { id: 'mbo', name: 'MBO 목표 관리' },
    { id: 'workplace_policy', name: '사내 규정' },
    { id: 'feedbacks', name: '피드백 / 고충' },
    { id: 'shuttle_dispatch', name: '셔틀 / 배차' },
  ];

  for (const cap of MAJOR_CAPS) {
    let row = `| **${cap.name}** (\`${cap.id}\`) `;
    for (const pId of CORE_8_PRESETS) {
      const p = presetsMap.get(pId);
      if (!p) {
        row += `| ❌ `;
        continue;
      }
      const isReq = p.requiredCapabilities?.includes(cap.id);
      const isAct = p.capabilities.includes(cap.id);
      if (isReq) {
        row += `| 🔴 `;
      } else if (isAct) {
        row += `| 🟢 `;
      } else {
        row += `| ❌ `;
      }
    }
    row += `|\n`;
    md += row;
  }

  md += `
---

## 5. 프리셋 별칭 (Preset Aliases) 매핑 현황 (총 ${Object.keys(PRESET_ALIASES).length}개)

사용자가 온보딩이나 검색 시 유사 키워드를 입력했을 때 표준 프리셋으로 자동 라우팅되는 별칭 목록입니다:

| 별칭 키워드 (Alias) | 매핑되는 표준 프리셋 (Target Preset) |
| :--- | :--- |
`;

  for (const [alias, target] of Object.entries(PRESET_ALIASES)) {
    const targetPreset = presetsMap.get(target);
    md += `| \`${alias}\` | \`${target}\` (${targetPreset?.name ?? '미상'}) |\n`;
  }

  md += `
---

## 6. 개발 및 유지보수 수칙

1. **문서 수정 금지 원칙**: 본 문서는 \`src/app/presets/presetRegistry.ts\`를 단일 진실 공급원(SSOT)으로 삼아 자동 생성됩니다.
2. **동기화 검증**: 빌드 및 PR 전 \`npm run check:preset-parity\`를 통해 코드와 매트릭스의 일치 여부를 검증합니다.
3. **새 업종 추가 절차**:
   * \`src/app/presets/presetRegistry.ts\`에 \`IndustryPresetDefinition\` 작성.
   * \`npm run check:preset-parity\` 실행하여 자동 패리티 확인.
`;

  return md;
}

const targetPath = path.resolve(process.cwd(), 'docs/PRESET_CAPABILITY_MATRIX.md');
const content = generateMarkdown();
fs.writeFileSync(targetPath, content, 'utf-8');
console.log(`✓ PRESET_CAPABILITY_MATRIX.md 생성 완료: ${targetPath}`);
