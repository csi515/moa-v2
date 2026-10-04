/**
 * 안내 템플릿 요금명은 industry id가 아니라 getFeeLabel(매니페스트 feeLabel)을 따른다.
 * 실행: node node_modules/tsx/dist/cli.mjs src/core/notices/noticeTemplates.test.ts
 */
import assert from 'node:assert/strict';
import { installIndustryPlugins } from '@/core/industry/pluginHost';
import { getFeeLabel } from '@/core/industry/industryUi';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { buildNoticeTemplates, getNoticePlaceWords } from './noticeTemplates';

const accent = { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' };

function plugin(
  id: IndustryPluginManifest['id'],
  label: string,
  feeLabel: string,
  placeLabel: string
): IndustryPluginManifest {
  return {
    id,
    option: { value: id, label, description: 'desc' },
    theme: 'indigo',
    accent,
    attendanceDefault: false,
    usesClassBasedSchedule: false,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '레벨',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel,
    feeLabel,
  };
}

installIndustryPlugins([
  plugin('piano', '피아노학원', '수강료', '학원'),
  plugin('gym', '체육관', '회비', '체육관'),
  plugin('daycare', '어린이집', '보육료', '원'),
  plugin('skin_clinic', '피부관리', '이용료', '샵'),
  plugin('pilates', '필라테스', '수강료', '스튜디오'),
  plugin('retail', '소매업', '수강료', '매장'),
  plugin('sauna_jjimjilbang', '사우나', '수강료', '시설'),
]);

function run(): void {
  const cases: Array<string | null | undefined> = [
    'piano',
    'gym',
    'daycare',
    'skin_clinic',
    'pilates',
    'retail',
    'sauna_jjimjilbang',
    'preschool',
    'kindergarten',
    null,
    undefined,
  ];

  for (const industry of cases) {
    assert.equal(
      getNoticePlaceWords(industry).feeWord,
      getFeeLabel(industry),
      `feeWord should follow getFeeLabel for ${String(industry)}`
    );
  }

  assert.equal(getNoticePlaceWords('daycare').feeWord, '보육료');
  assert.equal(getNoticePlaceWords('skin_clinic').feeWord, '이용료');
  assert.equal(getNoticePlaceWords('piano').feeWord, '수강료');
  assert.equal(getNoticePlaceWords(null).feeWord, '수강료');
  assert.equal(getNoticePlaceWords(undefined).feeWord, '수강료');
  // 예전 industry id 분기의 else(수강료)와 달라도 매니페스트가 이긴다.
  assert.equal(getNoticePlaceWords('gym').feeWord, '회비');
  // 어린이집 별칭도 플러그인 feeLabel.
  assert.equal(getNoticePlaceWords('preschool').feeWord, '보육료');
  assert.equal(getNoticePlaceWords('kindergarten').feeWord, '보육료');

  const tuition = buildNoticeTemplates('원', getNoticePlaceWords('daycare').feeWord).find(
    (template) => template.id === 'tuition'
  );
  assert.ok(tuition);
  assert.equal(tuition.label, '보육료 안내');
  assert.equal(tuition.title, '보육료 납부 안내');
  assert.match(tuition.message, /이번 달 보육료 납부 안내/);
}

run();
console.log('noticeTemplates.test.ts ok');
