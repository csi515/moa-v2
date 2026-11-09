import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentGrowthReportModal } from './StudentGrowthReportModal';

describe('StudentGrowthReportModal Component (Capability Level)', () => {
  const mockStudent = {
    id: 's-1',
    name: '김민준',
    birthDate: '2015-04-12',
    phone: '010-1234-5678',
    level: '체르니 100번',
    teacherName: '박지민 강사',
    status: 'active',
  };

  it('renders student report details and print elements when open', () => {
    const html = renderToStaticMarkup(
      React.createElement(StudentGrowthReportModal, {
        isOpen: true,
        onClose: () => {},
        student: mockStudent,
        academyName: '모아 피아노 음악학원',
      })
    );

    assert.match(html, /피아노 레슨 종합 성장 리포트/);
    assert.match(html, /김민준/);
    assert.match(html, /체르니 100번/);
    assert.match(html, /A4 인쇄 \/ PDF 저장/);
  });
});
