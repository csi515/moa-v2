import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const root = join(import.meta.dirname, '..');
const baselinePath = join(import.meta.dirname, 'architecture-import-baseline.json');
const industryWords = ['piano', 'pilates', 'golf', '학원'];

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function specifiers(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  source.forEachChild((node) => {
    if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) return;
    const text = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : '';
    if (text) found.push(text);
  });
  return found;
}

type Edge = { file: string; spec: string; kind: string };
const edges: Edge[] = [];
const warnings: string[] = [];

for (const file of filesUnder(join(root, 'src', 'core'))) {
  const rel = relative(root, file).replaceAll('\\', '/');
  for (const spec of specifiers(file)) {
    if (spec.includes('/capabilities/') || spec.includes('/presets/')) {
      edges.push({ file: rel, spec, kind: 'core-out' });
    }
  }
}

for (const file of filesUnder(join(root, 'src', 'capabilities'))) {
  const rel = relative(root, file).replaceAll('\\', '/');
  const owner = rel.split('/')[2];
  const text = readFileSync(file, 'utf8');
  for (const word of industryWords) {
    if (text.includes(word)) warnings.push(`${rel}: industry word ${word}`);
  }
  for (const spec of specifiers(file)) {
    const match = spec.match(/@\/capabilities\/([^/'"]+)/);
    if (match && match[1] !== owner) edges.push({ file: rel, spec, kind: 'capability-cross' });
  }
}

if (process.argv.includes('--write-baseline')) {
  writeFileSync(baselinePath, JSON.stringify(edges, null, 2));
  console.log(`baseline written: ${edges.length}`);
  process.exit(0);
}

const baseline = existsSync(baselinePath) ? (JSON.parse(readFileSync(baselinePath, 'utf8')) as Edge[]) : [];
const known = new Set(baseline.map((edge) => `${edge.kind}|${edge.file}|${edge.spec}`));
const fresh = edges.filter((edge) => !known.has(`${edge.kind}|${edge.file}|${edge.spec}`));
if (warnings.length > 0) console.warn(`architecture warnings: ${warnings.length}`);
if (fresh.length > 0) {
  fresh.slice(0, 20).forEach((edge) => console.error(`${edge.kind}: ${edge.file} -> ${edge.spec}`));
  process.exit(1);
}
console.log('check-architecture.ts: ok');
