/**
 * Capability root index가 공식 public API인지 확인.
 * 실행: npm run test:capability-public-api
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPABILITY_IDS, type CapabilityId } from './_shared/capabilityTypes';

const here = dirname(fileURLToPath(import.meta.url));

function readCap(id: string): string {
  return readFileSync(join(here, id, 'index.ts'), 'utf8');
}

function capabilityPackageDirs(): string[] {
  return readdirSync(here)
    .filter((name) => {
      if (name.startsWith('_') || name.startsWith('.')) return false;
      return statSync(join(here, name)).isDirectory();
    })
    .sort();
}

/** 기존 5개 Capability의 세부 public surface. 순회 목록이 아니다. */
const EXISTING_SURFACE: Partial<Record<CapabilityId, (src: string) => void>> = {
  billing(src) {
    assert.match(src, /from '\.\/finance'/);
    assert.doesNotMatch(src, /createBillingCapabilityStorage/);
  },
  commerce(src) {
    assert.match(src, /from '\.\/facade'/);
    assert.match(src, /from '\.\/loyalty'/);
    assert.doesNotMatch(src, /from '\.\/saleLedger'/);
    assert.doesNotMatch(src, /createCommerceCapabilityStorage/);
  },
  scheduling(src) {
    assert.match(src, /from '\.\/availability'/);
    assert.match(src, /from '\.\/capacity'/);
    assert.match(src, /from '\.\/calendar'/);
  },
  booking(src) {
    assert.match(src, /from '\.\/waitlist'/);
    assert.doesNotMatch(src, /createBookingCapabilityStorage/);
  },
  attendance(src) {
    assert.match(src, /AttendanceManagementView/);
    assert.doesNotMatch(src, /createAttendanceCapabilityStorage/);
  },
};

async function run(): Promise<void> {
  assert.deepEqual(capabilityPackageDirs(), [...CAPABILITY_IDS].sort());

  for (const id of CAPABILITY_IDS) {
    const indexPath = join(here, id, 'index.ts');
    assert.equal(existsSync(indexPath), true, `missing public API: src/capabilities/${id}/index.ts`);

    const src = readCap(id);
    assert.match(
      src,
      new RegExp(`export \\{ ${id}Capability \\} from ['"]\\./manifest['"]`),
      `${id} root must export ${id}Capability from ./manifest`
    );
    assert.doesNotMatch(src, /@\/industries(?:\/|['"])/, `${id} public API must not import industries`);
    assert.doesNotMatch(src, /@\/modules(?:\/|['"])/, `${id} public API must not import modules`);
    assert.doesNotMatch(src, /@\/app(?:\/|['"])/, `${id} public API must not import Composition`);

    const mod = (await import(`./${id}/manifest.ts`)) as Record<string, { definition?: { id?: string } }>;
    const capability = mod[`${id}Capability`];
    assert.ok(capability, `${id} manifest must export ${id}Capability`);
    assert.equal(capability.definition?.id, id);

    EXISTING_SURFACE[id]?.(src);
  }

  console.log(`publicApi.test.ts: ok (${CAPABILITY_IDS.length} capabilities)`);
}

await run();
