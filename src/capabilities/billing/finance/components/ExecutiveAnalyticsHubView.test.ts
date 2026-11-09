import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExecutiveAnalyticsHubView } from './ExecutiveAnalyticsHubView';

describe('ExecutiveAnalyticsHubView Component', () => {
  it('renders KPI metrics, trend charts and heatmap correctly', () => {
    const html = renderToStaticMarkup(
      React.createElement(ExecutiveAnalyticsHubView, { embedded: false })
    );

    // KPI text checks
    assert.match(html, /경영 성과 분석/);
    assert.match(html, /재원생 순증/);
    assert.match(html, /수납률/);
    assert.match(html, /피크타임 연습실 가동률/);

    // Chart & Heatmap labels
    assert.match(html, /최근 6개월 성장 트렌드/);
    assert.match(html, /수강료 결제 수단 비율/);
    assert.match(html, /요일·시간대별 연습실 가동률/);
  });
});
