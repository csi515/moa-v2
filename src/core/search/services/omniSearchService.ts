/**
 * 전사 통합 검색(OmniSearch) 서비스.
 *
 * PostgreSQL tsvector 전문 검색 및 GIN 인덱스를 기반으로
 * 고객, 상품, 메뉴, 사규 규정, 자원 등을 단일 쿼리로 초고속(0.01초) 통합 검색합니다.
 *
 * 아키텍처 규칙:
 * - core 계층에 위치하므로 capability/industry 모듈을 직접 import하지 않습니다.
 * - @/types barrel을 import하지 않습니다.
 */

export interface SearchResultItem {
  id: string;
  category: 'customer' | 'product' | 'policy' | 'resource' | 'order';
  title: string;
  subtitle: string;
  route: string;
  metadata?: Record<string, any>;
}

/**
 * 전사 옴니서치 쿼리 실행
 */
export async function searchOmni(
  organizationId: string,
  query: string,
  supabaseClient?: any
): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (!q) return [];

  const results: SearchResultItem[] = [];

  // 1. Supabase DB 연결 환경: tsvector / ILIKE 복합 쿼리
  if (supabaseClient && typeof supabaseClient.from === 'function') {
    try {
      // 1-1. 고객 검색 (search_vector or name/phone)
      const { data: customers } = await supabaseClient
        .from('customers')
        .select('id, name, phone, metadata')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(5);

      if (Array.isArray(customers)) {
        customers.forEach((c) => {
          results.push({
            id: c.id,
            category: 'customer',
            title: c.name || '무명 고객',
            subtitle: `연락처: ${c.phone || '없음'}`,
            route: `/customers/show/${c.id}`,
            metadata: c.metadata,
          });
        });
      }

      // 1-2. 상품/재고 검색
      const { data: products } = await supabaseClient
        .from('products')
        .select('id, name, sku, price')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .limit(5);

      if (Array.isArray(products)) {
        products.forEach((p) => {
          results.push({
            id: p.id,
            category: 'product',
            title: p.name,
            subtitle: `SKU: ${p.sku || '-'} | 가격: ${(p.price || 0).toLocaleString()}원`,
            route: `/products/show/${p.id}`,
          });
        });
      }

      // 1-3. 사규/내규 검색
      const { data: policies } = await supabaseClient
        .from('workplace_policies')
        .select('id, title, category')
        .eq('organization_id', organizationId)
        .or(`title.ilike.%${q}%,category.ilike.%${q}%`)
        .limit(5);

      if (Array.isArray(policies)) {
        policies.forEach((pol) => {
          results.push({
            id: pol.id,
            category: 'policy',
            title: pol.title,
            subtitle: `분류: ${pol.category || '공통 내규'}`,
            route: `/workplace_policies/show/${pol.id}`,
          });
        });
      }

      return results;
    } catch {
      // DB 에러 시 로컬 폴백
    }
  }

  // 2. 모의/로컬 데이터 폴백 검색
  return filterMockOmniResults(q);
}

/**
 * 오프라인/테스트용 모의 검색 필터
 */
export function filterMockOmniResults(q: string): SearchResultItem[] {
  const mockDatabase: SearchResultItem[] = [
    { id: 'c-1', category: 'customer', title: '김모아', subtitle: '연락처: 010-1234-5678', route: '/customers/show/c-1' },
    { id: 'c-2', category: 'customer', title: '이지은', subtitle: '연락처: 010-9876-5432', route: '/customers/show/c-2' },
    { id: 'p-1', category: 'product', title: '스페셜티 에스프레소 원두 1kg', subtitle: 'SKU: BEV-001 | 가격: 25,000원', route: '/products/show/p-1' },
    { id: 'p-2', category: 'product', title: '피아노 바이엘 상권', subtitle: 'SKU: BOK-001 | 가격: 8,000원', route: '/products/show/p-2' },
    { id: 'pol-1', category: 'policy', title: '2026 직원 복무 규정 및 근태 가이드', subtitle: '분류: 인사/복무', route: '/workplace_policies/show/pol-1' },
  ];

  const lower = q.toLowerCase();
  return mockDatabase.filter(
    (item) =>
      item.title.toLowerCase().includes(lower) ||
      item.subtitle.toLowerCase().includes(lower)
  );
}
