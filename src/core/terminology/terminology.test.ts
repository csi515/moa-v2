/**
 * Terminology Engine unit tests.
 *
 * 실행: npx tsx src/core/terminology/terminology.test.ts
 */
import assert from 'node:assert/strict';
import {
  DEFAULT_TERMINOLOGY_DICTIONARY,
  CATEGORY_DICTIONARIES,
  INDUSTRY_DICTIONARIES,
  getTerminologyDictionary,
} from './dictionaries';
import { translateTerm, createTranslator } from './translate';
import type { ModuleLabels } from '../labels/types';

function run() {
  // 1. 기본값 및 null/빈값 fallback
  assert.equal(getTerminologyDictionary(null), DEFAULT_TERMINOLOGY_DICTIONARY);
  assert.equal(getTerminologyDictionary(undefined), DEFAULT_TERMINOLOGY_DICTIONARY);
  assert.equal(getTerminologyDictionary(''), DEFAULT_TERMINOLOGY_DICTIONARY);

  // 2. 모듈 업종별 전용 사전
  const pianoDict = getTerminologyDictionary('piano');
  assert.equal(pianoDict.customer.singular, '학생');
  assert.equal(pianoDict.staff.singular, '선생님');
  assert.equal(pianoDict.contact.singular, '학부모');
  assert.equal(pianoDict.billing.fee, '수강료');
  assert.equal(pianoDict.billing.pass, '회차권');
  assert.equal(pianoDict.facility.place, '학원');
  assert.equal(pianoDict.facility.owner, '원장');
  assert.equal(pianoDict.facility.room, '연습실');

  const pilatesDict = getTerminologyDictionary('pilates');
  assert.equal(pilatesDict.customer.singular, '회원');
  assert.equal(pilatesDict.staff.singular, '강사');
  assert.equal(pilatesDict.contact.singular, '보호자');
  assert.equal(pilatesDict.service.management, '수업 종류');
  assert.equal(pilatesDict.billing.fee, '이용료');
  assert.equal(pilatesDict.billing.pass, '이용권');
  assert.equal(pilatesDict.facility.place, '스튜디오');
  assert.equal(pilatesDict.facility.owner, '대표');

  const gymDict = getTerminologyDictionary('gym');
  assert.equal(gymDict.customer.singular, '회원');
  assert.equal(gymDict.customer.section, '회원 및 보호자');
  assert.equal(gymDict.staff.section, '지도진');
  assert.equal(gymDict.service.singular, '수업반');
  assert.equal(gymDict.billing.fee, '회비');
  assert.equal(gymDict.billing.pass, '회원권');
  assert.equal(gymDict.facility.place, '체육관');
  assert.equal(gymDict.facility.owner, '관장');
  assert.equal(gymDict.facility.room, '수련실');

  const daycareDict = getTerminologyDictionary('daycare');
  assert.equal(daycareDict.customer.singular, '원아');
  assert.equal(daycareDict.staff.singular, '교사');
  assert.equal(daycareDict.service.singular, '반');
  assert.equal(daycareDict.billing.fee, '보육료');
  assert.equal(daycareDict.facility.place, '어린이집');
  assert.equal(daycareDict.facility.owner, '원장');
  assert.equal(daycareDict.facility.room, '보육실');

  const skinDict = getTerminologyDictionary('skin_clinic');
  assert.equal(skinDict.customer.singular, '고객');
  assert.equal(skinDict.staff.singular, '관리사');
  assert.equal(skinDict.service.singular, '시술');
  assert.equal(skinDict.billing.fee, '시술비');
  assert.equal(skinDict.billing.pass, '관리권');
  assert.equal(skinDict.facility.place, '피부관리실');

  const retailDict = getTerminologyDictionary('retail');
  assert.equal(retailDict.customer.singular, '고객');
  assert.equal(retailDict.staff.singular, '직원');
  assert.equal(retailDict.service.singular, '상품');
  assert.equal(retailDict.schedule.singular, '판매');
  assert.equal(retailDict.billing.fee, '결제액');

  const bathDict = getTerminologyDictionary('bath');
  assert.equal(bathDict.customer.singular, '고객');
  assert.equal(bathDict.service.singular, '시설');
  assert.equal(bathDict.facility.place, '사우나');

  // 3. 업종 카탈로그 카테고리 기반 자동 상속 (Extensibility)
  // 미술학원(art_academy) -> education 카테고리 자동 상속
  const artAcademyDict = getTerminologyDictionary('art_academy');
  assert.equal(artAcademyDict.customer.singular, '학생');
  assert.equal(artAcademyDict.staff.singular, '선생님');
  assert.equal(artAcademyDict.billing.fee, '수강료');
  assert.equal(artAcademyDict.facility.place, '학원');

  // 크로스핏(crossfit) -> fitness 카테고리 자동 상속
  const crossfitDict = getTerminologyDictionary('crossfit');
  assert.equal(crossfitDict.customer.singular, '회원');
  assert.equal(crossfitDict.staff.singular, '강사');
  assert.equal(crossfitDict.billing.fee, '회비');
  assert.equal(crossfitDict.facility.place, '센터');

  // 네일샵(nail_salon) -> beauty 카테고리 자동 상속
  const nailDict = getTerminologyDictionary('nail_salon');
  assert.equal(nailDict.customer.singular, '고객');
  assert.equal(nailDict.staff.singular, '관리사');
  assert.equal(nailDict.billing.fee, '시술비');
  assert.equal(nailDict.facility.place, '샵');

  // 타이마사지(thai_massage) -> wellness 카테고리 자동 상속
  const massageDict = getTerminologyDictionary('thai_massage');
  assert.equal(massageDict.customer.singular, '고객');
  assert.equal(massageDict.staff.singular, '테라피스트');
  assert.equal(massageDict.billing.fee, '이용료');

  // 4. translateTerm 및 dot-notation 번역 검증
  assert.equal(translateTerm(gymDict, 'customer.singular'), '회원');
  assert.equal(translateTerm(gymDict, 'staff.singular'), '강사');
  assert.equal(translateTerm(gymDict, 'billing.fee'), '회비');
  assert.equal(translateTerm(gymDict, 'facility.place'), '체육관');
  assert.equal(translateTerm(gymDict, 'facility.owner'), '관장');
  assert.equal(translateTerm(gymDict, 'unknown.key' as any, '기본값'), '기본값');

  // 단축 별칭 (Shortcut Aliases) 검증
  assert.equal(translateTerm(gymDict, 'customer'), '회원');
  assert.equal(translateTerm(gymDict, 'staff'), '강사');
  assert.equal(translateTerm(gymDict, 'fee'), '회비');
  assert.equal(translateTerm(gymDict, 'place'), '체육관');
  assert.equal(translateTerm(gymDict, 'attendance'), '출결');

  // statusPaused 및 attendance 폴백 검증
  assert.equal(translateTerm(pianoDict, 'customer.statusPaused'), '휴원');
  assert.equal(translateTerm(pilatesDict, 'customer.statusPaused'), '휴회');
  assert.equal(translateTerm(pianoDict, 'attendance.checkIn'), '등원');
  assert.equal(translateTerm(pilatesDict, 'attendance.checkIn'), '출석');

  // 5. createTranslator 검증
  const t = createTranslator(daycareDict);
  assert.equal(t('customer.singular'), '원아');
  assert.equal(t('customer'), '원아');
  assert.equal(t('billing.fee'), '보육료');
  assert.equal(t('fee'), '보육료');
  assert.equal(t('facility.place'), '어린이집');
  assert.equal(t('place'), '어린이집');
  assert.equal(t('facility.owner'), '원장');
  assert.equal(t('facility.room'), '보육실');
  assert.equal(t('invalid.path' as any, '대체어'), '대체어');

  // 6. ModuleLabels 호환성 검증
  const moduleLabelCompatible: ModuleLabels = pianoDict;
  assert.equal(moduleLabelCompatible.customer.singular, '학생');
  assert.equal(moduleLabelCompatible.billing?.fee, '수강료');
  assert.equal(moduleLabelCompatible.facility?.place, '학원');

  // 7. 피아노 외 업종에서 피아노 전용 용어(학생, 학원, 원장, 수강료) 노출 방지 회귀 검증
  const nonPianoCases = [
    { id: 'study_cafe', expectedCustomer: '고객', expectedPlace: '스튜디오', expectedFee: '이용료' },
    { id: 'auto_repair', expectedCustomer: '고객', expectedPlace: '정비소', expectedFee: '정비료' },
    { id: 'pet_hotel', expectedCustomer: '보호자', expectedPlace: '호텔·샵', expectedFee: '이용료' },
    { id: 'guesthouse', expectedCustomer: '투숙객', expectedPlace: '게스트하우스', expectedFee: '숙박료' },
    { id: 'cafe', expectedCustomer: '고객', expectedPlace: '매장', expectedFee: '결제액' },
    { id: 'custom_service_xyz', expectedCustomer: '고객', expectedPlace: '사업장', expectedFee: '이용료' },
  ];

  for (const c of nonPianoCases) {
    const dict = getTerminologyDictionary(c.id);
    assert.notEqual(dict.customer.singular, '학생', `${c.id}: 피아노 전용 고객 용어(학생) 노출됨`);
    assert.notEqual(dict.billing.fee, '수강료', `${c.id}: 피아노 전용 결제 용어(수강료) 노출됨`);
    assert.notEqual(dict.facility.place, '학원', `${c.id}: 피아노 전용 장소 용어(학원) 노출됨`);
    assert.equal(dict.customer.singular, c.expectedCustomer, `${c.id}: 기대 고객 호칭 불일치`);
    assert.equal(dict.facility.place, c.expectedPlace, `${c.id}: 기대 장소 호칭 불일치`);
    assert.equal(dict.billing.fee, c.expectedFee, `${c.id}: 기대 요금 호칭 불일치`);
    assert.equal(dict.facility.owner, '대표', `${c.id}: 대표 호칭이어야 함`);
  }

  console.log('terminology.test.ts: all tests passed! (100% OK)');
}

run();
