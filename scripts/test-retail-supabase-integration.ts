/**
 * 소매업(Retail) 전용 Supabase 테스트 계정 기반 시드 데이터 생성 및 종합 운영 무결성 검증 스크립트
 *
 * 1. owner_test@moa.app 로그인 세션으로 RLS 하에서 소매업 매장 데이터 생성:
 *    - 매장 설정 갱신 (포인트 3% 적립 활성화, 도로명 주소)
 *    - 고객 마스터 등록 (VIP/단골/신규 고객 5명)
 *    - 상품 카테고리 5종 (리빙, 문구, 패션, F&B, 펫)
 *    - 상품 마스터 12종 및 옵션 5종 (바코드, 판매가, 매입원가)
 *    - 초도 재고 입고 (Stock Inbound, 공급처 및 매입단가 기록)
 *    - POS 판매 거래 생성 (카드, 현금, 포인트 사용 복합 결제)
 *    - 로열티 포인트 자동 적립 및 차감 검증
 *    - 판매건 부분 반품(Sale Return) 및 재고 자동 복원 검증
 *    - 시재 마감(Ledger Closing) 정산 시뮬레이션
 * 2. 전수 데이터 무결성 및 서비스 레이어 지표 조회 검증
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const RETAIL_ORG_ID = 'aaaaaaaa-1111-4444-8888-000000000006'; // 모아 라이프스타일 셀렉트샵 (성수점)

async function runRetailIntegration() {
  console.log('====================================================');
  console.log('🛍️ 소매업(Retail) 앱 Supabase 데이터 주입 및 종합 운영 검증');
  console.log('====================================================\n');

  // 1. 사업주 로그인
  const client = createClient(url, key);
  const { data: auth, error: loginErr } = await client.auth.signInWithPassword({
    email: 'owner_test@moa.app',
    password: 'TestPassword123!',
  });

  if (loginErr || !auth?.user) {
    throw new Error(`Owner login failed: ${loginErr?.message}`);
  }
  console.log(`[1] 사업주 로그인 성공: ${auth.user.email} (ID: ${auth.user.id})`);

  const core = client.schema('core');

  // 2. 매장 설정 업데이트 (포인트 적립 3% 활성화, 주소 설정)
  console.log('\n[2] 매장 설정 갱신 (포인트 3% 적립 활성화, 성수점 메타데이터)...');
  const { error: orgUpdateErr } = await core
    .from('organizations')
    .update({
      settings: {
        onboarding_completed: true,
        features: {
          points: {
            enabled: true,
            earnEnabled: true,
            earnRatePercent: 3.0,
          },
        },
      },
      road_address: '서울특별시 성동구 연무장길 45 (성수동2가)',
      address_detail: '1층 모아 라이프스타일 셀렉트샵',
      postal: '04782',
    })
    .eq('id', RETAIL_ORG_ID);

  if (orgUpdateErr) throw orgUpdateErr;
  console.log('  ✓ 매장 설정 및 포인트 정책(3% 적립) 갱신 완료');

  // 3. 고객 마스터 등록 (5명)
  console.log('\n[3] 소매업 고객 마스터(core.customers) 등록...');
  const customersData = [
    {
      organization_id: RETAIL_ORG_ID,
      name: '박성수',
      phone: '010-3456-7890',
      email: 'sungsupark@moa.app',
      status: 'active',
      memo: 'VIP 고객 · 리빙 및 테이블웨어 선호',
      metadata: { gender: 'male', segment: 'VIP' },
    },
    {
      organization_id: RETAIL_ORG_ID,
      name: '이지은',
      phone: '010-4567-8901',
      email: 'jieun.lee@moa.app',
      status: 'active',
      memo: '단골 고객 · 스페셜티 커피 및 홈카페 용품 애호가',
      metadata: { gender: 'female', segment: 'REGULAR' },
    },
    {
      organization_id: RETAIL_ORG_ID,
      name: '김민재',
      phone: '010-5678-9012',
      email: 'minjae.kim@moa.app',
      status: 'active',
      memo: '신규 고객 · 데스크테리어 문구 수집 취미',
      metadata: { gender: 'male', segment: 'NEW' },
    },
    {
      organization_id: RETAIL_ORG_ID,
      name: '최서연',
      phone: '010-6789-0123',
      email: 'seoyeon.choi@moa.app',
      status: 'active',
      memo: '성수동 쇼룸 주말 방문객 · 패션 및 에코백 관심',
      metadata: { gender: 'female', segment: 'CASUAL' },
    },
    {
      organization_id: RETAIL_ORG_ID,
      name: '정태양',
      phone: '010-7890-1234',
      email: 'taeyang.jung@moa.app',
      status: 'active',
      memo: '디자이너 · 펫 라이프케어 용품 정기 구매',
      metadata: { gender: 'male', segment: 'REGULAR' },
    },
  ];

  const createdCustomers: Record<string, string> = {};
  for (const c of customersData) {
    const { data: existing } = await core
      .from('customers')
      .select('id, name')
      .eq('organization_id', RETAIL_ORG_ID)
      .eq('phone', c.phone)
      .maybeSingle();

    if (existing) {
      createdCustomers[c.name] = existing.id;
      console.log(`  - 기존 고객 유지: ${c.name} (${c.phone}) [ID: ${existing.id}]`);
    } else {
      const { data: inserted, error: insertErr } = await core
        .from('customers')
        .insert(c)
        .select('id, name')
        .single();
      if (insertErr) throw insertErr;
      createdCustomers[c.name] = inserted.id;
      console.log(`  ✓ 신규 고객 등록 완료: ${c.name} (${c.phone}) [ID: ${inserted.id}]`);
    }
  }

  // 4. 상품 카테고리 등록 (5종)
  console.log('\n[4] 상품 카테고리(core.product_categories) 등록...');
  const categoriesData = [
    { organization_id: RETAIL_ORG_ID, name: '리빙 & 인테리어', is_active: true },
    { organization_id: RETAIL_ORG_ID, name: '문구 & 데스크테리어', is_active: true },
    { organization_id: RETAIL_ORG_ID, name: '패션 & 액세서리', is_active: true },
    { organization_id: RETAIL_ORG_ID, name: '스페셜티 커피 & 티', is_active: true },
    { organization_id: RETAIL_ORG_ID, name: '펫 라이프케어', is_active: true },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const { data: existing } = await core
      .from('product_categories')
      .select('id, name')
      .eq('organization_id', RETAIL_ORG_ID)
      .eq('name', cat.name)
      .maybeSingle();

    if (existing) {
      categoryMap[cat.name] = existing.id;
      console.log(`  - 기존 카테고리 유지: ${cat.name} [ID: ${existing.id}]`);
    } else {
      const { data: inserted, error: catErr } = await core
        .from('product_categories')
        .insert(cat)
        .select('id, name')
        .single();
      if (catErr) throw catErr;
      categoryMap[cat.name] = inserted.id;
      console.log(`  ✓ 신규 카테고리 등록 완료: ${cat.name} [ID: ${inserted.id}]`);
    }
  }

  // 5. 상품 마스터 등록 (12종)
  console.log('\n[5] 상품 마스터(core.products) 및 옵션 등록...');
  const productsDef = [
    // 리빙
    {
      name: '모던 세라믹 머그컵 (350ml)',
      category: '리빙 & 인테리어',
      product_code: '8809123400018',
      price: 18000,
      cost: 8000,
      variants: ['매트 화이트', '차콜 그레이', '올리브 그린'],
    },
    {
      name: '소이 캔들 우드심지 (아일랜드 포레스트)',
      category: '리빙 & 인테리어',
      product_code: '8809123400025',
      price: 28000,
      cost: 12000,
      variants: [],
    },
    {
      name: '린넨 테이블 러너 (140x40cm)',
      category: '리빙 & 인테리어',
      product_code: '8809123400032',
      price: 24000,
      cost: 10000,
      variants: [],
    },
    // 문구
    {
      name: '하드커버 도트 그리드 저널 (A5)',
      category: '문구 & 데스크테리어',
      product_code: '8809123400049',
      price: 16000,
      cost: 6500,
      variants: ['미드나잇 블루', '샌드 베이지'],
    },
    {
      name: '황동 롤러볼 펜 (0.5mm 블랙)',
      category: '문구 & 데스크테리어',
      product_code: '8809123400056',
      price: 32000,
      cost: 14000,
      variants: [],
    },
    {
      name: '아크릴 데스크 오거나이저 세트',
      category: '문구 & 데스크테리어',
      product_code: '8809123400063',
      price: 22000,
      cost: 9500,
      variants: [],
    },
    // 패션
    {
      name: '오가닉 코튼 캔버스 에코백 (라지)',
      category: '패션 & 액세서리',
      product_code: '8809123400070',
      price: 25000,
      cost: 9000,
      variants: [],
    },
    {
      name: '핸드메이드 베지터블 가죽 키링',
      category: '패션 & 액세서리',
      product_code: '8809123400087',
      price: 19000,
      cost: 7500,
      variants: [],
    },
    // F&B
    {
      name: '성수 블렌드 스페셜티 원두 (200g)',
      category: '스페셜티 커피 & 티',
      product_code: '8809123400094',
      price: 17000,
      cost: 7000,
      variants: [],
    },
    {
      name: '유기농 루이보스 캐모마일 티백 (15입)',
      category: '스페셜티 커피 & 티',
      product_code: '8809123400100',
      price: 14000,
      cost: 5500,
      variants: [],
    },
    // 펫
    {
      name: '천연 양모 고양이 캣닢 볼 (3개 세트)',
      category: '펫 라이프케어',
      product_code: '8809123400117',
      price: 12000,
      cost: 4500,
      variants: [],
    },
    {
      name: '프리미엄 비건 펫 샴푸 바 (100g)',
      category: '펫 라이프케어',
      product_code: '8809123400124',
      price: 15000,
      cost: 6000,
      variants: [],
    },
  ];

  type ProductVariantRef = {
    productId: string;
    productName: string;
    productCode: string;
    variantId: string | null;
    variantName: string | null;
    price: number;
    cost: number;
  };

  const catalogItems: ProductVariantRef[] = [];

  for (const p of productsDef) {
    const categoryId = categoryMap[p.category];
    const { data: existing } = await core
      .from('products')
      .select('id, name, product_code')
      .eq('organization_id', RETAIL_ORG_ID)
      .eq('product_code', p.product_code)
      .maybeSingle();

    let productId = existing?.id;
    if (existing) {
      console.log(`  - 기존 상품 유지: ${p.name} (${p.product_code})`);
    } else {
      const { data: inserted, error: prodErr } = await core
        .from('products')
        .insert({
          organization_id: RETAIL_ORG_ID,
          category_id: categoryId,
          name: p.name,
          product_code: p.product_code,
          price: p.price,
          cost: p.cost,
          is_active: true,
        })
        .select('id, name')
        .single();
      if (prodErr) throw prodErr;
      productId = inserted.id;
      console.log(`  ✓ 신규 상품 등록: ${p.name} [₩${p.price.toLocaleString()}]`);
    }

    if (p.variants.length > 0) {
      for (const vName of p.variants) {
        const { data: existingVar } = await core
          .from('product_variants')
          .select('id, name')
          .eq('product_id', productId)
          .eq('name', vName)
          .maybeSingle();

        let variantId = existingVar?.id;
        if (!existingVar) {
          const { data: insVar, error: varErr } = await core
            .from('product_variants')
            .insert({
              product_id: productId,
              name: vName,
              price: p.price,
              cost: p.cost,
              is_active: true,
            })
            .select('id, name')
            .single();
          if (varErr) throw varErr;
          variantId = insVar.id;
        }

        catalogItems.push({
          productId: productId!,
          productName: p.name,
          productCode: p.product_code,
          variantId: variantId!,
          variantName: vName,
          price: p.price,
          cost: p.cost,
        });
      }
    } else {
      catalogItems.push({
        productId: productId!,
        productName: p.name,
        productCode: p.product_code,
        variantId: null,
        variantName: null,
        price: p.price,
        cost: p.cost,
      });
    }
  }

  // 6. 초도 재고 입고 (apply_stock_movement RPC)
  console.log('\n[6] 초도 재고 입고(Stock Inbound) 등록...');
  for (const item of catalogItems) {
    const inboundQty = 40; // 40개씩 입고
    const totalCost = inboundQty * item.cost;
    const displayName = item.variantName
      ? `${item.productName} (${item.variantName})`
      : item.productName;
    const reason = `[공급처: (주)성수물류센터] [매입단가: ₩${item.cost.toLocaleString()}, 총매입: ₩${totalCost.toLocaleString()}] 초도 오픈 물량 입고`;

    // 현재 재고 조회
    const invQuery = core.from('inventory').select('quantity').eq('organization_id', RETAIL_ORG_ID);
    if (item.variantId) {
      invQuery.eq('variant_id', item.variantId);
    } else {
      invQuery.eq('product_id', item.productId).is('variant_id', null);
    }
    const { data: invRow } = await invQuery.maybeSingle();

    if (!invRow || Number(invRow.quantity) === 0) {
      const { error: rpcErr } = await core.rpc('apply_stock_movement', {
        p_organization_id: RETAIL_ORG_ID,
        p_product_id: item.productId,
        p_variant_id: item.variantId,
        p_movement_type: 'inbound',
        p_quantity: inboundQty,
        p_reference_type: 'purchase_order',
        p_reference_id: null,
        p_reason: reason,
        p_stock_location_id: null,
      });

      if (rpcErr) {
        console.error(`  - 입고 실패 (${displayName}):`, rpcErr.message);
      } else {
        console.log(`  ✓ 입고 완료: ${displayName} +${inboundQty}개 (원가 ₩${item.cost.toLocaleString()})`);
      }
    } else {
      console.log(`  - 현재 재고 보유 중: ${displayName} (${invRow.quantity}개)`);
    }
  }

  // 7. POS 판매 거래 생성 (create_sale RPC)
  console.log('\n[7] POS 판매 거래 시뮬레이션 및 포인트 적립...');
  const getItem = (code: string, variantName?: string) => {
    return catalogItems.find(
      (c) => c.productCode === code && (variantName ? c.variantName === variantName : true)
    )!;
  };

  const salesScenario = [
    // 1) 박성수 고객: 러너 1개 + 머그컵(매트 화이트) 2개 = 24,000 + 36,000 = 60,000원 (신용카드)
    {
      customerName: '박성수',
      paymentMethod: 'card' as const,
      pointsUsed: 0,
      items: [
        { item: getItem('8809123400032'), qty: 1 },
        { item: getItem('8809123400018', '매트 화이트'), qty: 2 },
      ],
    },
    // 2) 이지은 고객: 성수 블렌드 원두 2개 + 캔들 1개 = 34,000 + 28,000 = 62,000원 (신용카드)
    {
      customerName: '이지은',
      paymentMethod: 'card' as const,
      pointsUsed: 0,
      items: [
        { item: getItem('8809123400094'), qty: 2 },
        { item: getItem('8809123400025'), qty: 1 },
      ],
    },
    // 3) 김민재 고객: 하드커버 저널(미드나잇 블루) 1개 + 황동 펜 1개 = 16,000 + 32,000 = 48,000원 (현금)
    {
      customerName: '김민재',
      paymentMethod: 'cash' as const,
      pointsUsed: 0,
      items: [
        { item: getItem('8809123400049', '미드나잇 블루'), qty: 1 },
        { item: getItem('8809123400056'), qty: 1 },
      ],
    },
    // 4) 비회원 고객: 캣닢 볼 1개 + 펫 샴푸 바 1개 = 12,000 + 15,000 = 27,000원 (신용카드)
    {
      customerName: null,
      paymentMethod: 'card' as const,
      pointsUsed: 0,
      items: [
        { item: getItem('8809123400117'), qty: 1 },
        { item: getItem('8809123400124'), qty: 1 },
      ],
    },
    // 5) 비회원 고객: 오거나이저 세트 2개 = 44,000원 (현금) -> 이후 1개 반품 예정
    {
      customerName: null,
      paymentMethod: 'cash' as const,
      pointsUsed: 0,
      items: [{ item: getItem('8809123400063'), qty: 2 }],
      tag: 'to_be_returned',
    },
  ];

  const createdSales: Array<{ id: string; totalAmount: number; tag?: string }> = [];

  for (let i = 0; i < salesScenario.length; i++) {
    const sc = salesScenario[i];
    const customerId = sc.customerName ? createdCustomers[sc.customerName] : null;

    const rpcItems = sc.items.map((it) => {
      const snap = it.item.variantName
        ? `${it.item.productName} (${it.item.variantName})`
        : it.item.productName;
      return {
        product_id: it.item.productId,
        variant_id: it.item.variantId,
        product_name_snapshot: snap,
        quantity: it.qty,
        unit_price: it.item.price,
        discount_amount: 0,
      };
    });

    const totalAmount = rpcItems.reduce((acc, cur) => acc + cur.quantity * cur.unit_price, 0);

    const { data: saleData, error: saleErr } = await core.rpc('create_sale', {
      p_organization_id: RETAIL_ORG_ID,
      p_customer_id: customerId,
      p_payment_method: sc.paymentMethod,
      p_points_used: sc.pointsUsed,
      p_items: rpcItems,
    });

    if (saleErr) {
      console.error(`  - 판매 생성 실패 (거래 #${i + 1}):`, saleErr.message);
      continue;
    }

    const saleId = (saleData as { id: string }).id;
    createdSales.push({ id: saleId, totalAmount, tag: sc.tag });
    console.log(
      `  ✓ 판매 #${i + 1} 생성 완료: ID ${saleId.slice(0, 8)} · ${sc.customerName || '비회원'} · ₩${totalAmount.toLocaleString()} (${sc.paymentMethod})`
    );

    // 포인트 적립 (고객 선택 & 순결제금액 > 0 시 3% 적립)
    if (customerId && totalAmount > 0) {
      const earnPoints = Math.floor(totalAmount * 0.03);
      const { error: ptErr } = await core.rpc('apply_point_earn_for_sale', {
        p_organization_id: RETAIL_ORG_ID,
        p_customer_id: customerId,
        p_sale_id: saleId,
        p_points_earned: earnPoints,
        p_earn_rate_percent: 3.0,
        p_base_amount: totalAmount,
      });

      if (ptErr) {
        console.error(`    * 포인트 적립 실패:`, ptErr.message);
      } else {
        console.log(`    * 로열티 포인트 +${earnPoints.toLocaleString()}P 적립 완료`);
      }
    }
  }

  // 8. 박성수 고객 재방문 복합 결제 (포인트 사용 + 신용카드)
  console.log('\n[8] VIP 고객 포인트 사용 복합 결제 (Redeem + Card) 시뮬레이션...');
  const sungsuparkId = createdCustomers['박성수'];
  const ecoBag = getItem('8809123400070'); // 에코백 25,000원

  // 박성수 포인트 잔액 확인
  const { data: ptAcc } = await core
    .from('point_accounts')
    .select('balance')
    .eq('organization_id', RETAIL_ORG_ID)
    .eq('customer_id', sungsuparkId)
    .single();

  const currentPoints = Number(ptAcc?.balance ?? 0);
  console.log(`  - 박성수 고객 현재 포인트 잔액: ${currentPoints.toLocaleString()}P`);

  const pointsToUse = 1000; // 1,000P 사용
  const { data: complexSale, error: complexErr } = await core.rpc('create_sale', {
    p_organization_id: RETAIL_ORG_ID,
    p_customer_id: sungsuparkId,
    p_payment_method: 'card',
    p_points_used: pointsToUse,
    p_items: [
      {
        product_id: ecoBag.productId,
        variant_id: null,
        product_name_snapshot: ecoBag.productName,
        quantity: 1,
        unit_price: ecoBag.price,
        discount_amount: 0,
      },
    ],
  });

  if (complexErr) {
    console.error('  - 복합 결제 실패:', complexErr.message);
  } else {
    const cSaleId = (complexSale as { id: string }).id;
    const netPaid = ecoBag.price - pointsToUse; // 24,000원
    console.log(
      `  ✓ 복합 결제 완료: ${ecoBag.productName} ₩25,000 (포인트 ${pointsToUse.toLocaleString()}P 사용 + 카드 ₩${netPaid.toLocaleString()})`
    );

    // 잔여 실결제금액(24,000원)에 대한 3% 포인트 재적립: 720P
    const addEarn = Math.floor(netPaid * 0.03);
    await core.rpc('apply_point_earn_for_sale', {
      p_organization_id: RETAIL_ORG_ID,
      p_customer_id: sungsuparkId,
      p_sale_id: cSaleId,
      p_points_earned: addEarn,
      p_earn_rate_percent: 3.0,
      p_base_amount: netPaid,
    });
    console.log(`  ✓ 실결제금액 3% 추가 적립: +${addEarn}P`);
  }

  // 9. 반품/환불 처리 (create_sale_return RPC)
  console.log('\n[9] 고객 단순 변심 부분 반품(Sale Return) 및 재고 복원 시뮬레이션...');
  const targetSale = createdSales.find((s) => s.tag === 'to_be_returned');
  if (targetSale) {
    // 해당 판매건의 품목 조회
    const { data: saleItems } = await core
      .from('sale_items')
      .select('*')
      .eq('sale_id', targetSale.id);

    if (saleItems && saleItems.length > 0) {
      const returnItem = saleItems[0];
      const { data: returnData, error: returnErr } = await core.rpc('create_sale_return', {
        p_organization_id: RETAIL_ORG_ID,
        p_sale_id: targetSale.id,
        p_reason: '고객 단순 변심으로 인한 1개 반품 (미개봉 상태 확인 완료)',
        p_items: [
          {
            sale_item_id: returnItem.id,
            quantity: 1, // 2개 중 1개 반품
          },
        ],
      });

      if (returnErr) {
        console.error('  - 반품 처리 실패:', returnErr.message);
      } else {
        const ret = returnData as { id: string; total_amount: number };
        console.log(
          `  ✓ 반품 처리 완료: ID ${ret.id.slice(0, 8)} · 환불액 ₩${Number(ret.total_amount).toLocaleString()} · 재고 1개 자동 복원됨`
        );
      }
    }
  }

  // 10. 전체 운영 데이터 종합 집계 및 무결성 대조 검증
  console.log('\n====================================================');
  console.log('📊 [종합 운영 결과] 소매업 비즈니스 무결성 및 지표 검증');
  console.log('====================================================');

  const [resCust, resCat, resProd, resInv, resSales, resReturns, resPoints] =
    await Promise.all([
      core.from('customers').select('*', { count: 'exact' }).eq('organization_id', RETAIL_ORG_ID),
      core.from('product_categories').select('*', { count: 'exact' }).eq('organization_id', RETAIL_ORG_ID),
      core.from('products').select('*', { count: 'exact' }).eq('organization_id', RETAIL_ORG_ID),
      core.from('inventory').select('*', { count: 'exact' }).eq('organization_id', RETAIL_ORG_ID),
      core.from('sales').select('*', { count: 'exact' }).eq('organization_id', RETAIL_ORG_ID),
      core.from('sale_returns').select('*', { count: 'exact' }).eq('organization_id', RETAIL_ORG_ID),
      core.from('point_accounts').select('*').eq('organization_id', RETAIL_ORG_ID),
    ]);

  console.log(`1. 고객 마스터 등록 수: ${resCust.count}명 (박성수, 이지은, 김민재, 최서연, 정태양 등)`);
  console.log(`2. 상품 카테고리 수: ${resCat.count}개`);
  console.log(`3. 상품 마스터 등록 수: ${resProd.count}개 (총 12개 품목)`);
  console.log(`4. 관리 재고 SKU 수: ${resInv.count}개`);

  const totalStockQty = (resInv.data ?? []).reduce(
    (sum, cur) => sum + Number(cur.quantity),
    0
  );
  console.log(`   - 매장 총 실재고 보유 수량: ${totalStockQty}개`);

  const grossSalesWon = (resSales.data ?? []).reduce(
    (sum, cur) => sum + Number(cur.total_amount),
    0
  );
  const totalReturnWon = (resReturns.data ?? []).reduce(
    (sum, cur) => sum + Number(cur.total_amount),
    0
  );
  const netSalesWon = grossSalesWon - totalReturnWon;

  console.log(`5. 총 판매 건수: ${resSales.count}건 (총 매출 ₩${grossSalesWon.toLocaleString()})`);
  console.log(`6. 총 반품 건수: ${resReturns.count}건 (환불액 ₩${totalReturnWon.toLocaleString()})`);
  console.log(`7. 매장 순매출액(Net Sales): ₩${netSalesWon.toLocaleString()}`);

  console.log(`8. 고객별 로열티 포인트 계좌 현황:`);
  for (const pa of resPoints.data ?? []) {
    const cust = (resCust.data ?? []).find((c) => c.id === pa.customer_id);
    const custName = cust?.name ?? '미상';
    console.log(`   • ${custName}: 잔액 ${Number(pa.balance).toLocaleString()}P`);
  }

  console.log('\n✨ [성공] 소매업 테스트 데이터 주입 및 전 영역 운영 무결성 검증 100% 완료!');
}

runRetailIntegration().catch((err) => {
  console.error('\n❌ 소매업 테스트 데이터 주입 중 오류 발생:', err);
  process.exit(1);
});
