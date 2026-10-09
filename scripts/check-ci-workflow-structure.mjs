/**
 * CI/CD 구조 회귀 검사. 새 YAML 패키지 없음.
 *
 *   npm run check:ci-structure
 *   npm run check:ci-structure -- --self-test
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUSINESS_INVARIANT_TESTS, INVENTORY_OUT_OF_SCOPE } from './businessInvariantTests.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const workflowsDir = join(root, '.github', 'workflows');

export const ALLOWED_WORKFLOW_FILES = ['ci-cd.yml'];
const REQUIRED_JOBS = ['quality', 'build-e2e', 'security-db', 'deploy'];
const BI_SUITE = 'test:business-invariants';

function loadPackageScripts() {
  return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts ?? {};
}

function commerceUnitChildren(scripts) {
  const raw = String(scripts['test:commerce-unit'] || '');
  return [...raw.matchAll(/npm run ([^\s&]+)/g)].map((match) => match[1]);
}

function biCoveredScripts(scripts = loadPackageScripts()) {
  const catalog = new Set(BUSINESS_INVARIANT_TESTS.map((row) => row.script));
  const financeChildren = Object.entries(INVENTORY_OUT_OF_SCOPE)
    .filter(([, note]) => note.includes('test:finance 자식'))
    .map(([script]) => script);
  const covered = new Set([...catalog, ...financeChildren, 'test:commerce-unit']);
  for (const child of commerceUnitChildren(scripts)) {
    if (catalog.has(child)) covered.add(child);
  }
  return covered;
}

function stripInlineComment(content) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble && (i === 0 || content[i - 1] === ' ')) {
      return content.slice(0, i).trimEnd();
    }
  }
  return content;
}

function parseInlineArray(raw) {
  const inner = raw.slice(1, -1).trim();
  if (!inner) return [];
  return inner.split(',').map((part) => part.trim()).filter(Boolean);
}

function parseScalar(raw) {
  if (raw === '>' || raw === '|') return { fold: raw };
  if (raw.startsWith('[') && raw.endsWith(']')) return parseInlineArray(raw);
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    return raw.slice(1, -1);
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === '' || raw === null) return null;
  return raw;
}

/** GitHub Actions YAML subset (map / list / folded scalar). */
export function parseGithubActionsYaml(text) {
  const root = {};
  const stack = [{ indent: -1, container: root, type: 'map' }];
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  let pendingFold = null;

  const finishFold = () => {
    if (!pendingFold) return;
    const joined =
      pendingFold.fold === '>'
        ? pendingFold.chunks.map((c) => c.trim()).filter(Boolean).join(' ')
        : pendingFold.chunks.join('\n');
    pendingFold.assign(joined);
    pendingFold = null;
  };

  const pushFrame = (indent, container, type) => {
    stack.push({ indent, container, type });
  };

  for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
    const line = lines[lineNo];
    if (pendingFold) {
      if (line.trim() === '') {
        pendingFold.chunks.push('');
        continue;
      }
      const foldIndent = line.match(/^ */)[0].length;
      if (foldIndent > pendingFold.baseIndent) {
        if (pendingFold.contentIndent == null) pendingFold.contentIndent = foldIndent;
        pendingFold.chunks.push(line.slice(pendingFold.contentIndent));
        continue;
      }
      finishFold();
    }

    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    const indent = line.match(/^ */)[0].length;
    const content = stripInlineComment(line.slice(indent));
    if (!content) continue;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const top = stack[stack.length - 1];

    if (content.startsWith('- ')) {
      const rest = content.slice(2);
      if (top.type !== 'list') {
        throw new Error(`yaml list item outside list (line ${lineNo + 1})`);
      }
      const colon = rest.indexOf(':');
      if (colon === -1) {
        top.container.push(parseScalar(rest.trim()));
        continue;
      }
      const key = rest.slice(0, colon).trim();
      const after = rest.slice(colon + 1).trim();
      const item = {};
      top.container.push(item);
      const parsed = parseScalar(after);
      if (parsed && typeof parsed === 'object' && parsed.fold) {
        pendingFold = {
          fold: parsed.fold,
          baseIndent: indent,
          contentIndent: null,
          chunks: [],
          assign: (value) => {
            item[key] = value;
          },
        };
        pushFrame(indent, item, 'map');
        continue;
      }
      if (after === '') item[key] = null;
      else item[key] = parsed;
      pushFrame(indent, item, 'map');
      continue;
    }

    const colon = content.indexOf(':');
    if (colon === -1) throw new Error(`yaml expected key (line ${lineNo + 1})`);
    const key = content.slice(0, colon).trim();
    const after = content.slice(colon + 1).trim();
    if (top.type !== 'map') throw new Error(`yaml map key in list (line ${lineNo + 1}): ${key}`);

    const parsed = parseScalar(after);
    if (parsed && typeof parsed === 'object' && parsed.fold) {
      pendingFold = {
        fold: parsed.fold,
        baseIndent: indent,
        contentIndent: null,
        chunks: [],
        assign: (value) => {
          top.container[key] = value;
        },
      };
      continue;
    }
    if (after === '') {
      const next = lines.slice(lineNo + 1).find((candidate) => candidate.trim() && !/^\s*#/.test(candidate));
      const nextIndent = next ? next.match(/^ */)[0].length : -1;
      const nextIsList = next ? next.trimStart().startsWith('- ') : false;
      if (next && nextIndent > indent && nextIsList) {
        const list = [];
        top.container[key] = list;
        pushFrame(indent, list, 'list');
      } else {
        const child = {};
        top.container[key] = child;
        pushFrame(indent, child, 'map');
      }
      continue;
    }
    top.container[key] = parsed;
  }
  finishFold();
  return root;
}

