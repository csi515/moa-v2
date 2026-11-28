import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AcademyOpenQuestWidget } from './AcademyOpenQuestWidget';

describe('AcademyOpenQuestWidget (deprecated stub)', () => {
  it('renders nothing (GettingStartedQuestWidget로 이전)', () => {
    const html = renderToStaticMarkup(
      React.createElement(AcademyOpenQuestWidget, {
        onNavigateTab: () => {},
      })
    );
    assert.equal(html, '');
  });
});
