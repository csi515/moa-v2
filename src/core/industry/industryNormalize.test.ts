/**
 * industry_type 정규화 — unknown을 piano로 위장하지 않음.
 * 실행: npm run test:industry-normalize
 */
import assert from 'node:assert/strict';
import {
  DEFAULT_CREATE_INDUSTRY_TYPE,
  getIndustryLabel,
  hasIndustryModule,
  isBlankIndustryInput,
  normalizeIndustryType,
  parseIndustryType,
  shouldUseGenericShell,
} from './types';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveIndustryAppKind } from './industryAppResolve';
import { resolveHydrateModules } from '../../services/adapters/hydrateModules';
import {
  getParentPortalNav,
  getParentPortalSecondaryTabs,
} from '../../modules/parent/parentPortalNav';

function run() {
  assert.equal(DEFAULT_CREATE_INDUSTRY_TYPE, 'piano');

  assert.equal(parseIndustryType('piano'), 'piano');
  assert.equal(normalizeIndustryType('piano'), 'piano');
  assert.equal(resolveIndustryAppKind('piano'), 'module');
  assert.equal(hasIndustryModule('piano'), true);
  assert.equal(shouldUseGenericShell('piano'), false);

  assert.equal(parseIndustryType('taekwondo'), 'gym');
  assert.equal(normalizeIndustryType('taekwondo'), 'gym');
  assert.equal(resolveIndustryAppKind('taekwondo'), 'module');

  assert.equal(isBlankIndustryInput(null), true);
  assert.equal(isBlankIndustryInput(''), true);
  assert.equal(isBlankIndustryInput('  '), true);
  assert.equal(parseIndustryType(null), null);
  assert.equal(parseIndustryType(''), null);
  assert.equal(normalizeIndustryType(null), 'piano');
  assert.equal(normalizeIndustryType(''), 'piano');
  assert.equal(normalizeIndustryType('   '), 'piano');
  assert.equal(resolveIndustryAppKind(null), 'module');
  assert.equal(resolveIndustryAppKind(''), 'module');

  assert.equal(parseIndustryType('english_academy'), null);
  assert.equal(normalizeIndustryType('english_academy'), null);
  assert.equal(resolveIndustryAppKind('english_academy'), 'generic');
  assert.equal(shouldUseGenericShell('english_academy'), true);
  assert.equal(hasIndustryModule('english_academy'), false);
  assert.equal(getIndustryLabel('english_academy'), '학원');
  assert.notEqual(getIndustryLabel('english_academy'), '피아노학원');
  assert.deepEqual(resolveHydrateModules('english_academy'), {
    piano: false,
    education: false,
    daycare: false,
  });

  assert.equal(parseIndustryType('academy'), 'academy');
  assert.equal(normalizeIndustryType('academy'), 'academy');
  assert.equal(hasIndustryModule('academy'), false);
  assert.equal(shouldUseGenericShell('academy'), true);
  assert.equal(resolveIndustryAppKind('academy'), 'generic');
  const pluginHost = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'pluginHost.ts'), 'utf8');
  assert.match(pluginHost, /isBlankIndustryInput\(industry\)/);
  assert.match(pluginHost, /카탈로그에 없는 업종/);
  assert.match(pluginHost, /buildGenericPluginManifest/);

  assert.deepEqual(resolveHydrateModules('piano'), {
    piano: true,
    education: true,
    daycare: false,
  });
  assert.deepEqual(resolveHydrateModules(null), {
    piano: true,
    education: true,
    daycare: false,
  });

  const pianoNav = getParentPortalNav('piano').map((t) => t.id);
  assert.ok(pianoNav.includes('schedule'));
  assert.deepEqual(getParentPortalNav(null).map((t) => t.id), pianoNav);
  assert.deepEqual(getParentPortalNav('').map((t) => t.id), pianoNav);
  assert.deepEqual(getParentPortalNav('taekwondo').map((t) => t.id), getParentPortalNav('gym').map((t) => t.id));

  const genericNav = getParentPortalNav('english_academy').map((t) => t.id);
  assert.equal(genericNav.includes('schedule'), false);
  assert.deepEqual(genericNav, getParentPortalNav('academy').map((t) => t.id));
  assert.ok(genericNav.includes('home'));
  assert.ok(genericNav.includes('attendance'));
  assert.ok(genericNav.includes('tuition'));
  assert.deepEqual(getParentPortalSecondaryTabs('english_academy'), ['notices', 'more']);
  assert.ok(getParentPortalSecondaryTabs('piano').includes('assignments'));

  const hydrator = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../StorageHydrator.tsx'),
    'utf8'
  );
  assert.match(hydrator, /StorageService\.hydrate\(organizationId, industryType\)/);
  assert.equal(hydrator.includes('normalizeIndustryType'), false);

  const portal = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../modules/parent/ParentAcademyPortal.tsx'),
    'utf8'
  );
  assert.equal(portal.includes('normalizeIndustryType'), false);

  console.log('industryNormalize.test.ts: ok');
}

run();
