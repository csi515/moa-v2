import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UndoToastBanner } from './UndoToastBanner';

describe('UndoToastBanner Component', () => {
  it('returns null when activeUndo is null', () => {
    const html = renderToStaticMarkup(
      React.createElement(UndoToastBanner, { activeUndo: null })
    );
    assert.equal(html, '');
  });

  it('renders message and execute undo button when activeUndo is present', () => {
    const html = renderToStaticMarkup(
      React.createElement(UndoToastBanner, {
        activeUndo: {
          id: 'test-1',
          message: '학생 3명이 삭제 대기 중입니다.',
          undo: () => {},
        },
        onDismiss: () => {},
      })
    );

    assert.match(html, /학생 3명이 삭제 대기 중입니다/);
    assert.match(html, /실행 취소/);
    assert.match(html, /닫기/);
  });
});
