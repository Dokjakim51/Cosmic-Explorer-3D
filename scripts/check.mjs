import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const ignored = new Set(['dist', 'node_modules', '.git']);
const jsFiles = [];
const jsonFiles = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    if (entry.isFile() && ['.js', '.mjs'].includes(extname(entry.name))) jsFiles.push(fullPath);
    if (entry.isFile() && extname(entry.name) === '.json') jsonFiles.push(fullPath);
  }
}

await walk(resolve('.'));

for (const file of jsFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

for (const file of jsonFiles) {
  JSON.parse(await readFile(file, 'utf8'));
}

console.log(`Syntax OK: ${jsFiles.length} JavaScript files.`);
console.log(`JSON OK: ${jsonFiles.length} files.`);
