import assert from 'node:assert/strict';
import {
  getConfiguredRooms,
  getRoomNames,
  getPracticeRoomNames,
  createRoom,
} from './academyRooms';
import type { AcademySettings } from '../settingsTypes';

console.log('--- Testing academyRooms & getPracticeRoomNames fallback ---');

// 1. 설정에 강의실만 4개 등록된 경우 (defaultKind: classroom)
const settingsWith4Classrooms: Pick<AcademySettings, 'rooms'> = {
  rooms: [
    { id: '1', name: '1번 강의실', kind: 'classroom' },
    { id: '2', name: '2번 강의실', kind: 'classroom' },
    { id: '3', name: '3번 강의실', kind: 'classroom' },
    { id: '4', name: '4번 강의실', kind: 'classroom' },
  ],
};

const practiceRooms = getPracticeRoomNames({ settings: settingsWith4Classrooms as AcademySettings });
assert.equal(practiceRooms.length, 4, 'Must return all 4 rooms even if registered as classroom');
assert.deepEqual(practiceRooms, ['1번 강의실', '2번 강의실', '3번 강의실', '4번 강의실']);

// 2. 강의실과 연습실이 혼합된 경우
const mixedSettings: Pick<AcademySettings, 'rooms'> = {
  rooms: [
    { id: '1', name: '그랜드 1실', kind: 'practice' },
    { id: '2', name: '이론 강의실', kind: 'classroom' },
    { id: '3', name: '업라이트 2실', kind: 'practice' },
  ],
};

// 기본(all): 전체 공간 3개 모두 반환
const allMixed = getPracticeRoomNames({ settings: mixedSettings as AcademySettings });
assert.equal(allMixed.length, 3, 'Must return all mixed rooms by default');

// filterKind: practice -> 2개만 반환
const onlyPractice = getPracticeRoomNames({
  settings: mixedSettings as AcademySettings,
  filterKind: 'practice',
});
assert.equal(onlyPractice.length, 2, 'Must return only practice rooms when specified');
assert.deepEqual(onlyPractice, ['그랜드 1실', '업라이트 2실']);

// filterKind: classroom -> 1개만 반환
const onlyClassroom = getPracticeRoomNames({
  settings: mixedSettings as AcademySettings,
  filterKind: 'classroom',
});
assert.equal(onlyClassroom.length, 1, 'Must return only classroom rooms when specified');
assert.deepEqual(onlyClassroom, ['이론 강의실']);

console.log('✓ [PASS] academyRooms test passed successfully!');
