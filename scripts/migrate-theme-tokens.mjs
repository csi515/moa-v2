/**
 * Moa-v2 디자인 토큰 정규화 유틸리티 (MIGRATE-THEME-TOKENS)
 *
 * 템플릿 기본값(indigo-*) 및 구 레거시 테마(purple-*)를
 * Moa-v2 B2B 표준 테마(slate-*, blue-*)로 안전하게 마이그레이션합니다.
 *
 * 사용법:
 *   node scripts/migrate-theme-tokens.mjs --dry-run
 *   node scripts/migrate-theme-tokens.mjs --target=src/capabilities/roster
 *   node scripts/migrate-theme-tokens.mjs --target=src/capabilities/billing
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcDir = join(root, 'src');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const targetArg = args.find((a) => a.startsWith('--target='));
const targetPath = targetArg ? targetArg.split('=')[1] : null;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', '.gemini'].includes(entry.name)) continue;
      walk(full, out);
    } else if (/\.(tsx|jsx)$/.test(entry.name) && !/\.test\.(tsx|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const TOKEN_REPLACEMENTS = [
  // 1. Primary actions (indigo-600 / purple-600 -> slate-900)
  { from: /\bbg-indigo-600\b/g, to: 'bg-slate-900' },
  { from: /\bbg-purple-600\b/g, to: 'bg-slate-900' },
  { from: /\bhover:bg-indigo-700\b/g, to: 'hover:bg-slate-800' },
  { from: /\bhover:bg-purple-700\b/g, to: 'hover:bg-slate-800' },
  { from: /\bactive:bg-indigo-800\b/g, to: 'active:bg-slate-950' },
  { from: /\bactive:bg-purple-800\b/g, to: 'active:bg-slate-950' },

  // 2. Light tints (indigo-50 / purple-50 -> slate-50 or slate-100)
  { from: /\bbg-indigo-50\/70\b/g, to: 'bg-slate-50' },
  { from: /\bbg-purple-50\/70\b/g, to: 'bg-slate-50' },
  { from: /\bbg-indigo-50\b/g, to: 'bg-slate-50' },
  { from: /\bbg-purple-50\b/g, to: 'bg-slate-50' },
  { from: /\bbg-indigo-100\b/g, to: 'bg-slate-100' },
  { from: /\bbg-purple-100\b/g, to: 'bg-slate-100' },

  // 3. Borders (indigo-200 / purple-200 -> slate-200)
  { from: /\bborder-indigo-200\b/g, to: 'border-slate-200' },
  { from: /\bborder-purple-200\b/g, to: 'border-slate-200' },
  { from: /\bborder-indigo-100\b/g, to: 'border-slate-200' },
  { from: /\bborder-purple-100\b/g, to: 'border-slate-200' },

  // 4. Texts (indigo-900 / purple-900 -> slate-900, indigo-600 -> slate-800 or blue-600)
  { from: /\btext-indigo-900\b/g, to: 'text-slate-900' },
  { from: /\btext-purple-900\b/g, to: 'text-slate-900' },
  { from: /\btext-indigo-700\b/g, to: 'text-slate-700' },
  { from: /\btext-purple-700\b/g, to: 'text-slate-700' },
  { from: /\btext-indigo-600\b/g, to: 'text-slate-800' },
  { from: /\btext-purple-600\b/g, to: 'text-slate-800' },

  // 5. Focus rings
  { from: /\bfocus:ring-indigo-500\b/g, to: 'focus:ring-slate-900' },
  { from: /\bfocus:ring-purple-500\b/g, to: 'focus:ring-slate-900' },
  { from: /\bfocus:border-indigo-500\b/g, to: 'focus:border-slate-900' },
  { from: /\bfocus:border-purple-500\b/g, to: 'focus:border-slate-900' },
];

function run() {
  const startDir = targetPath ? join(root, targetPath) : srcDir;
  const files = walk(startDir);
  console.log(`[MIGRATE-THEME-TOKENS] 대상 파일 ${files.length}개 스캔 중...`);

  let modifiedFilesCount = 0;
  let totalReplacedCount = 0;

  for (const file of files) {
    const rel = relative(root, file).replace(/\\/g, '/');
    if (rel.startsWith('src/shared/components/ui/')) continue;

    let content = readFileSync(file, 'utf8');
    let fileChanged = false;
    let fileReplacements = 0;

    for (const rule of TOKEN_REPLACEMENTS) {
      const matches = content.match(rule.from);
      if (matches) {
        fileReplacements += matches.length;
        if (!isDryRun && targetPath) {
          content = content.replace(rule.from, rule.to);
          fileChanged = true;
        }
      }
    }

    if (fileReplacements > 0) {
      modifiedFilesCount++;
      totalReplacedCount += fileReplacements;
      console.log(`  - [${fileReplacements}건] ${rel}`);
      if (fileChanged) {
        writeFileSync(file, content, 'utf8');
      }
    }
  }

  console.log('\n=== 요약 결과 ===');
  console.log(`- 감지된 파일: ${modifiedFilesCount}개`);
  console.log(`- 치환 대상 토큰 수: ${totalReplacedCount}건`);
  if (isDryRun || !targetPath) {
    console.log(`\n실제 치환을 적용하려면 대상 경로를 지정하세요:\n  node scripts/migrate-theme-tokens.mjs --target=<경로>`);
  } else {
    console.log(`\n✓ 지정된 대상 경로(${targetPath})에 마이그레이션이 성공적으로 적용되었습니다.`);
  }
}

run();
