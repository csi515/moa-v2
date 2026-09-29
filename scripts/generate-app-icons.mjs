#!/usr/bin/env node
/**
 * PWA PNG 아이콘 + Capacitor resources/icon.png 생성
 * Usage: npm run icons:generate
 */
import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'public', 'pwa-icon.svg');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-1024.png', size: 1024 },
];

async function main() {
  const svg = await readFile(svgPath);
  const iconsDir = path.join(root, 'public', 'icons');
  const resourcesDir = path.join(root, 'resources');
  await mkdir(iconsDir, { recursive: true });
  await mkdir(resourcesDir, { recursive: true });

  for (const { name, size } of sizes) {
    const out = path.join(iconsDir, name);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log('wrote', out);
  }

  const icon1024 = path.join(iconsDir, 'icon-1024.png');
  await copyFile(icon1024, path.join(resourcesDir, 'icon.png'));
  console.log('wrote resources/icon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
