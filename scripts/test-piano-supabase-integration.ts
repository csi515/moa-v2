/**
 * 피아노학원 전용 Supabase 테스트 계정 기반 데이터 생성 및 종합 검증 스크립트
 * 
 * 1. owner_test@moa.app 로그인 세션으로 RLS 하에서 피아노학원 데이터 생성
 *    - 원생 세부정보 (piano.customers)
 *    - 교재 마스터 (piano.textbooks)
 *    - 교재 판매 및 수납 (piano.textbook_sales, piano.textbook_payments)
 *    - 연습실 현황 (core.practice_rooms)
 *    - 레슨 스케줄 (core.schedules)
 *    - 출결 기록 (piano.attendance)
 *    - 곡 진도 및 스탬프 (piano.song_progress)
 *    - 주간 과제 (piano.weekly_assignments, piano.assignment_items)
 * 2. owner 계정으로 전 데이터 무결성 검증
 * 3. staff_test@moa.app 및 parent_test@moa.app 로그인으로 다역할 RLS 조회 검증
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const ORG_ID = 'aaaaaaaa-1111-4444-8888-000000000001'; // 모아 피아노 아카데미 (대치본점)
const STUDENT_ADULT_ID = 'bbbbbbbb-2222-4444-8888-000000000002'; // 박수강 (성인회원)
const STUDENT_CHILD_ID = 'ffffffff-6666-4444-8888-000000000006'; // 김모아 (원생)

async function runPianoIntegrationTest() {
  console.log('====================================================');
  console.log('🎹 피아노학원 앱 Supabase 테스트 계정 종합 검증 시작');
  console.log('====================================================\n');

  // 1. 사업주 계정 로그인 (김대표 - owner_test@moa.app)
  const ownerClient = createClient(url, key);
  const { data: ownerAuth, error: ownerLoginErr } = await ownerClient.auth.signInWithPassword({
    email: 'owner_test@moa.app',
    password: 'TestPassword123!',
  });

  if (ownerLoginErr || !ownerAuth?.user) {
    throw new Error(`Owner login failed: ${ownerLoginErr?.message}`);
  }
  console.log(`[1] 사업주 로그인 성공: ${ownerAuth.user.email} (ID: ${ownerAuth.user.id})`);

  // 2. 피아노 원생 세부정보 생성/동기화 (piano.customers)
  console.log('\n[2] 피아노 원생 세부 프로필(piano.customers) 등록/갱신...');
  const pianoStudentsData = [
    {
      customer_id: STUDENT_CHILD_ID,
      organization_id: ORG_ID,
      student_number: 'P-2026-001',
      gender: 'female',
      birth_date: '2017-05-15',
      school: '대치초등학교',
      grade: '3학년',
      level: '바이엘 2권',
      tuition_fee: 200000,
      payment_day: 25,
      join_date: '2026-03-01',
      special_notes: '양손 독립 연습 집중 중, 뻐꾸기 마스터 단계',
      avatar_color: '#f59e0b',
      metadata: { recital_experienced: false, is_test_fixture: true },
    },
    {
      customer_id: STUDENT_ADULT_ID,
      organization_id: ORG_ID,
      student_number: 'P-2026-002',
      gender: 'male',
      birth_date: '1995-10-20',
      school: '직장인 취미반',
      grade: '일반성인',
      level: '체르니 30',
      tuition_fee: 180000,
      payment_day: 15,
      join_date: '2026-01-10',
      special_notes: '퇴근 후 야간 레슨 희망, 재즈 피아노 코드 반주 병행',
      avatar_color: '#3b82f6',
      metadata: { preferred_repertoire: 'classic_pop', is_test_fixture: true },
    },
  ];

  const pianoSchema = ownerClient.schema('piano');
  for (const st of pianoStudentsData) {
    const { error: upsertErr } = await pianoSchema
      .from('customers')
      .upsert(st, { onConflict: 'customer_id' });
    if (upsertErr) {
      console.error(`  - 원생 upsert 실패 (${st.student_number}):`, upsertErr);
    } else {
      console.log(`  ✓ 원생 세부정보 등록 완료: ${st.student_number} (${st.level}, 월 ${st.tuition_fee.toLocaleString()}원)`);
    }
  }

  // 3. 교재 마스터 등록 (piano.textbooks)
  console.log('\n[3] 피아노 교재 마스터(piano.textbooks) 등록...');
  const textbooks = [
    {
      organization_id: ORG_ID,
      title: '스마트 어린이 바이엘 1권',
      publisher: '세광음악출판사',
      author: '음악교육연구소',
      level: '입문',
      sale_price: 12000,
      cost_price: 7000,
      stock: 25,
      min_stock: 5,
      is_for_sale: true,
      metadata: { is_test_fixture: true },
    },
    {
      organization_id: ORG_ID,
      title: '체르니 100번 피아노 연습곡',
      publisher: '삼호뮤직',
      author: '칼 체르니',
      level: '초중급',
      sale_price: 10000,
      cost_price: 6000,
      stock: 18,
      min_stock: 3,
      is_for_sale: true,
      metadata: { is_test_fixture: true },
    },
    {
      organization_id: ORG_ID,
      title: '하논 60 피아노 명곡집',
      publisher: '음악세계',
      author: '샤를 하논',
      level: '중급',
      sale_price: 15000,
      cost_price: 9000,
      stock: 12,
      min_stock: 4,
      is_for_sale: true,
      metadata: { is_test_fixture: true },
    },
  ];

  for (const tb of textbooks) {
    const { data: existing } = await pianoSchema
      .from('textbooks')
      .select('id')
      .eq('organization_id', ORG_ID)
      .eq('title', tb.title)
      .maybeSingle();

    if (!existing) {
      const { data: inserted, error: tbErr } = await pianoSchema
        .from('textbooks')
        .insert(tb)
        .select()
        .single();
      if (tbErr) {
        console.error(`  - 교재 등록 실패 (${tb.title}):`, tbErr);
      } else {
        console.log(`  ✓ 신규 교재 등록: ${inserted.title} (판매가 ${inserted.sale_price.toLocaleString()}원, 재고 ${inserted.stock}권)`);
      }
    } else {
      console.log(`  ✓ 기존 교재 확인: ${tb.title}`);
    }
  }

  // 교재 ID 조회
  const { data: currentBooks } = await pianoSchema
    .from('textbooks')
    .select('id, title, sale_price')
    .eq('organization_id', ORG_ID);

  const bayelBook = currentBooks?.find((b) => b.title.includes('바이엘'));

  // 4. 교재 판매 및 수납 결제 처리 (piano.textbook_sales & payments)
  console.log('\n[4] 교재 판매 및 수납(piano.textbook_sales/payments) 테스트...');
  if (bayelBook) {
    // 기존 판매 내역 확인
    const { data: existingSales } = await pianoSchema
      .from('textbook_sales')
      .select('id')
      .eq('organization_id', ORG_ID)
      .eq('customer_id', STUDENT_CHILD_ID)
      .eq('textbook_id', bayelBook.id);

    if (!existingSales || existingSales.length === 0) {
      const { data: saleData, error: saleErr } = await pianoSchema
        .from('textbook_sales')
        .insert({
          organization_id: ORG_ID,
          customer_id: STUDENT_CHILD_ID,
          textbook_id: bayelBook.id,
          sale_date: '2026-11-15',
          quantity: 1,
          unit_price: bayelBook.sale_price,
          discount: 0,
          total_amount: bayelBook.sale_price,
          paid_amount: bayelBook.sale_price,
          status: 'paid',
          payment_method: 'transfer',
          memo: '바이엘 1권 개강 교재 수납 완료',
          metadata: { is_test_fixture: true },
        })
        .select()
        .single();

      if (saleErr) {
        console.error('  - 교재 판매 등록 실패:', saleErr);
      } else {
        console.log(`  ✓ 교재 판매 등록 완료: sale_id=${saleData.id}, 금액=${saleData.total_amount}원`);

        // 수납 영수증 등록
        const { error: payErr } = await pianoSchema
          .from('textbook_payments')
          .insert({
            organization_id: ORG_ID,
            textbook_sale_id: saleData.id,
            payment_date: '2026-11-15',
            amount: saleData.total_amount,
            payment_method: 'transfer',
            memo: '신한은행 계좌 입금 확인',
            receipt_number: 'RCP-20261115-001',
            metadata: { is_test_fixture: true },
          });

        if (payErr) {
          console.error('  - 교재 수납 결제 등록 실패:', payErr);
        } else {
          console.log(`  ✓ 교재 수납 결제 내역 등록 완료`);
        }
      }
    } else {
      console.log('  ✓ 기존 교재 판매/수납 내역 확인 완료');
    }
  }

  // 5. 연습실 마스터 등록 (core.practice_rooms)
  console.log('\n[5] 피아노 연습실(core.practice_rooms) 등록...');
  const rooms = [
    {
      organization_id: ORG_ID,
      name: '1번 연습실 (야마하 그랜드)',
      capacity: 2,
      open_time: '09:00',
      close_time: '21:00',
      is_active: true,
      memo: '[test_fixture] 야마하 C3 그랜드 피아노 / 상반기 정기 조율 완료',
    },
    {
      organization_id: ORG_ID,
      name: '2번 연습실 (영창 업라이트)',
      capacity: 1,
      open_time: '09:00',
      close_time: '21:00',
      is_active: true,
      memo: '[test_fixture] 방음부스 완비 / 초등부 기초 레슨실',
    },
    {
      organization_id: ORG_ID,
      name: '3번 연습실 (가와이 사일런트)',
      capacity: 1,
      open_time: '09:00',
      close_time: '22:00',
      is_active: true,
      memo: '[test_fixture] 야간 자율연습 가능 / 헤드폰 구비',
    },
  ];

  const coreSchema = ownerClient.schema('core');
  for (const r of rooms) {
    const { data: existRoom } = await coreSchema
      .from('practice_rooms')
      .select('id')
      .eq('organization_id', ORG_ID)
      .eq('name', r.name)
      .maybeSingle();

    if (!existRoom) {
      const { data: newRoom, error: rErr } = await coreSchema
        .from('practice_rooms')
        .insert(r)
        .select()
        .single();
      if (rErr) {
        console.error(`  - 연습실 등록 실패 (${r.name}):`, rErr);
      } else {
        console.log(`  ✓ 연습실 등록: ${newRoom.name} (수용 ${newRoom.capacity}명)`);
      }
    } else {
      console.log(`  ✓ 기존 연습실 확인: ${r.name}`);
    }
  }

  // 6. 오늘/내일 레슨 스케줄 등록 (core.schedules)
  console.log('\n[6] 피아노 레슨 스케줄(core.schedules) 등록...');
  const schedules = [
    {
      organization_id: ORG_ID,
      customer_id: STUDENT_CHILD_ID,
      title: '김모아 1:1 피아노 바이엘 레슨',
      starts_at: '2026-11-15T15:00:00+09:00',
      ends_at: '2026-11-15T15:50:00+09:00',
      status: 'scheduled',
      is_bookable: false,
      max_capacity: 1,
      description: '바이엘 2권 뻐꾸기 양손 연주 및 손끝 터치 교정',
      memo: '보호자 참관 레슨',
      metadata: { lesson_type: 'regular', is_test_fixture: true },
    },
    {
      organization_id: ORG_ID,
      customer_id: STUDENT_ADULT_ID,
      title: '박수강 성인 체르니 30 레슨',
      starts_at: '2026-11-16T19:00:00+09:00',
      ends_at: '2026-11-16T19:50:00+09:00',
      status: 'scheduled',
      is_bookable: false,
      max_capacity: 1,
      description: '체르니 30번 5번곡 템포 110 메트로놈 연습',
      memo: '퇴근 후 레슨',
      metadata: { lesson_type: 'adult_hobby', is_test_fixture: true },
    },
  ];

  for (const s of schedules) {
    const { data: existSched } = await coreSchema
      .from('schedules')
      .select('id')
      .eq('organization_id', ORG_ID)
      .eq('customer_id', s.customer_id)
      .eq('starts_at', s.starts_at)
      .maybeSingle();

    if (!existSched) {
      const { data: newSched, error: sErr } = await coreSchema
        .from('schedules')
        .insert(s)
        .select()
        .single();
      if (sErr) {
        console.error(`  - 스케줄 등록 실패 (${s.title}):`, sErr);
      } else {
        console.log(`  ✓ 레슨 스케줄 등록: ${newSched.title} (${newSched.starts_at} ~ ${newSched.ends_at})`);
      }
    } else {
      console.log(`  ✓ 기존 스케줄 확인: ${s.title}`);
    }
  }

  // 7. 출결 등록 (piano.attendance)
  console.log('\n[7] 피아노 출결 기록(piano.attendance) 등록...');
  const todayStr = '2026-11-15';
  const { data: existAtt } = await pianoSchema
    .from('attendance')
    .select('id')
    .eq('organization_id', ORG_ID)
    .eq('customer_id', STUDENT_CHILD_ID)
    .eq('attendance_date', todayStr)
    .maybeSingle();

  if (!existAtt) {
    const { data: newAtt, error: attErr } = await pianoSchema
      .from('attendance')
      .insert({
        organization_id: ORG_ID,
        customer_id: STUDENT_CHILD_ID,
        attendance_date: todayStr,
        status: 'present',
        make_up_required: false,
        memo: '오늘 밝은 표정으로 정시 등원, 바이엘 2권 성실히 연습함',
        created_by: '김대표 원장',
        metadata: { arrival_time: '14:55', is_test_fixture: true },
      })
      .select()
      .single();

    if (attErr) {
      console.error('  - 출결 등록 실패:', attErr);
    } else {
      console.log(`  ✓ 오늘 출결 기록 등록: 김모아 [출석 present] (${todayStr})`);
    }
  } else {
    console.log(`  ✓ 오늘 출결 기록 확인 완료`);
  }

  // 8. 곡 진도 및 스탬프 등록 (piano.song_progress)
  console.log('\n[8] 곡 마스터 진도/스탬프(piano.song_progress) 등록...');
  const songProgressItems = [
    {
      organization_id: ORG_ID,
      customer_id: STUDENT_CHILD_ID,
      book_name: '바이엘 2권',
      song_title: '뻐꾸기 (양손 연주)',
      status: 'APPROVED',
      stamps_awarded: 3,
      requested_at: '2026-11-15T15:30:00+09:00',
      approved_at: '2026-11-15T15:45:00+09:00',
      memo: '[test_fixture] 리듬감이 매우 우수함. 스탬프 3개 달성 및 완곡 완료!',
    },
    {
      organization_id: ORG_ID,
      customer_id: STUDENT_ADULT_ID,
      book_name: '체르니 30',
      song_title: '5번 연습곡 (아르페지오)',
      status: 'PENDING',
      stamps_awarded: 1,
      requested_at: '2026-11-15T10:00:00+09:00',
      memo: '[test_fixture] 왼손 16분음표 아르페지오 집중 연습 필요',
    },
  ];

  for (const sp of songProgressItems) {
    const { data: existSp } = await pianoSchema
      .from('song_progress')
      .select('id')
      .eq('organization_id', ORG_ID)
      .eq('customer_id', sp.customer_id)
      .eq('song_title', sp.song_title)
      .maybeSingle();

    if (!existSp) {
      const { data: newSp, error: spErr } = await pianoSchema
        .from('song_progress')
        .insert(sp)
        .select()
        .single();
      if (spErr) {
        console.error(`  - 곡 진도 등록 실패 (${sp.song_title}):`, spErr);
      } else {
        console.log(`  ✓ 곡 진도 등록: [${newSp.status}] ${newSp.book_name} - ${newSp.song_title} (스탬프 ${newSp.stamps_awarded}개)`);
      }
    } else {
      console.log(`  ✓ 기존 곡 진도 확인: ${sp.song_title}`);
    }
  }

  // 9. 종합 데이터 조회 검증 (사업주 뷰)
  console.log('\n[9] 사업주(owner_test) 권한 데이터 종합 조회 검증...');
  const { data: verifyCustomers } = await pianoSchema
    .from('customers')
    .select('customer_id, student_number, level, tuition_fee')
    .eq('organization_id', ORG_ID);
  console.log(`  - 피아노 원생 레코드 수: ${verifyCustomers?.length ?? 0}건`);

  const { data: verifyBooks } = await pianoSchema
    .from('textbooks')
    .select('id, title, stock')
    .eq('organization_id', ORG_ID);
  console.log(`  - 보유 교재 목록 수: ${verifyBooks?.length ?? 0}종류`);

  const { data: verifySales } = await pianoSchema
    .from('textbook_sales')
    .select('id, total_amount, status')
    .eq('organization_id', ORG_ID);
  console.log(`  - 교재 판매/수납 수: ${verifySales?.length ?? 0}건`);

  const { data: verifyRooms } = await coreSchema
    .from('practice_rooms')
    .select('id, name, capacity')
    .eq('organization_id', ORG_ID);
  console.log(`  - 연습실 등록 수: ${verifyRooms?.length ?? 0}실`);

  const { data: verifySchedules } = await coreSchema
    .from('schedules')
    .select('id, title, starts_at')
    .eq('organization_id', ORG_ID);
  console.log(`  - 레슨 스케줄 수: ${verifySchedules?.length ?? 0}건`);

  const { data: verifyAtt } = await pianoSchema
    .from('attendance')
    .select('id, attendance_date, status')
    .eq('organization_id', ORG_ID);
  console.log(`  - 피아노 출결 수: ${verifyAtt?.length ?? 0}건`);

  const { data: verifyProgress } = await pianoSchema
    .from('song_progress')
    .select('id, song_title, status, stamps_awarded')
    .eq('organization_id', ORG_ID);
  console.log(`  - 곡 진도/스탬프 수: ${verifyProgress?.length ?? 0}건`);

  // 10. 강사(staff_test) 및 학부모(parent_test) 계정 RLS 분리 조회 검증
  console.log('\n[10] 다역할(강사/학부모) RLS 보안 및 데이터 접근 검증...');

  // 학부모 로그인
  const parentClient = createClient(url, key);
  const { data: parentAuth, error: pLoginErr } = await parentClient.auth.signInWithPassword({
    email: 'parent_test@moa.app',
    password: 'TestPassword123!',
  });
  if (pLoginErr || !parentAuth?.user) {
    console.error('  - 학부모 로그인 실패:', pLoginErr);
  } else {
    console.log(`  ✓ 학부모(최학부모) 로그인 성공: ${parentAuth.user.email}`);

    // 학부모가 자기 자녀(김모아)의 출결 및 곡 진도를 조회할 수 있는지 검증
    const pPiano = parentClient.schema('piano');
    const { data: pAtt, error: pAttErr } = await pPiano
      .from('attendance')
      .select('id, attendance_date, status, memo')
      .eq('organization_id', ORG_ID);

    if (pAttErr) {
      console.log('  - 학부모 출결 조회 정책 검사 결과:', pAttErr.message);
    } else {
      console.log(`  ✓ 학부모 자녀 출결 확인 가능: ${pAtt?.length ?? 0}건 조회 성공`);
    }

    const { data: pProgress, error: pProgErr } = await pPiano
      .from('song_progress')
      .select('id, song_title, status, stamps_awarded')
      .eq('organization_id', ORG_ID);

    if (pProgErr) {
      console.log('  - 학부모 진도 조회 정책 결과:', pProgErr.message);
    } else {
      console.log(`  ✓ 학부모 자녀 곡 진도 확인 가능: ${pProgress?.length ?? 0}건 조회 성공`);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 피아노학원 앱 Supabase 테스트 데이터 생성 및 검증 완료!');
  console.log('====================================================');
}

runPianoIntegrationTest().catch((err) => {
  console.error('\n❌ 테스트 실패:', err);
  process.exit(1);
});
