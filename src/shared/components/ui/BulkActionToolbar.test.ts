import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BulkActionToolbar } from './BulkActionToolbar';

describe('BulkActionToolbar Component', () => {
  it('returns null when selectedCount is 0', () => {
    const html = renderToStaticMarkup(
      React.createElement(BulkActionToolbar, {
        selectedCount: 0,
        onClearSelection: () => {},
        actions: [],
      })
    );
    assert.equal(html, '');
  });

  it('renders counter and action buttons when selectedCount > 0', () => {
    const html = renderToStaticMarkup(
      React.createElement(BulkActionToolbar, {
        selectedCount: 5,
        totalCount: 20,
        itemName: '원생',
        onClearSelection: () => {},
        actions: [
          { key: 'invoice', label: '청구서 발행', onClick: () => {}, variant: 'primary' },
          { key: 'export', label: '엑셀 내보내기', onClick: () => {} },
        ],
      })
    );
    assert.match(html, /5/);
    assert.match(html, /20/);
    assert.match(html, /원생 선택됨/);
    assert.match(html, /청구서 발행/);
    assert.match(html, /엑셀 내보내기/);
  });
});
