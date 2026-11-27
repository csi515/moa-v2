import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MasterDetailLayout } from './MasterDetailLayout';

test('MasterDetailLayout: 항목 미선택 시 모바일에서 master 뷰 노출 및 데스크톱에서 emptyDetail 뷰 노출', () => {
  const html = renderToStaticMarkup(
    React.createElement(MasterDetailLayout, {
      selectedId: null,
      master: React.createElement('div', { id: 'test-master' }, '마스터 목록'),
      detail: React.createElement('div', { id: 'test-detail' }, '디테일 상세'),
      emptyDetail: React.createElement('div', { id: 'test-empty' }, '항목을 골라주세요'),
    })
  );

  // 모바일 영역에는 master 렌더링
  assert.ok(html.includes('mobile-master-pane'));
  assert.ok(html.includes('마스터 목록'));

  // 데스크톱 영역에는 master와 emptyDetail 동시 렌더링
  assert.ok(html.includes('desktop-split-pane'));
  assert.ok(html.includes('desktop-master-col'));
  assert.ok(html.includes('desktop-detail-col'));
  assert.ok(html.includes('항목을 골라주세요'));
});

test('MasterDetailLayout: 항목 선택 시 모바일에서 detail 뷰 노출 및 데스크톱에서 detail 뷰 노출', () => {
  const html = renderToStaticMarkup(
    React.createElement(MasterDetailLayout, {
      selectedId: 'cust-123',
      master: React.createElement('div', { id: 'test-master' }, '마스터 목록'),
      detail: React.createElement('div', { id: 'test-detail' }, '디테일 상세 내용 (홍길동)'),
    })
  );

  // 모바일 영역에는 detail 렌더링
  assert.ok(html.includes('mobile-detail-pane'));
  assert.ok(html.includes('디테일 상세 내용 (홍길동)'));

  // 데스크톱 영역에는 master와 detail 동시 렌더링
  assert.ok(html.includes('desktop-split-pane'));
  assert.ok(html.includes('desktop-master-col'));
  assert.ok(html.includes('desktop-detail-col'));
  assert.ok(html.includes('디테일 상세 내용 (홍길동)'));
});

test('MasterDetailLayout: 4-8 비율 클래스 정상 반영', () => {
  const html = renderToStaticMarkup(
    React.createElement(MasterDetailLayout, {
      selectedId: null,
      ratio: '4-8',
      master: React.createElement('div', null, '마스터'),
      detail: React.createElement('div', null, '디테일'),
    })
  );

  assert.ok(html.includes('lg:col-span-4'));
  assert.ok(html.includes('lg:col-span-8'));
});
