import { createRequire } from 'module';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require('./node_modules/sharp/lib/index.js');

// On Windows with Git Bash, /tmp maps to C:\Users\workm\AppData\Local\Temp
const tmpBase = join(process.env.TEMP || process.env.TMP || 'C:\\Users\\workm\\AppData\\Local\\Temp', 'sponsor_svgs');
console.log('tmpBase:', tmpBase);
console.log('files:', readdirSync(tmpBase));

const outDir = join(__dirname, 'public', 'sponsors');
mkdirSync(outDir, { recursive: true });

const logos = {
  google: join(tmpBase, 'svg2.svg'),
  spotify: join(tmpBase, 'svg3.svg'),
  canva: join(tmpBase, 'svg4.svg'),
  zoom: join(tmpBase, 'svg6.svg'),
  slack: join(tmpBase, 'svg9.svg'),
};

for (const [name, svgPath] of Object.entries(logos)) {
  try {
    const svgContent = readFileSync(svgPath);
    await sharp(svgContent)
      .resize(160, 48, { fit: 'inside', withoutEnlargement: false })
      .png()
      .toFile(join(outDir, name + '.png'));
    console.log('Converted', name, '->', join(outDir, name + '.png'));
  } catch (e) {
    console.error('Failed', name, e.message);
  }
}
console.log('Done. Sponsors dir:', readdirSync(outDir));
