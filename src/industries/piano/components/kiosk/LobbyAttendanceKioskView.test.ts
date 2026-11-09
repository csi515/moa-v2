import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LobbyAttendanceKioskView } from './LobbyAttendanceKioskView';

describe('LobbyAttendanceKioskView Component', () => {
  it('renders kiosk header, keypad, and pin prompt', () => {
    const html = renderToStaticMarkup(
      React.createElement(LobbyAttendanceKioskView, {
        onExitKiosk: () => {},
        academyName: '테스트 음악학원',
        students: [
          { id: 'st-1', name: '김민준', phone: '010-1234-5678' },
        ],
      })
    );

    assert.match(html, /테스트 음악학원/);
    assert.match(html, /원생 로비 출결 키오스크/);
    assert.match(html, /출석 번호를 입력해주세요/);
    assert.match(html, /초기화/);
  });
});
