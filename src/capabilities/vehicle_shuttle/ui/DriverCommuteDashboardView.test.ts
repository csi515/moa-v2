import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DriverCommuteDashboardView } from './DriverCommuteDashboardView';
import { INITIAL_COMMUTE_ROUTES } from '../services/shuttleCommuteService';

// 정류장 0개 노선: 크래시 없이 빈 상태 렌더링
const emptyRoute = { ...INITIAL_COMMUTE_ROUTES[0], stops: [] };
const emptyHtml = renderToStaticMarkup(createElement(DriverCommuteDashboardView, { route: emptyRoute, requests: [] }));
assert.match(emptyHtml, /등록된 정류장이 없습니다/);

// 정류장 있는 노선은 기존 운행표 그대로
const html = renderToStaticMarkup(createElement(DriverCommuteDashboardView, { route: INITIAL_COMMUTE_ROUTES[0], requests: [] }));
assert.match(html, /현재 정차지/);
assert.doesNotMatch(html, /등록된 정류장이 없습니다/);

console.log('DriverCommuteDashboardView.test.ts: ok');
