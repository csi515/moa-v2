import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  PIANO_AVAILABLE_MENU_CATALOG,
  DEFAULT_PIANO_FAVORITE_TABS,
  MAX_FAVORITE_DOCK_ITEMS,
  loadFavoriteTabs,
  saveFavoriteTabs,
  toggleFavoriteTab,
} from './favoriteMenuHelpers';

describe('favoriteMenuHelpers', () => {
  it('기본 즐겨찾기 6대 메뉴가 정확히 정의되어 있어야 한다', () => {
    assert.equal(DEFAULT_PIANO_FAVORITE_TABS.length, 6);
    assert.deepEqual(DEFAULT_PIANO_FAVORITE_TABS, [
      'dashboard',
      'attendance',
      'timetable',
      'tuition',
      'practice',
      'students',
    ]);
  });

  it('사용 가능한 메뉴 카탈로그에 핵심 탭들이 포함되어 있어야 한다', () => {
    const tabs = PIANO_AVAILABLE_MENU_CATALOG.map((m) => m.tab);
    assert.ok(tabs.includes('dashboard'));
    assert.ok(tabs.includes('attendance'));
    assert.ok(tabs.includes('timetable'));
    assert.ok(tabs.includes('tuition'));
    assert.ok(tabs.includes('practice'));
    assert.ok(tabs.includes('students'));
    assert.ok(tabs.includes('song-progress'));
  });

  it('toggleFavoriteTab: 이미 존재하는 탭은 제거되어야 한다', () => {
    const initial = ['dashboard', 'attendance', 'timetable'];
    const res = toggleFavoriteTab(initial, 'attendance');
    assert.equal(res.isAdded, false);
    assert.equal(res.isLimitReached, false);
    assert.deepEqual(res.tabs, ['dashboard', 'timetable']);
  });

  it('toggleFavoriteTab: 새 탭은 추가되어야 한다', () => {
    const initial = ['dashboard', 'attendance'];
    const res = toggleFavoriteTab(initial, 'tuition');
    assert.equal(res.isAdded, true);
    assert.equal(res.isLimitReached, false);
    assert.deepEqual(res.tabs, ['dashboard', 'attendance', 'tuition']);
  });

  it('toggleFavoriteTab: 최대 개수(6개)를 초과하여 추가할 수 없어야 한다', () => {
    const full = ['dashboard', 'attendance', 'timetable', 'tuition', 'practice', 'students'];
    const res = toggleFavoriteTab(full, 'textbooks', MAX_FAVORITE_DOCK_ITEMS);
    assert.equal(res.isAdded, false);
    assert.equal(res.isLimitReached, true);
    assert.deepEqual(res.tabs, full);
  });
});
