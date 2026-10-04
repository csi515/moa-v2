/**
 * 보호자 연결 안내 호칭
 * 실행: npx tsx src/modules/parent/guardianLinkContactLabel.test.ts
 */
import assert from 'node:assert/strict';
import { bathModuleLabels } from '@/industries/bath/config/labels';
import { daycareModuleLabels } from '@/industries/daycare/config/labels';
import { gymModuleLabels } from '@/industries/gym/config/labels';
import { pianoModuleLabels } from '@/industries/piano/config/labels';
import { pilatesModuleLabels } from '@/industries/pilates/config/labels';
import { retailModuleLabels } from '@/industries/retail/config/labels';
import { skinModuleLabels } from '@/industries/skin/config/labels';
import { guardianLinkContactLabel } from './guardianLinkContactLabel';

const contact = {
  piano: pianoModuleLabels.contact.singular,
  daycare: daycareModuleLabels.contact.singular,
  skin: skinModuleLabels.contact.singular,
  pilates: pilatesModuleLabels.contact.singular,
  gym: gymModuleLabels.contact.singular,
  retail: retailModuleLabels.contact.singular,
  bath: bathModuleLabels.contact.singular,
};

assert.equal(guardianLinkContactLabel('piano', contact.piano), '학부모');
assert.equal(guardianLinkContactLabel('daycare', contact.daycare), '학부모');
assert.equal(guardianLinkContactLabel('preschool', contact.daycare), '학부모');
assert.equal(guardianLinkContactLabel('skin_clinic', contact.skin), contact.skin);
assert.equal(contact.skin, '연락처');

assert.equal(guardianLinkContactLabel('pilates', contact.pilates), '보호자');
assert.equal(guardianLinkContactLabel('gym', contact.gym), '보호자');
assert.equal(guardianLinkContactLabel('taekwondo', contact.gym), '보호자');
assert.equal(guardianLinkContactLabel('retail', contact.retail), '보호자');
assert.equal(guardianLinkContactLabel('sauna_jjimjilbang', contact.bath), '보호자');
assert.equal(guardianLinkContactLabel('sauna_jjimjbang', contact.bath), '보호자');

for (const industry of ['pilates', 'gym', 'retail', 'sauna_jjimjilbang', 'cafe', 'general_service'] as const) {
  const singular = industry === 'pilates' ? contact.pilates
    : industry === 'gym' ? contact.gym
    : industry === 'retail' ? contact.retail
    : industry === 'sauna_jjimjilbang' ? contact.bath
    : '연락처';
  assert.notEqual(guardianLinkContactLabel(industry, singular), '학부모');
}

assert.equal(guardianLinkContactLabel('cafe', '고객'), '고객');
assert.equal(guardianLinkContactLabel('yoga_studio', '회원 보호자'), '회원 보호자');
assert.equal(guardianLinkContactLabel('general_service', '학부모'), '보호자');
assert.equal(guardianLinkContactLabel('academy', '보호자'), '학부모');
assert.equal(guardianLinkContactLabel('art_academy', contact.piano), '학부모');
assert.equal(guardianLinkContactLabel(null, '학부모'), '학부모');
assert.equal(guardianLinkContactLabel(undefined, contact.piano), '학부모');

console.log('guardianLinkContactLabel.test.ts OK');
