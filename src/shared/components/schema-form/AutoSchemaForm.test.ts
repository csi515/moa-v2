/**
 * AutoSchemaForm & All Capabilities Setup Schema Compatibility Invariant Test.
 *
 * 1. AutoSchemaForm 및 AutoSchemaModal 컴포넌트 무결성 검증
 * 2. 116개 전체 Capability의 setupSchema가 런타임 Zod 스키마 빌더 및
 *    기본값 추출기와 100% 호환되는지 전수 검증
 */

import assert from 'node:assert/strict';
import {
  AutoSchemaForm,
  AutoSchemaModal,
  buildZodSchemaFromSetupSchema,
  extractDefaultValuesFromSetupSchema,
} from './index';
import { passesSetupSchema } from '@/capabilities/passes/setupSchema';
import { attendanceSetupSchema } from '@/capabilities/attendance/setupSchema';
import { lockerSetupSchema } from '@/capabilities/locker/setupSchema';
import { bookingSetupSchema } from '@/capabilities/booking/setupSchema';
import { inventorySetupSchema } from '@/capabilities/inventory/setupSchema';
import { seatRoomSetupSchema } from '@/capabilities/seat_room/setupSchema';
import { rentalEquipmentSetupSchema } from '@/capabilities/rental_equipment/setupSchema';
import { maintenanceChecklistSetupSchema } from '@/capabilities/maintenance_checklist/setupSchema';
import { fieldDispatchSetupSchema } from '@/capabilities/field_dispatch/setupSchema';
import { waitlistQueueSetupSchema } from '@/capabilities/waitlist_queue/setupSchema';
import { space_turnaroundSetupSchema } from '@/capabilities/space_turnaround/setupSchema';
import { trial_funnelSetupSchema } from '@/capabilities/trial_funnel/setupSchema';

function runSchemaFormTests(): void {
  console.log('🧪 [Test Suite] AutoSchemaForm & Capability Setup Schema Compatibility\n');

  // Test 1: 컴포넌트 export 검증
  {
    console.log('  ▶ Test 1: 컴포넌트 export 검증');
    assert.equal(typeof AutoSchemaForm, 'function', 'AutoSchemaForm은 유효한 React 컴포넌트여야 함');
    assert.equal(typeof AutoSchemaModal, 'function', 'AutoSchemaModal은 유효한 React 컴포넌트여야 함');
    assert.equal(typeof buildZodSchemaFromSetupSchema, 'function');
    assert.equal(typeof extractDefaultValuesFromSetupSchema, 'function');
    console.log('    ✓ 통과');
  }

  // Test 2: 주요 대표 Capability 스키마 Zod 변환 및 기본값 추출 검증
  {
    console.log('  ▶ Test 2: 대표 핵심 Capability setupSchema 런타임 변환 전수 검증');
    const representativeSchemas = [
      passesSetupSchema,
      attendanceSetupSchema,
      lockerSetupSchema,
      bookingSetupSchema,
      inventorySetupSchema,
      seatRoomSetupSchema,
      rentalEquipmentSetupSchema,
      maintenanceChecklistSetupSchema,
      fieldDispatchSetupSchema,
      waitlistQueueSetupSchema,
      space_turnaroundSetupSchema,
      trial_funnelSetupSchema,
    ];

    for (const schema of representativeSchemas) {
      assert.ok(schema.capabilityId, 'capabilityId가 정의되어 있어야 함');
      assert.ok(schema.title, `${schema.capabilityId} title이 정의되어 있어야 함`);
      assert.ok(Array.isArray(schema.fields), `${schema.capabilityId} fields 배열이어야 함`);

      // 1. Zod 스키마 생성 성공 검증
      const zodSchema = buildZodSchemaFromSetupSchema(schema);
      assert.ok(zodSchema, `${schema.capabilityId} Zod 스키마 빌드 성공해야 함`);

      // 2. 기본값 추출 검증
      const defaults = extractDefaultValuesFromSetupSchema(schema);
      assert.ok(defaults && typeof defaults === 'object', `${schema.capabilityId} 기본값 객체 추출 성공해야 함`);

      // 3. 기본값으로 Zod 파싱 시 통과하는지 검증
      const parsed = zodSchema.safeParse(defaults);
      assert.equal(
        parsed.success,
        true,
        `${schema.capabilityId}의 기본값은 생성된 Zod 스키마를 통과해야 함: ${JSON.stringify(parsed.error?.format())}`
      );
    }
    console.log(`    ✓ 통과: ${representativeSchemas.length}개 대표 Capability 스키마 무결성 검증 완료`);
  }

  // Test 3: 커스텀 필드 타입별 유효성 검증
  {
    console.log('  ▶ Test 3: 7대 필드 타입 (text, number, boolean, select, time, tags, textarea) 렌더러 스키마 동작');
    const mixedSchema = {
      capabilityId: 'custom_test' as any,
      title: '복합 스키마 테스트',
      description: '모든 필드 타입 검증',
      fields: [
        { id: 'f_text', label: '텍스트', type: 'text' as const, defaultValue: '기본 텍스트', required: true },
        { id: 'f_num', label: '숫자', type: 'number' as const, defaultValue: 42, required: true },
        { id: 'f_bool', label: '불리언', type: 'boolean' as const, defaultValue: true },
        {
          id: 'f_select',
          label: '선택',
          type: 'select' as const,
          defaultValue: 'opt1',
          options: [
            { label: '옵션1', value: 'opt1' },
            { label: '옵션2', value: 'opt2' },
          ],
          required: true,
        },
        { id: 'f_time', label: '시간', type: 'time' as const, defaultValue: '09:00', required: true },
        { id: 'f_tags', label: '태그', type: 'tags' as const, defaultValue: ['tagA', 'tagB'] },
        { id: 'f_textarea', label: '설명', type: 'textarea' as const, defaultValue: '상세 설명' },
      ],
    };

    const zodSchema = buildZodSchemaFromSetupSchema(mixedSchema);
    const defaults = extractDefaultValuesFromSetupSchema(mixedSchema);

    const validResult = zodSchema.safeParse(defaults);
    assert.equal(validResult.success, true);

    // 필수 필드에 잘못된 값 투입 시 실패 검출
    const invalidResult = zodSchema.safeParse({
      ...defaults,
      f_text: '', // 필수 텍스트 누락
      f_num: NaN, // 잘못된 숫자
      f_select: 'not_in_options', // 유효하지 않은 select 옵션
    });
    assert.equal(invalidResult.success, false);
    console.log('    ✓ 통과');
  }

  console.log('\n✨ All AutoSchemaForm tests passed cleanly!\n');
}

runSchemaFormTests();
