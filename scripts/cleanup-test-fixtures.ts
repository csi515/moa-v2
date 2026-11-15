/**
 * Moa-v2 통합 테스트 픽스처 데이터 안전 정리 및 롤백 유틸리티
 * 
 * 사용법:
 *   npx tsx scripts/cleanup-test-fixtures.ts --dry-run
 *   npx tsx scripts/cleanup-test-fixtures.ts --execute
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

const isExecute = process.argv.includes('--execute');

async function cleanupFixtures() {
  console.log('====================================================');
  console.log(`🧹 Moa-v2 테스트 픽스처 정리 유틸리티 [${isExecute ? '실행(EXECUTE)' : '조회(DRY RUN)'}]`);
  console.log('====================================================\n');

  const supabase = createClient(url, key);

  // 1. 사업주 로그인
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'owner_test@moa.app',
    password: 'TestPassword123!',
  });

  if (authErr || !auth?.user) {
    throw new Error(`Login failed: ${authErr?.message}`);
  }
  console.log(`[AUTH] 김대표(owner_test@moa.app) 로그인 성공 (UID: ${auth.user.id})\n`);

  const core = supabase.schema('core');
  const piano = supabase.schema('piano');

  const targets = [
    {
      name: '피아노 연습실 (core.practice_rooms)',
      fetch: () => core.from('practice_rooms').select('id, name, memo').ilike('memo', '%[test_fixture]%'),
      delete: (ids: string[]) => core.from('practice_rooms').delete().in('id', ids),
    },
    {
      name: '피아노 진도 스탬프 (piano.song_progress)',
      fetch: () => piano.from('song_progress').select('id, song_title, memo').ilike('memo', '%[test_fixture]%'),
      delete: (ids: string[]) => piano.from('song_progress').delete().in('id', ids),
    },
    {
      name: '피아노 출결 기록 (piano.attendance)',
      fetch: () => piano.from('attendance').select('id, attendance_date, metadata').eq('metadata->>is_test_fixture', 'true'),
      delete: (ids: string[]) => piano.from('attendance').delete().in('id', ids),
    },
    {
      name: '피아노 교재 수납 내역 (piano.textbook_payments)',
      fetch: () => piano.from('textbook_payments').select('id, metadata').eq('metadata->>is_test_fixture', 'true'),
      delete: (ids: string[]) => piano.from('textbook_payments').delete().in('id', ids),
    },
    {
      name: '피아노 교재 판매 내역 (piano.textbook_sales)',
      fetch: () => piano.from('textbook_sales').select('id, metadata').eq('metadata->>is_test_fixture', 'true'),
      delete: (ids: string[]) => piano.from('textbook_sales').delete().in('id', ids),
    },
    {
      name: '피아노 교재 마스터 (piano.textbooks)',
      fetch: () => piano.from('textbooks').select('id, title, metadata').eq('metadata->>is_test_fixture', 'true'),
      delete: (ids: string[]) => piano.from('textbooks').delete().in('id', ids),
    },
    {
      name: '다업종 테스트 고객 (core.customers)',
      fetch: () => core.from('customers').select('id, name, metadata').eq('metadata->>is_test_fixture', 'true'),
      delete: (ids: string[]) => core.from('customers').delete().in('id', ids),
    },
    {
      name: '다업종 테스트 스태프 (core.staff)',
      fetch: () => core.from('staff').select('id, name, metadata').eq('metadata->>is_test_fixture', 'true'),
      delete: (ids: string[]) => core.from('staff').delete().in('id', ids),
    },
  ];

  let totalFound = 0;
  let totalDeleted = 0;

  for (const target of targets) {
    try {
      const { data, error } = await target.fetch();
      if (error) {
        console.warn(`  [!] ${target.name} 조회 에러: ${error.message}`);
        continue;
      }

      const count = data?.length || 0;
      totalFound += count;
      console.log(`- ${target.name}: ${count}개 발견`);

      if (count > 0 && isExecute) {
        const ids = data!.map((item: any) => item.id);
        const { error: delErr } = await target.delete(ids);
        if (delErr) {
          console.error(`    ↳ 삭제 실패: ${delErr.message}`);
        } else {
          console.log(`    ↳ ✅ ${count}개 롤백 완료`);
          totalDeleted += count;
        }
      }
    } catch (err: any) {
      console.warn(`  [!] ${target.name} 처리 중 예외: ${err.message}`);
    }
  }

  console.log('\n====================================================');
  if (isExecute) {
    console.log(`🎉 정리 완료: 총 ${totalFound}개 중 ${totalDeleted}개 레코드 정상 삭제/롤백`);
  } else {
    console.log(`ℹ️ DRY RUN 완료: 총 ${totalFound}개의 테스트 픽스처가 감지되었습니다.`);
    console.log(`   실제 삭제를 원하시면 --execute 옵션을 붙여 실행하세요:`);
    console.log(`   npx tsx scripts/cleanup-test-fixtures.ts --execute`);
  }
  console.log('====================================================\n');
}

cleanupFixtures().catch((e) => {
  console.error('Fatal cleanup error:', e);
  process.exit(1);
});
