import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NotificationDrawer } from './NotificationDrawer';

describe('NotificationDrawer Component', () => {
  it('returns null when isOpen is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotificationDrawer, {
        isOpen: false,
        onClose: () => {},
      })
    );
    assert.equal(html, '');
  });

  it('renders drawer header, tabs, and content when isOpen is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotificationDrawer, {
        isOpen: true,
        onClose: () => {},
      })
    );

    assert.match(html, /알림 센터/);
    assert.match(html, /전체/);
    assert.match(html, /미확인/);
    assert.match(html, /수강료·결제/);
    assert.match(html, /출결·예약/);
  });
});
