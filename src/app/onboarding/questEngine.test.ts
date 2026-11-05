import assert from 'node:assert/strict';
import {
  getPresetQuests,
  calculateQuestProgress,
  getQuestStorageKey,
} from './questEngine';

console.log('--- Testing questEngine ---');

// 1. Pilates Quests
const pilatesQuests = getPresetQuests('pilates', '회원', '스튜디오');
assert.equal(pilatesQuests.length, 4, 'Pilates should have 4 onboarding quests');
assert.equal(pilatesQuests[0].title, '첫 회원 등록하기');
assert.equal(pilatesQuests[0].stepNumber, 1);
assert.equal(pilatesQuests[0].targetTab, 'students');
assert.equal(pilatesQuests[1].title, '레슨 이용권 만들기');
assert.equal(pilatesQuests[1].targetTab, 'passes');
assert.equal(pilatesQuests[2].targetTab, 'shifts');
assert.equal(pilatesQuests[3].targetTab, 'bookings');
console.log('✓ [PASS] Pilates quest sequence verified');

// 2. Study Cafe Quests
const studyCafeQuests = getPresetQuests('study_cafe', '이용자', '스터디카페');
assert.equal(studyCafeQuests.length, 3, 'Study cafe should have 3 onboarding quests');
assert.equal(studyCafeQuests[0].title, '좌석 및 사물함 배치도 확인');
assert.equal(studyCafeQuests[0].targetTab, 'seat-rooms');
assert.equal(studyCafeQuests[1].title, '시간제 요금제 등록');
assert.equal(studyCafeQuests[1].targetTab, 'passes');
assert.equal(studyCafeQuests[2].title, '출입 키오스크 연동');
assert.equal(studyCafeQuests[2].targetTab, 'attendance');
console.log('✓ [PASS] Study cafe quest sequence verified');

// 3. Retail Quests
const retailQuests = getPresetQuests('retail', '고객', '매장');
assert.equal(retailQuests.length, 3);
assert.equal(retailQuests[0].title, '첫 판매 상품 등록하기');
assert.equal(retailQuests[1].title, '초기 재고 입고 확인');
assert.equal(retailQuests[2].title, 'POS 계산대 열기');
console.log('✓ [PASS] Retail quest sequence verified');

// 3b. Piano wave-1 deeplink quests
const pianoQuests = getPresetQuests('piano', '원생', '학원');
assert.equal(pianoQuests.length, 4);
assert.equal(pianoQuests[0].targetTab, 'students');
assert.equal(pianoQuests[1].targetTab, 'timetable');
assert.equal(pianoQuests[2].targetTab, 'attendance');
assert.equal(pianoQuests[3].targetTab, 'tuition');
console.log('✓ [PASS] Piano wave-1 quest deeplinks verified');

// 4. Dynamic Generic Preset Fallback
const taekwondoQuests = getPresetQuests('taekwondo', '수련생', '도장');
assert.ok(taekwondoQuests.length >= 3, 'Taekwondo should have 3 or more dynamic quests');
assert.equal(taekwondoQuests[0].stepNumber, 1);
assert.match(taekwondoQuests[0].title, /첫 수련생 등록하기/);
console.log('✓ [PASS] Dynamic vertical quest generation verified');

// 5. Progress Calculation
const emptyProgress = calculateQuestProgress(pilatesQuests, []);
assert.equal(emptyProgress.totalQuests, 4);
assert.equal(emptyProgress.completedCount, 0);
assert.equal(emptyProgress.progressPercent, 0);
assert.equal(emptyProgress.isAllCompleted, false);

const partialProgress = calculateQuestProgress(pilatesQuests, ['register_first_member', 'create_lesson_pass']);
assert.equal(partialProgress.completedCount, 2);
assert.equal(partialProgress.progressPercent, 50);
assert.equal(partialProgress.isAllCompleted, false);

const fullProgress = calculateQuestProgress(
  pilatesQuests,
  ['register_first_member', 'create_lesson_pass', 'invite_instructor', 'open_booking_slot']
);
assert.equal(fullProgress.completedCount, 4);
assert.equal(fullProgress.progressPercent, 100);
assert.equal(fullProgress.isAllCompleted, true);
console.log('✓ [PASS] Quest progress computation verified');

// 6. Storage key
assert.equal(getQuestStorageKey('org_123'), 'moa_onboarding_quests_org_123');
assert.equal(getQuestStorageKey(undefined), 'moa_onboarding_quests_default');

console.log('questEngine tests passed successfully!');
