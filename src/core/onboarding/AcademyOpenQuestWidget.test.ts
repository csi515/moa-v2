import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AcademyOpenQuestWidget } from './AcademyOpenQuestWidget';

describe('AcademyOpenQuestWidget Component', () => {
  it('renders open quest title, progress bar, and demo sandbox buttons', () => {
    const html = renderToStaticMarkup(
      React.createElement(AcademyOpenQuestWidget, {
        onNavigateTab: () => {},
      })
    );

    assert.match(html, /원장님 학원 오픈 퀘스트/);
    assert.match(html, /진행률/);
    assert.match(html, /사업장 정보 등록/);
    assert.match(html, /첫 번째 원생 등록하기/);
    assert.match(html, /샘플 데이터로 둘러보기/);
  });
});
