import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = path.join(root, 'public/images');
const outputDir = path.join(imagesDir, 'optimized');

const WEBP_QUALITY = 80;
const RASTER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

const variantRules = [
  {
    match: (relativePath) => relativePath === 'mike.jpg',
    widths: [256, 380],
    resize: (width) => ({ width, height: width, fit: 'cover' })
  },
  {
    match: (relativePath) => relativePath.startsWith('logos/'),
    widths: [200],
    resize: (width) => ({ width, fit: 'inside', withoutEnlargement: true })
  },
  {
    match: () => true,
    widths: [800],
    resize: (width) => ({ width, fit: 'inside', withoutEnlargement: true })
  }
];

async function collectRasterImages(dir, base = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'optimized') {
      continue;
    }

    const relativePath = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectRasterImages(fullPath, relativePath)));
      continue;
    }

    if (RASTER_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(relativePath);
    }
  }

  return files;
}

function getRule(relativePath) {
  return variantRules.find((rule) => rule.match(relativePath)) ?? variantRules.at(-1);
}

const rasterImages = await collectRasterImages(imagesDir);

for (const relativePath of rasterImages) {
  const rule = getRule(relativePath);
  const inputPath = path.join(imagesDir, relativePath);
  const { dir, name } = path.parse(relativePath);
  const variantOutputDir = path.join(outputDir, dir);

  await mkdir(variantOutputDir, { recursive: true });

  for (const width of rule.widths) {
    const suffix = rule.widths.length > 1 ? `-${width}` : '';
    const outputPath = path.join(variantOutputDir, `${name}${suffix}.webp`);

    await sharp(inputPath)
      .resize(rule.resize(width))
      .webp({ quality: WEBP_QUALITY })
      .toFile(outputPath);

    console.log(`Generated ${path.relative(root, outputPath)}`);
  }
}