function asList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function jobNeeds(job) {
  return asList(job?.needs).map(String);
}

function walkSteps(job) {
  return Array.isArray(job?.steps) ? job.steps : [];
}

function npmScriptsInText(text) {
  if (typeof text !== 'string') return [];
  return [...text.matchAll(/npm run ([^\s&]+)/g)].map((match) => match[1]);
}

function hasCommand(steps, pattern) {
  return steps.some((step) => typeof step.run === 'string' && pattern.test(step.run));
}

function collectContinueOnError(job, jobId) {
  const hits = [];
  if (job && job['continue-on-error'] === true) hits.push(`job ${jobId} continue-on-error`);
  for (const step of walkSteps(job)) {
    if (step['continue-on-error'] === true) {
      hits.push(`job ${jobId} step "${step.name || '?'}" continue-on-error`);
    }
  }
  return hits;
}

function eventBranches(on, eventName) {
  const ev = on?.[eventName];
  if (ev == null) return [];
  if (typeof ev === 'string') return [ev];
  return asList(ev.branches);
}

function flattenRunScripts(jobs) {
  /** @type {Array<{ file: string, job: string, script: string }>} */
  const rows = [];
  for (const [file, doc] of Object.entries(jobs)) {
    for (const [jobId, job] of Object.entries(doc.jobs || {})) {
      for (const step of walkSteps(job)) {
        for (const script of npmScriptsInText(step.run)) {
          rows.push({ file, job: jobId, script });
        }
      }
    }
  }
  return rows;
}

