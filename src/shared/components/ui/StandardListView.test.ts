import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StandardListView } from './StandardListView';

interface TestItem {
  id: string;
  name: string;
  phone: string;
  role: string;
}

const mockData: TestItem[] = [
  { id: '1', name: '김철수', phone: '010-1111-2222', role: '학생' },
  { id: '2', name: '이영희', phone: '010-3333-4444', role: '학생' },
  { id: '3', name: '박지민', phone: '010-5555-6666', role: '강사' },
];

const mockColumns = [
  { key: 'name', header: '이름', render: (r: TestItem) => r.name, sortable: true },
  { key: 'phone', header: '연락처', render: (r: TestItem) => r.phone },
  { key: 'role', header: '역할', render: (r: TestItem) => r.role },
];

describe('StandardListView Component', () => {
  it('renders data rows properly', () => {
    const html = renderToStaticMarkup(
      React.createElement(StandardListView, {
        data: mockData,
        columns: mockColumns,
        keyExtractor: (r: TestItem) => r.id,
      })
    );
    assert.match(html, /김철수/);
    assert.match(html, /이영희/);
    assert.match(html, /박지민/);
    assert.match(html, /010-1111-2222/);
  });

  it('renders loading skeleton when isLoading is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(StandardListView, {
        data: [],
        columns: mockColumns,
        keyExtractor: (r: TestItem) => r.id,
        isLoading: true,
      })
    );
    assert.match(html, /animate-pulse/);
  });

  it('renders empty state hero when data is empty', () => {
    const html = renderToStaticMarkup(
      React.createElement(StandardListView, {
        data: [],
        columns: mockColumns,
        keyExtractor: (r: TestItem) => r.id,
        emptyState: {
          title: '등록된 원생이 없습니다',
          actionLabel: '신규 등록',
          onAction: () => {},
        },
      })
    );
    assert.match(html, /등록된 원생이 없습니다/);
    assert.match(html, /신규 등록/);
  });

  it('renders search bar and export button when flags are set', () => {
    const html = renderToStaticMarkup(
      React.createElement(StandardListView, {
        data: mockData,
        columns: mockColumns,
        keyExtractor: (r: TestItem) => r.id,
        searchable: { placeholder: '이름 검색' },
        exportable: true,
      })
    );
    assert.match(html, /이름 검색/);
    assert.match(html, /내보내기/);
  });

  it('auto-hides pagination when total items is under pageSize', () => {
    const html = renderToStaticMarkup(
      React.createElement(StandardListView, {
        data: mockData, // 3 items
        columns: mockColumns,
        keyExtractor: (r: TestItem) => r.id,
        paginated: { pageSize: 15 }, // 15 pageSize > 3 items -> auto-hidden
      })
    );
    // PaginationBar contains text-slate-600 and page controls
    assert.doesNotMatch(html, /개씩 보기/);
  });
});
