import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
const root='.next/static/chunks';
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const chunks=files(root).filter(path=>path.endsWith('.js')).map(path=>{
  const bytes=readFileSync(path);
  return {file:relative('.next',path).replaceAll('\\','/'),raw:bytes.length,gzip:gzipSync(bytes).length};
}).sort((a,b)=>b.raw-a.raw);
const budgets={largestChunkRaw:650_000,largestChunkGzip:220_000};
const result={budgets,largest:chunks[0],totalRaw:chunks.reduce((n,c)=>n+c.raw,0),totalGzip:chunks.reduce((n,c)=>n+c.gzip,0),chunks};
mkdirSync('.browser-check',{recursive:true});
writeFileSync('.browser-check/performance.json',JSON.stringify(result,null,2));
console.log(`Largest production JS: ${result.largest.raw} bytes raw / ${result.largest.gzip} bytes gzip. All chunks: ${result.totalRaw} bytes (not a per-route transfer measure).`);
if(chunks.some(c=>c.raw>budgets.largestChunkRaw || c.gzip>budgets.largestChunkGzip)) {
  console.error('JavaScript chunk budget exceeded. Investigate imports before changing the budget.');
  process.exitCode=1;
}
