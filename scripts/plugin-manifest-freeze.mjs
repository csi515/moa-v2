/**
 * IndustryPluginManifest 필드 동결 계약.
 *
 * IndustryPluginManifest는 더 이상 업종별 임시 불리언 플래그(shows*, uses* 등)의 쓰레기통이 되어서는 안 됩니다.
 * 새로운 기능이나 업종 요구사항은 플래그가 아닌 Capability Manifest 또는 Composable Manifest 설정으로 구현해야 합니다.
 *
 * 새 필드를 IndustryPluginManifest에 추가하면 아키텍처 린트(check:architecture)가 즉시 실패합니다.
 */

export const FROZEN_PLUGIN_TYPES_REL = 'src/core/industry/pluginTypes.ts';

export const FROZEN_PLUGIN_MANIFEST_PROPERTIES = new Set([
  'id',
  'option',
  'aliases',
  'theme',
  'accent',
  'attendanceSummaryMetric',
  'attendanceDefault',
  'usesClassBasedSchedule',
  'customerListTab',
  'showSchoolFields',
  'showPickupFields',
  'levelLabel',
  'levelOptions',
  'adminTabs',
  'staffTabs',
  'syncCapabilities',
  'placeLabel',
  'ownerLabel',
  'placeNamePlaceholder',
  'customerLabel',
  'isAppointment',
  'publicLandingAdultFirst',
  'feeLabel',
  'bankAccountPlaceholder',
  'supportsDeposit',
  'showsTextbooksLink',
  'attendanceCopy',
  'runsPinCheckInSideEffects',
  'showsMakeupList',
  'usesWithdrawalExitLabel',
  'savesAttendanceWithPass',
  'showsPracticeRoomTab',
  'showsCustomerPoints',
  'showsAdultPracticeGuide',
  'showsStaffPracticeGuide',
  'includesLinkedBillingIncome',
  'rosterList',
  'roomConfig',
  'getExpenseCategories',
  'getPayrollExpenseCategory',
  'financeHubNav',
  'bookingAdapter',
]);

/**
 * pluginTypes.ts 소스에서 IndustryPluginManifest 인터페이스의 프로퍼티를 추출하여
 * 동결 목록(FROZEN_PLUGIN_MANIFEST_PROPERTIES)에 없는 신규 필드가 추가되었는지 검사합니다.
 */
export function checkPluginManifestFrozenProperties(source) {
  const match = source.match(/export\s+interface\s+IndustryPluginManifest\s*\{([\s\S]*?)\n\}/);
  if (!match) {
    return ['IndustryPluginManifest interface not found in pluginTypes.ts'];
  }

  const body = match[1];
  const lines = body.split('\n');
  const unknownProps = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }
    // Match property names like `someProp?:` or `someProp:` or `someProp?: () =>`
    const propMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*\??\s*:/);
    if (propMatch) {
      const propName = propMatch[1];
      if (!FROZEN_PLUGIN_MANIFEST_PROPERTIES.has(propName)) {
        unknownProps.push(
          `IndustryPluginManifest has unfrozen new property: '${propName}'. Do not add ad-hoc flags to manifest; use Composable Capabilities instead.`
        );
      }
    }
  }

  return unknownProps;
}
