import { createHash } from 'node:crypto';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_EXTENSIONS = new Set(['.ogg','.mp3','.m4a','.aac','.wav','.opus']);

async function exists(file) { try { await access(file); return true; } catch { return false; } }
async function walk(directory, output = []) {
  for (const entry of await readdir(directory, { withFileTypes:true })) {
    if (['node_modules','dist','.git'].includes(entry.name)) continue;
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(file, output); else output.push(file);
  }
  return output;
}
function add(result, level, code, message, file = null) { result[level].push({ code, message, ...(file ? { file:relative(projectRoot,file).replaceAll('\\','/') } : {}) }); }
function resolveAssetReference(sourceFile, reference) {
  const cleaned = String(reference).trim().replace(/^['"]|['"]$/g,'').split(/[?#]/)[0];
  if (!cleaned || /^(?:data:|https?:|blob:|#)/i.test(cleaned)) return null;
  if (cleaned.startsWith('/')) return resolve(projectRoot, cleaned.slice(1));
  return resolve(dirname(sourceFile), cleaned);
}
function collectStrings(value, result = []) {
  if (typeof value === 'string') result.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item,result));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item,result));
  return result;
}
async function sha256(file) { return createHash('sha256').update(await readFile(file)).digest('hex'); }

export async function collectThreeAddonFiles(threeRoot, entrySpecifiers) {
  const addonsRoot = resolve(threeRoot,'examples/jsm');
  const found = new Set();
  const queue = entrySpecifiers.map((specifier) => resolve(addonsRoot, specifier.replace(/^three\/addons\//,'')));
  while (queue.length) {
    const file = queue.shift();
    if (found.has(file)) continue;
    if (!(await exists(file))) throw new Error(`Missing Three.js addon: ${relative(threeRoot,file)}`);
    found.add(file);
    const source = await readFile(file,'utf8');
    const importPattern = /(?:from\s*|import\s*\()['"]([^'"]+)['"]/g;
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) continue;
      let dependency = resolve(dirname(file),specifier);
      if (!extname(dependency)) dependency += '.js';
      if (dependency.startsWith(addonsRoot) && !found.has(dependency)) queue.push(dependency);
    }
  }
  return [...found];
}

export async function runProductionPreflight({ root = projectRoot, requireThree = false } = {}) {
  const result = { ok:true, root, node:process.version, checkedAssets:0, ambientAudioFiles:0, errors:[], warnings:[], notes:[] };
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) add(result,'errors','NODE_VERSION','Node.js 20 or newer is required.');

  const required = ['index.html','404.html','package.json','package-lock.json','src/main.js','src/app.js','public/audio/ambient/manifest.json'];
  for (const item of required) if (!(await exists(resolve(root,item)))) add(result,'errors','MISSING_REQUIRED',`Required file is missing: ${item}`,resolve(root,item));

  const files = await walk(root);
  for (const file of files.filter((item) => extname(item)==='.json')) {
    try { JSON.parse(await readFile(file,'utf8')); } catch (error) { add(result,'errors','INVALID_JSON',error.message,file); }
  }

  for (const file of files.filter((item) => extname(item)==='.css')) {
    const source = await readFile(file,'utf8');
    for (const match of source.matchAll(/url\(\s*([^)]*?)\s*\)/g)) {
      const asset = resolveAssetReference(file,match[1]);
      if (!asset) continue;
      result.checkedAssets += 1;
      if (!(await exists(asset))) add(result,'errors','MISSING_CSS_ASSET',`CSS asset not found: ${match[1]}`,file);
    }
  }

  const indexFile = resolve(root,'index.html');
  if (await exists(indexFile)) {
    const html = await readFile(indexFile,'utf8');
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const asset = resolveAssetReference(indexFile,match[1]); if (!asset) continue;
      result.checkedAssets += 1; if (!(await exists(asset))) add(result,'errors','MISSING_INDEX_ASSET',`Index asset not found: ${match[1]}`,indexFile);
    }
  }

  for (const dataPath of ['src/data/planets.json','src/data/stars.json','src/data/gallery.json','src/data/game-levels.json']) {
    const file = resolve(root,dataPath); if (!(await exists(file))) continue;
    const data = JSON.parse(await readFile(file,'utf8'));
    for (const value of collectStrings(data)) {
      if (!/^\/?public\//.test(value)) continue;
      const asset = resolve(root,value.replace(/^\//,'')); result.checkedAssets += 1;
      if (!(await exists(asset))) add(result,'errors','MISSING_DATA_ASSET',`Data asset not found: ${value}`,file);
    }
  }

  const manifestFile = resolve(root,'public/audio/ambient/manifest.json');
  if (await exists(manifestFile)) {
    const manifest = JSON.parse(await readFile(manifestFile,'utf8'));
    const hashes = new Map();
    for (const entry of manifest.files ?? []) {
      const pathValue = entry.path ?? entry.file;
      const file = resolve(root,'public',String(pathValue ?? '').replace(/^\/?public\//,'').replace(/^\//,''));
      result.ambientAudioFiles += 1; result.checkedAssets += 1;
      if (!(await exists(file))) { add(result,'errors','MISSING_AUDIO',`Ambient audio not found: ${pathValue}`,manifestFile); continue; }
      const info = await stat(file);
      if (info.size <= 0 || !AUDIO_EXTENSIONS.has(extname(file).toLowerCase())) add(result,'errors','INVALID_AUDIO',`Invalid ambient audio: ${pathValue}`,file);
      const hash = await sha256(file);
      if (hashes.has(hash)) add(result,'warnings','DUPLICATE_AUDIO',`Duplicate audio content: ${pathValue} and ${hashes.get(hash)}`,file);
      else hashes.set(hash,pathValue);
    }
  }

  const sourceFiles = files.filter((item) => ['.js','.mjs'].includes(extname(item)) && item.includes(`${resolve(root,'src')}`));
  const addonSpecifiers = new Set();
  let importsThree = false;
  for (const file of sourceFiles) {
    const source = await readFile(file,'utf8');
    if (/from\s+['"]three['"]|import\(['"]three['"]\)/.test(source)) importsThree = true;
    for (const match of source.matchAll(/['"](three\/addons\/[^'"]+)['"]/g)) addonSpecifiers.add(match[1]);
  }
  const threeRoot = resolve(root,'node_modules/three');
  const threeCore = resolve(threeRoot,'build/three.module.js');
  if (importsThree && !(await exists(threeCore))) {
    const level = requireThree ? 'errors' : 'warnings';
    add(result,level,'THREE_MISSING','Three.js is not installed; 3D routes and the production build cannot be validated.',threeCore);
  } else if (importsThree) {
    try {
      const addons = await collectThreeAddonFiles(threeRoot,[...addonSpecifiers]);
      result.notes.push({ code:'THREE_RUNTIME', message:`Three.js core and ${addons.length} reachable addon modules are available.` });
    } catch (error) { add(result,'errors','THREE_ADDON_MISSING',error.message,threeRoot); }
  }

  result.ok = result.errors.length === 0;
  return result;
}

function print(result) {
  console.log(JSON.stringify(result,null,2));
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const requireThree = process.argv.includes('--require-three');
  print(await runProductionPreflight({ requireThree }));
}