export function loadRepoWorkflows(dir = workflowsDir) {
  const files = readdirSync(dir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
  /** @type {Record<string, object>} */
  const workflows = {};
  for (const name of files.sort()) {
    workflows[name] = parseGithubActionsYaml(readFileSync(join(dir, name), 'utf8'));
  }
  return workflows;
}

export function collectCiStructureErrors(workflows = loadRepoWorkflows()) {
  const errors = [];
  const names = Object.keys(workflows).sort();
  for (const name of names) {
    if (!ALLOWED_WORKFLOW_FILES.includes(name)) {
      errors.push(`unexpected workflow file: ${name} (allowed: ${ALLOWED_WORKFLOW_FILES.join(', ')})`);
    }
  }
  for (const allowed of ALLOWED_WORKFLOW_FILES) {
    if (!workflows[allowed]) errors.push(`missing required workflow: ${allowed}`);
  }

  const cicd = workflows['ci-cd.yml'];
  if (!cicd) return errors;

  const on = cicd.on || {};
  if (!eventBranches(on, 'push').includes('main')) {
    errors.push('ci-cd.yml push must include main');
  }
  if (!eventBranches(on, 'pull_request').includes('main')) {
    errors.push('ci-cd.yml pull_request must include main');
  }

  for (const [name, doc] of Object.entries(workflows)) {
    if (name === 'ci-cd.yml') continue;
    const extraOn = doc.on || {};
    if (eventBranches(extraOn, 'push').includes('main') || eventBranches(extraOn, 'pull_request').includes('main')) {
      errors.push(`${name} must not share main push/PR trigger with ci-cd.yml`);
    }
  }

  const jobs = cicd.jobs || {};
  for (const id of REQUIRED_JOBS) {
    if (!jobs[id]) errors.push(`ci-cd.yml missing job: ${id}`);
  }

  const quality = jobs.quality;
  const buildE2e = jobs['build-e2e'];
  const securityDb = jobs['security-db'];
  const deploy = jobs.deploy;

  if (quality && jobNeeds(quality).length > 0) {
    errors.push('quality job must not depend on other jobs');
  }
  if (buildE2e && !jobNeeds(buildE2e).includes('quality')) {
    errors.push('build-e2e must need quality');
  }
  if (securityDb && !jobNeeds(securityDb).includes('quality')) {
    errors.push('security-db must need quality');
  }
  if (deploy) {
    const needs = jobNeeds(deploy);
    for (const id of REQUIRED_JOBS.filter((jobId) => jobId !== 'deploy')) {
      if (!needs.includes(id)) errors.push(`deploy must need ${id}`);
    }
    const deployIf = String(deploy.if || '');
    if (!deployIf.includes('ENABLE_CLOUDFLARE_DEPLOY') && !deployIf.includes('ENABLE_VERCEL_DEPLOY')) {
      errors.push('deploy if must keep ENABLE_CLOUDFLARE_DEPLOY');
    }
    if (!deployIf.includes('ENABLE_SECURITY_AUDIT')) {
      errors.push('deploy if must keep ENABLE_SECURITY_AUDIT');
    }
    if (!deployIf.includes("github.event_name == 'push'") || !deployIf.includes('refs/heads/main')) {
      errors.push('deploy if must stay main push only');
    }
  }

  if (securityDb) {
    const gateIf = String(securityDb.if || '');
    if (!gateIf.includes('ENABLE_SECURITY_AUDIT')) {
      errors.push('security-db if must keep ENABLE_SECURITY_AUDIT');
    }
    const steps = walkSteps(securityDb);
    const mainFail = steps.find((step) => {
      const cond = String(step.if || '');
      const run = String(step.run || '');
      return (
        cond.includes('has_secrets') &&
        cond.includes("github.event_name == 'push'") &&
        cond.includes('refs/heads/main') &&
        /exit 1\b/.test(run)
      );
    });
    if (!mainFail) {
      errors.push('security-db must fail on main when DB audit secrets are missing');
    }
    const liveAudits = ['test:rls-audit', 'test:booking-pass-atomic-db', 'test:rls-membership-escalation', 'test:auth-hijack-audit'];
    for (const script of liveAudits) {
      if (!hasCommand(steps, new RegExp(`npm run ${script}\\b`))) {
        errors.push(`security-db missing ${script}`);
      }
    }
  }

  for (const [jobId, job] of Object.entries(jobs)) {
    errors.push(...collectContinueOnError(job, jobId));
  }

  const allDocs = Object.fromEntries(
    Object.entries(workflows).map(([file, doc]) => [file, { jobs: doc.jobs || {} }])
  );
  const runs = flattenRunScripts(allDocs);

  const lintJobs = [...new Set(runs.filter((row) => row.script === 'lint').map((row) => `${row.file}:${row.job}`))];
  if (lintJobs.length !== 1 || lintJobs[0] !== 'ci-cd.yml:quality') {
    errors.push(`npm run lint must run only in ci-cd.yml quality (found: ${lintJobs.join(', ') || 'none'})`);
  }

  const biJobs = [...new Set(runs.filter((row) => row.script === BI_SUITE).map((row) => `${row.file}:${row.job}`))];
  if (biJobs.length !== 1 || biJobs[0] !== 'ci-cd.yml:quality') {
    errors.push(`${BI_SUITE} must run only in ci-cd.yml quality (found: ${biJobs.join(', ') || 'none'})`);
  }

  const buildJobs = [...new Set(runs.filter((row) => row.script === 'build').map((row) => `${row.file}:${row.job}`))];
  if (buildJobs.length !== 1 || buildJobs[0] !== 'ci-cd.yml:build-e2e') {
    errors.push(`npm run build must run only in build-e2e (found: ${buildJobs.join(', ') || 'none'})`);
  }

  if (quality) {
    const qSteps = walkSteps(quality);
    if (!hasCommand(qSteps, /npm run lint\b/)) errors.push('quality must run npm run lint');
    if (!hasCommand(qSteps, /npm run test:business-invariants\b/)) {
      errors.push('quality must run npm run test:business-invariants');
    }
    if (hasCommand(qSteps, /npm run build\b/)) errors.push('quality must not run npm run build');

    const covered = biCoveredScripts();
    for (const step of qSteps) {
      for (const script of npmScriptsInText(step.run)) {
        if (script === 'lint' || script === BI_SUITE || script === 'check:ci-structure') continue;
        if (covered.has(script)) {
          errors.push(`quality extra duplicates BI coverage: ${script}`);
        }
      }
    }
  }

  if (buildE2e) {
    const steps = walkSteps(buildE2e);
    if (!hasCommand(steps, /npm run build\b/)) errors.push('build-e2e must run npm run build');
  }

  return errors;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function runSelfTest() {
  const base = loadRepoWorkflows();
  const baseline = collectCiStructureErrors(base);
  if (baseline.length > 0) {
    throw new Error(`self-test requires a valid repo first:\n${baseline.join('\n')}`);
  }

  const extraQuality = clone(base);
  extraQuality['quality.yml'] = {
    on: { push: { branches: ['main'] } },
    jobs: { quality: { steps: [{ run: 'npm run lint' }] } },
  };
  expectFail(extraQuality, 'unexpected workflow file');

  const qualityBuild = clone(base);
  qualityBuild['ci-cd.yml'].jobs.quality.steps.push({ run: 'npm run build' });
  expectFail(qualityBuild, 'quality must not run npm run build');

  const dupFinance = clone(base);
  dupFinance['ci-cd.yml'].jobs.quality.steps.push({ run: 'npm run test:finance' });
  expectFail(dupFinance, 'duplicates BI coverage: test:finance');

  const bypass = clone(base);
  bypass['ci-cd.yml'].jobs.deploy.needs = ['quality', 'build-e2e'];
  expectFail(bypass, 'deploy must need security-db');

  const soft = clone(base);
  soft['ci-cd.yml'].jobs['security-db']['continue-on-error'] = true;
  expectFail(soft, 'continue-on-error');

  const stripped = clone(base);
  stripped['ci-cd.yml'].jobs['security-db'].steps = walkSteps(stripped['ci-cd.yml'].jobs['security-db']).filter(
    (step) => !String(step.name || '').includes('Require secrets on main')
  );
  expectFail(stripped, 'fail on main when DB audit secrets');

  console.log('check-ci-workflow-structure self-test: ok');
}

function expectFail(workflows, needle) {
  const errors = collectCiStructureErrors(workflows);
  if (!errors.some((error) => error.includes(needle))) {
    throw new Error(`expected error containing "${needle}", got:\n${errors.join('\n') || '(none)'}`);
  }
}

function main() {
  const selfTest = process.argv.includes('--self-test');
  const errors = collectCiStructureErrors();
  if (errors.length > 0) {
    console.error('check-ci-workflow-structure: failed');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  if (selfTest) runSelfTest();
  console.log('check-ci-workflow-structure: ok (ci-cd.yml quality → build-e2e / security-db → deploy)');
}

const isDirect =
  process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (isDirect) {
  main();
}
