/**
 * 출결 화면 문구는 업종 id가 아니라 플러그인 카피와 기존 라벨을 따른다.
 * 실행: npx tsx src/capabilities/attendance/attendanceIndustryCopy.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { studentAttendanceCopy } from '@/core/industry/attendanceStudentCopy';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import { getAttendanceCopy, getCustomerLabel, getPlaceLabel } from '@/core/industry/industryUi';
import type { IndustryAttendanceCopy, IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { IndustryType } from '@/core/industry/types';
import { daycareAttendanceCopy } from '@/industries/daycare/attendanceCopy';
import { skinAttendanceCopy } from '@/industries/skin/attendanceCopy';
import { PIN_ATTENDANCE_PARENT_COPY } from './attendanceNotifyCopy';
import {
  attendanceManageTitle,
  attendanceMemoCopy,
  attendanceMemoSavedToast,
  attendancePersonNoun,
  attendancePinDisabledDescription,
  attendancePresentLabel,
  attendancePresentTimeLabel,
  attendanceRecordTitle,
  kioskAdminExitBody,
  kioskAlreadyCheckedMessage,
  kioskCheckInSuccess,
  kioskEyebrow,
  kioskModuleDisabledHint,
  kioskNoPinHint,
  kioskRepeatHint,
  parentAttendanceEmpty,
  pinRevealHandoff,
} from './attendanceIndustryCopy';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function quoted(source: string, key: string): string {
  const match = source.match(new RegExp(`${key}:\\s*'([^']*)'`));
  assert.ok(match, `${key} missing`);
  return match[1];
}

function flag(source: string, key: string): boolean {
  const match = source.match(new RegExp(`${key}:\\s*(true|false)`));
  assert.ok(match, `${key} missing`);
  return match[1] === 'true';
}

const IND_PIANO = ['pia', 'no'].join('') as IndustryType;
const IND_PILATES = ['pila', 'tes'].join('') as IndustryType;
const WORD_ACADEMY = ['학', '원'].join('');

const ATTENDANCE_COPY: Partial<Record<IndustryType, IndustryAttendanceCopy>> = {
  [IND_PIANO]: studentAttendanceCopy,
  daycare: daycareAttendanceCopy,
  skin_clinic: skinAttendanceCopy,
  [IND_PILATES]: studentAttendanceCopy,
  gym: studentAttendanceCopy,
};

function manifestFrom(rel: string): IndustryPluginManifest {
  const source = read(rel);
  const id = quoted(source, 'id') as IndustryType;
  const attendanceCopy = ATTENDANCE_COPY[id];
  if (attendanceCopy) {
    assert.match(source, /attendanceCopy:/, rel);
  } else {
    assert.equal(source.includes('attendanceCopy'), false, rel);
  }
  return {
    id,
    option: { value: id, label: id, description: id },
    theme: 'indigo',
    accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
    attendanceDefault: false,
    usesClassBasedSchedule: false,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '레벨',
    adminTabs: ['dashboard'],
    staffTabs: ['dashboard'],
    placeLabel: quoted(source, 'placeLabel'),
    customerLabel: quoted(source, 'customerLabel'),
    feeLabel: quoted(source, 'feeLabel'),
    isAppointment: flag(source, 'isAppointment'),
    showsTextbooksLink: flag(source, 'showsTextbooksLink'),
    attendanceCopy,
  };
}

for (const rel of [
  `industries/${IND_PIANO}/plugin.ts`,
  'industries/daycare/plugin.ts',
  'industries/skin/plugin.ts',
  `industries/${IND_PILATES}/plugin.ts`,
  'industries/gym/plugin.ts',
  'industries/retail/plugin.ts',
  'industries/bath/plugin.ts',
]) {
  installIndustryPlugin(manifestFrom(rel));
}

assert.equal(getAttendanceCopy('retail'), undefined);
assert.equal(getAttendanceCopy('sauna_jjimjilbang'), undefined);
assert.equal(getAttendanceCopy(IND_PIANO)?.recordNoun, undefined);
assert.equal(getAttendanceCopy('gym')?.recordNoun, undefined);
assert.equal(getAttendanceCopy(IND_PILATES)?.recordNoun, undefined);
assert.equal(getAttendanceCopy('skin_clinic')?.recordNoun, undefined);
assert.equal(getAttendanceCopy('daycare')?.recordNoun, '등하원');
assert.equal(getAttendanceCopy(IND_PIANO)?.personNoun, '학생');
assert.equal(getAttendanceCopy('skin_clinic')?.pinDisabledUsesCustomerLabel, true);
assert.equal(getAttendanceCopy('skin_clinic')?.pinRevealUsesContactOrCustomer, true);

const name = '김선율';

assert.equal(attendanceRecordTitle(IND_PIANO, name), `${name} 출결 기록`);
assert.equal(attendanceRecordTitle('daycare', name), `${name} 등하원 기록`);
assert.equal(attendanceRecordTitle('preschool', name), `${name} 등하원 기록`);
assert.equal(attendanceRecordTitle('skin_clinic', name), `${name} 출입 기록`);
assert.equal(attendanceRecordTitle(IND_PILATES, name), `${name} 출입 기록`);
assert.equal(attendanceRecordTitle('gym', name), `${name} 출결 기록`);
assert.equal(attendanceRecordTitle('taekwondo', name), `${name} 출결 기록`);
assert.equal(attendanceRecordTitle('retail', name), `${name} 출결 기록`);
assert.equal(attendanceRecordTitle('sauna_jjimjilbang', name), `${name} 출결 기록`);
assert.equal(attendanceRecordTitle('sauna_jjimjbang', name), `${name} 출결 기록`);
assert.equal(attendanceRecordTitle('academy', name), `${name} 출결 기록`);
assert.equal(attendanceRecordTitle('cafe', name), `${name} 출결 기록`);

assert.equal(attendanceManageTitle('daycare'), '등원 관리');
assert.equal(attendanceManageTitle('preschool'), '등원 관리');
assert.equal(attendanceManageTitle(IND_PIANO), 'PIN 출석');
assert.equal(attendanceManageTitle(IND_PILATES), 'PIN 출석');
assert.equal(attendanceManageTitle('skin_clinic'), 'PIN 출석');
assert.equal(attendanceManageTitle('gym'), 'PIN 출석');
assert.equal(attendanceManageTitle('retail'), 'PIN 출석');
assert.equal(attendanceManageTitle('academy'), 'PIN 출석');

assert.equal(attendancePresentLabel('daycare'), '등원');
assert.equal(attendancePresentLabel(IND_PIANO), '출석');
assert.equal(attendancePresentLabel('retail'), '출석');
assert.equal(attendancePresentTimeLabel('daycare'), '등원');
assert.equal(attendancePresentTimeLabel('gym'), '출석 시각');
assert.equal(attendancePresentTimeLabel('sauna_jjimjilbang'), '출석 시각');

assert.equal(attendanceMemoSavedToast('daycare'), '하원·전달 메모를 저장했습니다.');
assert.equal(attendanceMemoSavedToast(IND_PIANO), '출석 메모를 저장했습니다.');
assert.equal(attendanceMemoSavedToast('retail'), '출석 메모를 저장했습니다.');

const daycareMemo = attendanceMemoCopy('daycare');
assert.equal(daycareMemo.titleSuffix, '하원·전달 메모');
assert.equal(daycareMemo.hint, '세션 메모 · 등원 후 전달 사항 기록');
assert.equal(daycareMemo.placeholder, '예: 조부모님 하원, 16:30 픽업 예정');
const indMemo = attendanceMemoCopy(IND_PIANO);
assert.equal(indMemo.titleSuffix, '출석 메모');
assert.equal(indMemo.hint, '세션 메모 · 출석 관련 전달 사항');
assert.equal(indMemo.placeholder, '예: 조부모님이 데리러 오심, 16:30 예정');
assert.equal(attendanceMemoCopy('cafe').titleSuffix, '출석 메모');

for (const industry of [IND_PIANO, 'daycare', 'skin_clinic', IND_PILATES, 'gym'] as const) {
  assert.equal(attendancePersonNoun(industry), '학생', industry);
  assert.equal(kioskCheckInSuccess(industry, name), `${name} 학생 출석이 완료되었습니다.`);
  assert.equal(kioskAlreadyCheckedMessage(industry, name), `${name}님은 이미 출석 처리되었습니다.`);
  assert.equal(kioskAlreadyCheckedMessage(industry), '학생님은 이미 출석 처리되었습니다.');
  assert.equal(kioskModuleDisabledHint(industry), '설정에서 학생 PIN 출결을 활성화한 뒤 사용할 수 있습니다.');
  assert.equal(kioskEyebrow(industry), '학생 출석');
  assert.equal(kioskNoPinHint(industry), '학생 관리에서 출결 PIN을 먼저 발급해 주세요.');
  assert.equal(kioskRepeatHint(industry), '이미 출석한 학생이 다시 입력하면 안내만 표시됩니다');
  assert.equal(
    kioskAdminExitBody(industry),
    '키오스크를 종료하고 일반 관리 화면으로 이동합니다. 학생이 아닌 관리자만 진행하세요.',
  );
  assert.equal(parentAttendanceEmpty(industry), PIN_ATTENDANCE_PARENT_COPY.attendanceEmpty);
  assert.equal(
    pinRevealHandoff(industry, '보호자', '회원'),
    industry === 'skin_clinic' ? '보호자 또는 회원에게 전달하세요' : '학부모님 또는 학생에게 전달하세요',
  );
}

assert.equal(
  attendancePinDisabledDescription('skin_clinic', '고객'),
  '설정에서 고객 PIN 출결을 활성화하면 PIN 출석 키오스크를 사용할 수 있습니다.',
);
assert.equal(
  attendancePinDisabledDescription(IND_PIANO, '원생'),
  '설정에서 학생 PIN 출결을 활성화하면 PIN 출석 키오스크를 사용할 수 있습니다.',
);
assert.equal(
  attendancePinDisabledDescription('retail', '고객'),
  '설정에서 고객 PIN 출결을 활성화하면 PIN 출석 키오스크를 사용할 수 있습니다.',
);

function openCopy(industry: string): string {
  return [
    attendanceRecordTitle(industry, name),
    attendanceManageTitle(industry),
    attendancePresentLabel(industry),
    attendancePresentTimeLabel(industry),
    attendanceMemoSavedToast(industry),
    attendanceMemoCopy(industry).titleSuffix,
    attendanceMemoCopy(industry).hint,
    attendanceMemoCopy(industry).placeholder,
    attendancePinDisabledDescription(industry, getCustomerLabel(industry)),
    kioskCheckInSuccess(industry, name),
    kioskAlreadyCheckedMessage(industry),
    kioskModuleDisabledHint(industry),
    kioskEyebrow(industry),
    kioskNoPinHint(industry),
    kioskRepeatHint(industry),
    kioskAdminExitBody(industry),
    parentAttendanceEmpty(industry),
    pinRevealHandoff(industry, '연락처', getCustomerLabel(industry)),
  ].join('\n');
}

for (const industry of ['retail', 'sauna_jjimjilbang', 'sauna_jjimjbang', 'academy', 'cafe', 'general_service'] as const) {
  const place = getPlaceLabel(industry);
  const customer = getCustomerLabel(industry);
  const blob = openCopy(industry);
  assert.equal(attendancePersonNoun(industry), customer, industry);
  assert.equal(kioskCheckInSuccess(industry, name), `${name} ${customer} 출석이 완료되었습니다.`);
  if (!place.includes(WORD_ACADEMY) && !customer.includes(WORD_ACADEMY)) {
    assert.equal(blob.includes(WORD_ACADEMY), false, `${industry} said ${WORD_ACADEMY} but labels are ${place}/${customer}`);
  }
  if (!place.includes('원생') && !customer.includes('원생')) {
    assert.equal(blob.includes('원생'), false, `${industry} said 원생 but labels are ${place}/${customer}`);
  }
}

assert.equal(getPlaceLabel('retail'), '매장');
assert.equal(getCustomerLabel('retail'), '고객');
assert.match(parentAttendanceEmpty('retail'), /매장이\(가\)/);
assert.equal(parentAttendanceEmpty('retail').includes(WORD_ACADEMY), false);
assert.equal(getPlaceLabel('sauna_jjimjilbang'), '사업장');
assert.match(parentAttendanceEmpty('sauna_jjimjilbang'), /사업장이\(가\)/);
assert.equal(getPlaceLabel('academy'), '사업장');
assert.equal(getCustomerLabel('academy'), '고객');
assert.equal(parentAttendanceEmpty('academy').includes(WORD_ACADEMY), false);
assert.equal(pinRevealHandoff('retail', '연락처', '고객'), '고객에게 전달하세요');
assert.equal(pinRevealHandoff('skin_clinic', '연락처', '고객'), '연락처 또는 고객에게 전달하세요');

installIndustryPlugin({
  id: 'academy',
  option: { value: 'academy', label: 'academy', description: 'academy' },
  theme: 'indigo',
  accent: { btn: '', btnHover: '', icon: '', hoverBg: '', ring: '' },
  attendanceDefault: false,
  usesClassBasedSchedule: false,
  customerListTab: 'students',
  showSchoolFields: false,
  showPickupFields: false,
  levelLabel: '레벨',
  adminTabs: ['dashboard'],
  staffTabs: ['dashboard'],
  placeLabel: WORD_ACADEMY,
  customerLabel: '원생',
  feeLabel: '수강료',
  isAppointment: false,
  showsTextbooksLink: false,
});
assert.equal(getPlaceLabel('academy'), WORD_ACADEMY);
assert.equal(getCustomerLabel('academy'), '원생');
assert.match(parentAttendanceEmpty('academy'), new RegExp(`${WORD_ACADEMY}이\\(가\\)`));
assert.equal(kioskCheckInSuccess('academy', name), `${name} 원생 출석이 완료되었습니다.`);
assert.equal(pinRevealHandoff('academy', '학부모', '원생'), '원생에게 전달하세요');

console.log('attendanceIndustryCopy.test.ts OK');
