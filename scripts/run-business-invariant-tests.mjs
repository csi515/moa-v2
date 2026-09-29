/**
 * test:business-invariants catalog runner.
 *
 *   npm run test:business-invariants
 *   npm run test:business-invariants -- --list
 *   npm run test:business-invariants -- --group finance
 *   npm run test:business-invariants -- --kind contract
 *   npm run test:business-invariants -- --ci always
 */
import { spawnSync } from 'node:child_process';
import {
  BUSINESS_INVARIANT_CIS,
  BUSINESS_INVARIANT_GROUPS,
  BUSINESS_INVARIANT_KINDS,
  collectCatalogIntegrityErrors,
  printBusinessInvariantCatalog,
  selectBusinessInvariantTests,
} from './businessInvariantTests.mjs';

function parseArgs(argv) {
  const args = { list: false, group: '', kind: '', ci: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--list') args.list = true;
    if (token === '--group') args.group = String(argv[i + 1] || '');
    if (token === '--kind') args.kind = String(argv[i + 1] || '');
    if (token === '--ci') args.ci = String(argv[i + 1] || '');
  }
  // Windows npm.cmd는 `-- --list`를 스크립트에 넘기지 않고 npm_config_*로 삼킨다.
  if (process.env.npm_config_list === 'true' || process.env.npm_config_list === '') {
    args.list = true;
  }
  if (!args.group && process.env.npm_config_group) args.group = process.env.npm_config_group;
  if (!args.kind && process.env.npm_config_kind) args.kind = process.env.npm_config_kind;
  // CI=true 환경의 npm_config_ci=true는 무시. always|suite|manual만 허용.
  if (!args.ci && BUSINESS_INVARIANT_CIS.includes(process.env.npm_config_ci || '')) {
    args.ci = process.env.npm_config_ci;
  }

  for (const token of argv) {
    if (token.startsWith('--')) continue;
    if (token === 'list') args.list = true;
    else if (!args.group && BUSINESS_INVARIANT_GROUPS.includes(token)) args.group = token;
    else if (!args.kind && BUSINESS_INVARIANT_KINDS.includes(token)) args.kind = token;
    else if (!args.ci && BUSINESS_INVARIANT_CIS.includes(token)) args.ci = token;
  }
  return args;
}

function failIntegrity(errors) {
  console.error('business-invariants catalog validation failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

function runScript(script) {
  const result = spawnSync('npm', ['run', script], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  const status = typeof result.status === 'number' ? result.status : 1;
  return { ok: status === 0, status };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const errors = collectCatalogIntegrityErrors();
  if (errors.length > 0) failIntegrity(errors);

  if (args.group && !BUSINESS_INVARIANT_GROUPS.includes(args.group)) {
    console.error(`unknown group: ${args.group}`);
    process.exit(1);
  }
  if (args.kind && !BUSINESS_INVARIANT_KINDS.includes(args.kind)) {
    console.error(`unknown kind: ${args.kind}`);
    process.exit(1);
  }
  if (args.ci && !BUSINESS_INVARIANT_CIS.includes(args.ci)) {
    console.error(`unknown ci: ${args.ci}`);
    process.exit(1);
  }

  const rows = selectBusinessInvariantTests({
    group: args.group,
    kind: args.kind,
    ci: args.ci,
  });

  if (args.list) {
    if (!args.group && !args.kind && !args.ci) {
      printBusinessInvariantCatalog();
      process.exit(0);
    }
    console.log(`Business invariant catalog (${rows.length} selected)\n`);
    let current = '';
    for (const row of rows) {
      if (row.group !== current) {
        current = row.group;
        console.log(`[${row.group}]`);
      }
      console.log(
        `  ${String(row.order).padStart(2, ' ')} ${row.script.padEnd(38)} ${row.kind.padEnd(10)} ci=${row.ci}`
      );
    }
    process.exit(0);
  }

  if (rows.length === 0) {
    console.error('no business-invariant tests matched');
    process.exit(1);
  }

  let current = '';
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.group !== current) {
      current = row.group;
      console.log(`\n== ${row.group} ==`);
    }
    console.log(`[${i + 1}/${rows.length}] ${row.group} / ${row.kind} / ${row.script}`);
    const result = runScript(row.script);
    if (!result.ok) {
      console.error('\nbusiness-invariants failed');
      console.error(`  script: ${row.script}`);
      console.error(`  group:  ${row.group}`);
      console.error(`  kind:   ${row.kind}`);
      console.error(`  exit:   ${result.status}`);
      process.exit(result.status || 1);
    }
  }
}

main();
