#!/usr/bin/env node
/**
 * brand.json → PWA manifest, index.html, metadata.json 동기화
 * Usage: node scripts/sync-brand-assets.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const brand = JSON.parse(await readFile(path.join(root, 'brand.json'), 'utf8'));

const manifestPath = path.join(root, 'public', 'manifest.json');
const manifest = {
  name: `${brand.fullName} — ${brand.tagline}`,
  short_name: brand.shortName,
  description: brand.description,
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait-primary',
  background_color: '#4f46e5',
  theme_color: '#4f46e5',
  icons: [
    {
      src: 'icons/icon-192.png',
      type: 'image/png',
      sizes: '192x192',
      purpose: 'maskable',
    },
    {
      src: 'icons/icon-512.png',
      type: 'image/png',
      sizes: '512x512',
      purpose: 'maskable',
    },
    {
      src: 'icons/icon-512.png',
      type: 'image/png',
      sizes: '512x512',
      purpose: 'any',
    },
  ],
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const indexPath = path.join(root, 'index.html');
let indexHtml = await readFile(indexPath, 'utf8');
indexHtml = indexHtml.replace(
  /<title>[^<]*<\/title>/,
  `<title>${brand.fullName} — ${brand.tagline}</title>`,
);
indexHtml = indexHtml.replace(
  /<meta name="description" content="[^"]*"/,
  `<meta name="description" content="${brand.description}"`,
);
await writeFile(indexPath, indexHtml);

const metadataPath = path.join(root, 'metadata.json');
const metadata = {
  name: `${brand.fullName} — ${brand.tagline}`,
  description: brand.description,
  requestFramePermissions: [],
  majorCapabilities: [],
};
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

console.log('synced brand assets:', [manifestPath, indexPath, metadataPath].join(', '));
