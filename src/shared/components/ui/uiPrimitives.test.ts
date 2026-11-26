import assert from 'node:assert/strict';
import React from 'react';
import { Button } from './Button';
import { Badge } from './Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Input } from './Input';
import { StatusBadge, resolveSemanticStatusTone } from './StatusBadge';
import { StandardDataTable } from './StandardDataTable';
import { FormModal } from './FormModal';
import { DENSITY, UI_SIZES, UI_RADIUS, UI_TYPOGRAPHY } from '@/shared/styles/density';

console.log('[TEST] UI Primitives & Design Tokens suite starting...');

// 1. 컴포넌트 export 검증
assert.equal(typeof Button, 'object', 'Button must be a React forwardRef component');
assert.equal(typeof Badge, 'function', 'Badge must be a React functional component');
assert.equal(typeof StatusBadge, 'function', 'StatusBadge must be a React functional component');
assert.equal(typeof StandardDataTable, 'function', 'StandardDataTable must be a React functional component');
assert.equal(typeof FormModal, 'function', 'FormModal must be a React functional component');
assert.equal(typeof Card, 'object', 'Card must be a React forwardRef component');
assert.equal(typeof CardHeader, 'object', 'CardHeader must be a React forwardRef component');
assert.equal(typeof CardTitle, 'object', 'CardTitle must be a React forwardRef component');
assert.equal(typeof CardDescription, 'object', 'CardDescription must be a React forwardRef component');
assert.equal(typeof CardContent, 'object', 'CardContent must be a React forwardRef component');
assert.equal(typeof CardFooter, 'object', 'CardFooter must be a React forwardRef component');
assert.equal(typeof Input, 'object', 'Input must be a React forwardRef component');

// 2. 디자인 토큰 규격 검증
assert.ok(UI_SIZES.sm.height.includes('36px'), 'sm size must support 36px min-height');
assert.ok(UI_SIZES.md.height.includes('44px'), 'md size must support 44px min-height (W3C standard)');
assert.ok(UI_SIZES.lg.height.includes('48px'), 'lg size must support 48px min-height');

assert.equal(UI_RADIUS.modal, 'rounded-3xl', 'Modal radius must be rounded-3xl (24px)');
assert.equal(UI_RADIUS.card, 'rounded-2xl', 'Card radius must be rounded-2xl (16px)');
assert.equal(UI_RADIUS.control, 'rounded-xl', 'Control radius must be rounded-xl (12px)');
assert.equal(UI_RADIUS.badge, 'rounded-lg', 'Badge radius must be rounded-lg (8px)');

assert.ok(UI_TYPOGRAPHY.h1.includes('font-extrabold'), 'h1 must be font-extrabold');
assert.ok(UI_TYPOGRAPHY.body.includes('text-sm'), 'body typography must be text-sm (14px)');

// 3. StatusBadge 시맨틱 톤 매핑 검증
assert.equal(resolveSemanticStatusTone('출석'), 'success');
assert.equal(resolveSemanticStatusTone('납부완료'), 'success');
assert.equal(resolveSemanticStatusTone('미납'), 'danger');
assert.equal(resolveSemanticStatusTone('결석'), 'danger');
assert.equal(resolveSemanticStatusTone('지각'), 'warning');
assert.equal(resolveSemanticStatusTone('대기'), 'warning');
assert.equal(resolveSemanticStatusTone('상담예정'), 'info');
assert.equal(resolveSemanticStatusTone('기타'), 'neutral');

console.log('✓ UI Primitives & Design Tokens suite passed successfully!');
