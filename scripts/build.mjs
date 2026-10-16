import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { collectThreeAddonFiles, projectRoot, runProductionPreflight } from './production-preflight.mjs';
import { validateDist } from './validate-dist.mjs';

const output=resolve(projectRoot,'dist');
const packageJson=JSON.parse(await readFile(resolve(projectRoot,'package.json'),'utf8'));
const entrySpecifiers=new Set();

async function discoverUsedAddons(directory) {
  const { readdir } = await import('node:fs/promises');
  const entries=await readdir(directory,{withFileTypes:true});
  for(const entry of entries){const file=resolve(directory,entry.name); if(entry.isDirectory()) await discoverUsedAddons(file); else if(/\.(?:js|mjs)$/.test(entry.name)){const source=await readFile(file,'utf8'); for(const match of source.matchAll(/['"](three\/addons\/[^'"]+)['"]/g)) entrySpecifiers.add(match[1]);}}
}

async function copyFilePreservingRoot(source, sourceRoot, destinationRoot) {
  const destination=resolve(destinationRoot,relative(sourceRoot,source));
  await mkdir(dirname(destination),{recursive:true});
  await cp(source,destination);
}

await rm(output,{recursive:true,force:true});
try {
  const preflight=await runProductionPreflight({requireThree:true});
  if(!preflight.ok) throw new Error(`Production preflight failed:\n${preflight.errors.map((item)=>`- ${item.message}`).join('\n')}`);
  await mkdir(output,{recursive:true});
  for(const target of ['index.html','404.html','public','src']) await cp(resolve(projectRoot,target),resolve(output,target),{recursive:true});
  const threeRoot=resolve(projectRoot,'node_modules/three');
  const threeOutput=resolve(output,'node_modules/three');
  await mkdir(resolve(threeOutput,'build'),{recursive:true});
  await cp(resolve(threeRoot,'build/three.module.js'),resolve(threeOutput,'build/three.module.js'));
  await cp(resolve(threeRoot,'build/three.core.js'),resolve(threeOutput,'build/three.core.js'));
  await cp(resolve(threeRoot,'build/three.core.min.js'),resolve(threeOutput,'build/three.core.min.js'));
  for(const optional of ['three.module.min.js','LICENSE']) { try { await cp(resolve(threeRoot,optional.startsWith('three.')?'build':'' ,optional),resolve(threeOutput,optional.startsWith('three.')?'build':'' ,optional)); } catch {} }
  await discoverUsedAddons(resolve(projectRoot,'src'));
  for(const addon of await collectThreeAddonFiles(threeRoot,[...entrySpecifiers])) await copyFilePreservingRoot(addon,threeRoot,threeOutput);
  try { await cp(resolve(projectRoot,'deployment/_headers'),resolve(output,'_headers')); } catch {}
  const buildTime=new Date().toISOString();
  await writeFile(resolve(output,'version.json'),JSON.stringify({name:packageJson.name,version:packageJson.version,buildTime},null,2)+'\n');
  await writeFile(resolve(output,'build-report.json'),JSON.stringify({version:packageJson.version,buildTime,source:'cosmic-explorer github release',threeAddons:[...entrySpecifiers].sort()},null,2)+'\n');
  const validation=await validateDist('dist');
  if(!validation.ok) throw new Error(`Built output validation failed:\n${validation.errors.map((item)=>`- ${item.message}`).join('\n')}`);
  console.log(`Production build ${packageJson.version} created and validated in dist/.`);
} catch(error) {
  await rm(output,{recursive:true,force:true});
  console.error(error instanceof Error?error.message:error);
  process.exitCode=1;
}
