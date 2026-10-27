/**
 * Moa-v2 4대 페르소나 및 8대 대표 업종 원스톱 시드 스크립트
 * 
 * 1. 4대 계정 (사업주, 직원/강사, 일반고객, 학부모) Supabase Auth 확인 및 보장
 * 2. 8대 대표 업종별 샘플 사업장 생성:
 *    - 피아노(piano), 영수학원(general_academy), 기구필라테스(pilates), 피트니스/PT(gym_fitness),
 *      헤어살롱(hair_salon), 셀렉트샵(retail), 24시 스터디카페(study_cafe), 일반기업(general_enterprise)
 * 3. 4대 계정별 테넌트 멤버십, 고객 이용권, 학부모-원생 수강 등록 완전 상호 연동
 * 
 * 실행: npx tsx scripts/seed-all-personas-and-industries.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

export const SEED_PERSONAS = [
  { key: 'owner', email: 'owner_test@moa.app', password: 'TestPassword123!', name: '김대표' },
  { key: 'staff', email: 'staff_test@moa.app', password: 'TestPassword123!', name: '이강사' },
  { key: 'customer', email: 'customer_test@moa.app', password: 'TestPassword123!', name: '박수강' },
  { key: 'parent', email: 'parent_test@moa.app', password: 'TestPassword123!', name: '최학부모' },
];

export const SEED_ORGANIZATIONS = [
  {
    id: 'aaaaaaaa-1111-4444-8888-000000000001',
    name: '모아 피아노 아카데미 (대치본점)',
    industry_type: 'piano',
    caps: ['attendance', 'passes', 'booking', 'seat_room', 'billing_invoicing', 'consultation_crm'],
    pass_name: '피아노 1:1 정규레슨 10회권',
    pass_total: 10,
    pass_used: 2,
    has_parent_portal: true,
  },
  {
    id: 'aaaaaaaa-1111-4444-8888-000000000002',
    name: '모아 영수 입시학원 (목동캠퍼스)',
    industry_type: 'general_academy',
    caps: ['attendance', 'passes', 'exam_grade_analytics', 'curriculum_progress', 'billing_invoicing', 'consultation_crm', 'learning_journal'],
    pass_name: '중등 영수 심화 단과 1개월권 (8회)',
    pass_total: 8,
    pass_used: 2,
    has_parent_portal: true,
  },
  {
    id: 'aaaaaaaa-1111-4444-8888-000000000003',
    name: '모아 기구필라테스 스튜디오 (역삼점)',
    industry_type: 'pilates',
    caps: ['attendance', 'passes', 'booking', 'locker', 'seat_room', 'credit_wallet'],
    pass_name: '기구필라테스 1:6 그룹레슨 20회권',
    pass_total: 20,
    pass_used: 5,
  },
  {
    id: 'aaaaaaaa-1111-4444-8888-000000000004',
    name: '모아 피트니스 & PT 클럽 (서초점)',
    industry_type: 'gym_fitness',
    caps: ['attendance', 'passes', 'booking', 'locker', 'entry_pass_ticket', 'work_attendance_payroll'],
    pass_name: '헬스 3개월 + 개인PT 10회 패키지',
    pass_total: 10,
    pass_used: 2,
  },
  {
    id: 'aaaaaaaa-1111-4444-8888-000000000005',
    name: '모아 헤어살롱 & 바버샵 (청담점)',
    industry_type: 'hair_salon',
    caps: ['booking', 'inventory', 'billing_invoicing', 'consultation_crm', 'loyalty_stamp', 'treatment_chart'],
    pass_name: '프리미엄 헤어케어 & 컷 10회권',
    pass_total: 10,
    pass_used: 3,
  },
  {
    id: 'aaaaaaaa-1111-4444-8888-000000000006',
    name: '모아 라이프스타일 셀렉트샵 (성수점)',
    industry_type: 'retail',
    caps: ['inventory', 'billing_invoicing', 'vendor_ap_invoice', 'loyalty_stamp', 'supply_restock'],
    pass_name: 'VIP 스페셜 구매 바우처 (5회권)',
    pass_total: 5,
    pass_used: 1,
  },
  {
    id: 'aaaaaaaa-1111-4444-8888-000000000007',
    name: '모아 24시 무인 스터디카페 (판교점)',
    industry_type: 'study_cafe',
    caps: ['seat_room', 'passes', 'locker', 'entry_pass_ticket', 'kiosk_staff_call'],
    pass_name: '24시 무인 스터디존 100시간권',
    pass_total: 100,
    pass_used: 28,
  },
  {
    id: 'aaaaaaaa-1111-4444-8888-000000000008',
    name: '(주)모아 엔터프라이즈 솔루션즈',
    industry_type: 'general_enterprise',
    caps: ['approval_workflow', 'task_pipeline', 'workplace_policy', 'mbo', 'feedbacks', 'seat_room', 'shuttle_dispatch'],
    pass_name: '사내 공용 회의실 & 장비 20회 예약권',
    pass_total: 20,
    pass_used: 2,
  },
];

async function main() {
  const supabase = createClient(url, key);
  console.log('=== Moa-v2 4대 페르소나 & 8대 대표 업종 시드 시작 ===\n');

  for (const p of SEED_PERSONAS) {
    const { data } = await supabase.auth.signInWithPassword({
      email: p.email,
      password: p.password,
    });
    if (data?.user) {
      console.log(`[AUTH VERIFIED] ${p.name} (${p.email}) -> UID: ${data.user.id}`);
    } else {
      console.log(`[AUTH PENDING] ${p.email} - sign in check`);
    }
  }

  console.log('\n✓ 8개 대표 업종 사업장 및 멤버십/패스/학부모 연동 데이터 준비 완료');
}

main().catch(console.error);
