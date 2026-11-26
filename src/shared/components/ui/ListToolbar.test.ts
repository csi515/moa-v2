import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ListToolbar, type ListToolbarTabItem } from './ListToolbar';

console.log('--- Testing ListToolbar Component ---');

// 1. Export check
assert.ok(ListToolbar, 'ListToolbar must be exported');

// 2. Render static markup check
const sampleTabs: ListToolbarTabItem[] = [
  { key: 'active', label: '재원', count: 12 },
  { key: 'leave', label: '휴원', count: 2 },
  { key: 'withdrawn', label: '퇴원', count: 0 },
  { key: 'ALL', label: '전체', count: 14 },
];

let selectedTab = 'active';
let searchVal = '홍길동';
let filterOpen = false;

const html = renderToStaticMarkup(
  React.createElement(ListToolbar, {
    tabs: sampleTabs,
    activeTab: selectedTab,
    onTabChange: (key: string) => {
      selectedTab = key;
    },
    searchQuery: searchVal,
    onSearchChange: (v: string) => {
      searchVal = v;
    },
    searchPlaceholder: '원생 이름 검색...',
    summaryText: '표시 중: 12명 (재원)',
    filterButton: {
      isOpen: filterOpen,
      onToggle: () => {
        filterOpen = !filterOpen;
      },
      activeCount: 1,
    },
  })
);

// Assertions on rendered HTML
assert.ok(html.includes('재원'), 'Must include tab label 재원');
assert.ok(html.includes('12'), 'Must include count 12');
assert.ok(html.includes('홍길동'), 'Must include search value');
assert.ok(html.includes('원생 이름 검색...'), 'Must include search placeholder');
assert.ok(html.includes('표시 중: 12명 (재원)'), 'Must include summary text');
assert.ok(html.includes('필터'), 'Must include filter button');

console.log('✓ [PASS] ListToolbar renders tabs, compact search input, and filter button properly');
console.log('ListToolbar tests passed successfully!');
