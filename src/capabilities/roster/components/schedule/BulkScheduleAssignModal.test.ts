import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BulkScheduleAssignModal } from './BulkScheduleAssignModal';

describe('BulkScheduleAssignModal Component', () => {
  it('returns null when isOpen is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(BulkScheduleAssignModal, {
        isOpen: false,
        onClose: () => {},
        selectedStudents: [],
        onAssigned: () => {},
      })
    );
    assert.equal(html, '');
  });

  it('renders modal with selected students and slot config options', () => {
    const mockStudents = [
      { id: 'st-1', name: '김민준' },
      { id: 'st-2', name: '이지원' },
      { id: 'st-3', name: '박서현' },
    ];

    const html = renderToStaticMarkup(
      React.createElement(BulkScheduleAssignModal, {
        isOpen: true,
        onClose: () => {},
        selectedStudents: mockStudents,
        onAssigned: () => {},
      })
    );

    assert.match(html, /시간표 일괄 배정/);
    assert.match(html, /3명/);
    assert.match(html, /김민준/);
    assert.match(html, /이지원/);
    assert.match(html, /수업 요일 선택/);
    assert.match(html, /시작 시간/);
    assert.match(html, /일괄 배정 완료/);
  });

  it('renders frequency warning banner when 3 or more days are selected (엣지 4번)', () => {
    const mockStudents = [{ id: 'st-1', name: '김민준' }];

    const html = renderToStaticMarkup(
      React.createElement(BulkScheduleAssignModal, {
        isOpen: true,
        onClose: () => {},
        selectedStudents: mockStudents,
        onAssigned: () => {},
      })
    );

    // 기본값이 월수금(3일)이므로 주 3회 빈도 안내 배너 노출 검증
    assert.match(html, /주 3회/);
    assert.match(html, /원생의 등록 수강권/);
  });

  it('onNavigateToTimetable 콜백 prop을 전달받아도 정상 렌더링된다', () => {
    let navigated = false;
    const html = renderToStaticMarkup(
      React.createElement(BulkScheduleAssignModal, {
        isOpen: true,
        onClose: () => {},
        selectedStudents: [{ id: 'st-1', name: '김민준' }],
        onAssigned: () => {},
        onNavigateToTimetable: () => {
          navigated = true;
        },
      })
    );

    assert.match(html, /시간표 일괄 배정/);
  });

  it('다중 요일 선택 시 요일별 개별 시간 지정 토글이 렌더링된다 (7번: 불규칙 시간표 지원)', () => {
    const html = renderToStaticMarkup(
      React.createElement(BulkScheduleAssignModal, {
        isOpen: true,
        onClose: () => {},
        selectedStudents: [{ id: 'st-1', name: '김민준' }],
        onAssigned: () => {},
      })
    );

    // 기본값이 월수금(다중 요일)이므로 토글 렌더링 검증
    assert.match(html, /요일마다 다른 시간에 시작하기/);
  });
});
