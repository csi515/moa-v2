import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AcademyOpenQuestWidget } from './AcademyOpenQuestWidget';

describe('AcademyOpenQuestWidget Component', () => {
  it('renders open quest title and progress without demo sandbox injection', () => {
    const html = renderToStaticMarkup(
      React.createElement(AcademyOpenQuestWidget, {
        onNavigateTab: () => {},
      })
    );

    assert.match(html, /초기 운영 설정/);
    assert.match(html, /진행률/);
    assert.match(html, /사업장 정보 등록/);
    assert.match(html, /첫 번째 고객\/원생 등록/);
    assert.doesNotMatch(html, /샘플 데이터로 둘러보기/);
    assert.doesNotMatch(html, /샘플 데이터 초기화/);
  });
});
