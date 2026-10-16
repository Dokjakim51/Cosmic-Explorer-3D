import { createHash } from 'node:crypto';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function exists(file) { try { await access(file); return true; } catch { return false; } }
async function walk(directory, output=[]) { for (const entry of await readdir(directory,{withFileTypes:true})) { const file=resolve(directory,entry.name); if(entry.isDirectory()) await walk(file,output); else output.push(file); } return output; }
function resolveRef(file,ref) { const clean=ref.split(/[?#]/)[0]; if (!clean || /^(data:|https?:|blob:|#)/.test(clean)) return null; return clean.startsWith('/')?resolve(fileURLToPath(new URL('.',pathToFileURL(resolve(file,'..')))),clean.slice(1)):resolve(dirname(file),clean); }
function normalizeRootReference(root, value) { const clean=String(value??'').replace(/^\//,'').replace(/^public\//,''); return resolve(root,'public',clean); }

export async function validateDist(outputDirectory='dist') {
  const root=resolve(scriptRoot,outputDirectory);
  const result={ok:true,root,files:0,moduleImports:0,cssAssets:0,ambientAudioFiles:0,errors:[],warnings:[]};
  const error=(code,message,file)=>result.errors.push({code,message,...(file?{file:relative(root,file).replaceAll('\\','/')}:{})});
  if (!(await exists(root))) { error('DIST_MISSING','Build output directory does not exist.',root); result.ok=false; return result; }
  for (const item of ['index.html','404.html','src/main.js','node_modules/three/build/three.module.js','version.json','build-report.json']) if (!(await exists(resolve(root,item)))) error('REQUIRED_MISSING',`Required production file missing: ${item}`,resolve(root,item));
  const files=await walk(root); result.files=files.length;
  for (const file of files.filter(f=>['.js','.mjs'].includes(extname(f)))) {
    const source=await readFile(file,'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*\()['"]([^'"]+)['"]/g)) {
      const spec=match[1]; let target=null;
      if (spec==='three') target=resolve(root,'node_modules/three/build/three.module.js');
      else if (spec.startsWith('three/addons/')) target=resolve(root,'node_modules/three/examples/jsm',spec.slice('three/addons/'.length));
      else if (spec.startsWith('.')) { target=resolve(dirname(file),spec); if(!extname(target)) target += '.js'; }
      if (!target) continue; result.moduleImports += 1;
      if (!(await exists(target))) error('MODULE_IMPORT_MISSING',`Module import cannot be resolved: ${spec}`,file);
    }
  }
  for (const file of files.filter(f=>extname(f)==='.css')) {
    const source=await readFile(file,'utf8');
    for (const match of source.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) {
      const ref=match[1]; if (/^(data:|https?:|blob:|#)/.test(ref)) continue;
      const target=resolve(dirname(file),ref.split(/[?#]/)[0]); result.cssAssets += 1;
      if (!(await exists(target))) error('CSS_ASSET_MISSING',`CSS asset cannot be resolved: ${ref}`,file);
    }
  }
  const manifestFile=resolve(root,'public/audio/ambient/manifest.json');
  if (await exists(manifestFile)) {
    const manifest=JSON.parse(await readFile(manifestFile,'utf8')); const hashes=new Map();
    for(const entry of manifest.files??[]){ const target=normalizeRootReference(root,entry.path??entry.file); result.ambientAudioFiles+=1;
      if(!(await exists(target))){error('AUDIO_MISSING',`Ambient audio is missing: ${entry.path??entry.file}`,manifestFile);continue;}
      if((await stat(target)).size<=0) error('AUDIO_EMPTY',`Ambient audio is empty: ${entry.path??entry.file}`,target);
      const hash=createHash('sha256').update(await readFile(target)).digest('hex');
      if(hashes.has(hash)) result.warnings.push({code:'AUDIO_DUPLICATE',message:`Duplicate audio: ${entry.path??entry.file} and ${hashes.get(hash)}`}); else hashes.set(hash,entry.path??entry.file);
    }
  } else error('AUDIO_MANIFEST_MISSING','Ambient audio manifest is missing.',manifestFile);
  for(const file of files.filter(f=>extname(f)==='.json')) { try{JSON.parse(await readFile(file,'utf8'));}catch(e){error('JSON_INVALID',e.message,file);} }
  result.ok=result.errors.length===0; return result;
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){ const result=await validateDist(process.argv[2]??'dist'); console.log(JSON.stringify(result,null,2)); if(!result.ok) process.exitCode=1; }
