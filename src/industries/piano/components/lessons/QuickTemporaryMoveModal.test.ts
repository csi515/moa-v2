import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuickTemporaryMoveModal } from './QuickTemporaryMoveModal';

describe('QuickTemporaryMoveModal Component', () => {
  it('returns null when isOpen is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickTemporaryMoveModal, {
        isOpen: false,
        onClose: () => {},
        student: null,
        fromClass: null,
        todayClasses: [],
        todayKoreanDay: '월',
        onMoved: () => {},
      })
    );
    assert.equal(html, '');
  });

  it('renders student name, current time, and quick slots when isOpen is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickTemporaryMoveModal, {
        isOpen: true,
        onClose: () => {},
        student: { id: 'st-1', name: '김민준' },
        fromClass: { id: 'c-1', name: '3시 피아노반', startTime: '15:00', endTime: '15:50' },
        todayClasses: [
          { id: 'c-1', name: '3시 피아노반', startTime: '15:00', endTime: '15:50' },
          { id: 'c-2', name: '4시 피아노반', startTime: '16:00', endTime: '16:50' },
        ],
        todayKoreanDay: '월',
        onMoved: () => {},
      })
    );

    assert.match(html, /오늘만 임시 변경/);
    assert.match(html, /김민준/);
    assert.match(html, /15:00/);
    assert.match(html, /16:00/);
    assert.match(html, /4시 피아노반/);
  });

  it('renders shuttle warning banner for shuttle students (케이스 1번)', () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickTemporaryMoveModal, {
        isOpen: true,
        onClose: () => {},
        student: {
          id: 'st-1',
          name: '이도현',
          shuttleRouteName: '1호차 래미안 노선',
          shuttleStopName: '래미안 102동 앞',
        },
        fromClass: { id: 'c-1', name: '3시 피아노반', startTime: '15:00', endTime: '15:50' },
        todayClasses: [],
        todayKoreanDay: '월',
        onMoved: () => {},
      })
    );

    assert.match(html, /셔틀 차량 이용 원생 주의/);
    assert.match(html, /1호차 래미안 노선/);
    assert.match(html, /보호자 자차\/도보 픽업 또는 차량 변경 확인 완료/);
  });
});
