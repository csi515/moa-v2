/**
 * 공식 Supabase CLI로 schema → TypeScript 를 생성한다.
 * 출력은 database.generated.ts 만. database.aliases.ts / 앱 헬퍼는 덮어쓰지 않는다.
 *
 * 실행: npm run supabase:types
 * 사전: supabase start (로컬) 또는 링크된 프로젝트
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outFile = join(root, 'src/lib/supabase/database.generated.ts');
const schemas = 'core,piano,bath,platform';

const result = spawnSync(
  'npx',
  ['supabase', 'gen', 'types', 'typescript', '--local', '--schema', schemas],
  { cwd: root, encoding: 'utf8', shell: true }
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'supabase gen types 실패');
  console.error(
    '로컬 DB가 없으면 `supabase start` 후 다시 실행하세요. 생성 결과는 database.generated.ts 입니다.'
  );
  process.exit(result.status ?? 1);
}

const { writeFileSync } = await import('node:fs');
writeFileSync(outFile, result.stdout, 'utf8');
console.log(`wrote ${outFile}`);
console.log('다음: npm run check:db-types 로 migration / types 정합을 확인하세요.');
console.log('앱 import는 계속 src/lib/supabase/database.types.ts 입니다. 생성본과 맞춘 뒤 반영하세요.');
