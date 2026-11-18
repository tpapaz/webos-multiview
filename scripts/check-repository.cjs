// Offline consistency check for the consolidated source tree and Markdown links.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):e.isFile()?[dir+'/'+e.name]:[]);
const slug=s=>s.toLowerCase().replace(/`/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/<[^>]+>/g,'').replace(/[^\p{L}\p{N}\p{M}_\- ]/gu,'').replace(/ /g,'-');
const prose=text=>{let fence=false;return text.split(/\r?\n/).map(line=>{if(/^\s*(```|~~~)/.test(line)){fence=!fence;return '';}return fence?'':line;}).join('\n');};
const markdown=['AGENTS.md','README.md','STATUS.md','ROADMAP.md',...walk('docs'),...walk('native')].filter(f=>f.endsWith('.md'));
let links=0,imports=0,includes=0;
for(const file of markdown){
 const body=prose(fs.readFileSync(path.join(root,file),'utf8'));
 for(const m of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  if(/^[a-z][a-z0-9+.-]*:|^\/\//i.test(m[1]))continue;
  const [relative,anchor]=m[1].split('#'),target=path.resolve(root,path.dirname(file),relative||path.basename(file));
  assert(fs.existsSync(target),file+': missing link '+m[1]);links++;
  if(anchor&&target.endsWith('.md')){
   const headings=[...prose(fs.readFileSync(target,'utf8')).matchAll(/^#{1,6}\s+(.+)$/gm)].map(h=>slug(h[1].trim()));
   assert(headings.includes(anchor),file+': missing anchor '+m[1]);
  }
 }
}
for(const file of [...walk('scripts'),...walk('tests')].filter(f=>f.endsWith('.cjs'))){
 const body=fs.readFileSync(path.join(root,file),'utf8');
 for(const m of body.matchAll(/\brequire\(['"](\.[^'"]+)['"]\)/g)){
  // This lazy device-only adapter is kept with the private native control.
  // Source-only checkouts run the host tests with injected transport.
  if(file==='scripts/physical-candidate-preflight.cjs' &&
     m[1]==='../build/phase-2/hdmi-correction-0.1.3/transport.cjs')continue;
  const target=path.resolve(root,path.dirname(file),m[1]);
  assert([target,target+'.cjs',target+'.js',target+'.json',path.join(target,'index.js')].some(f=>fs.existsSync(f)),file+': missing module '+m[1]);imports++;
 }
}
for(const file of [...walk('native'),...walk('tests/host')].filter(f=>/\.(cpp|h|c)$/.test(f))){
 const body=fs.readFileSync(path.join(root,file),'utf8');
 for(const m of body.matchAll(/^\s*#include\s+"(\.[^"]+)"/gm)){
  assert(fs.existsSync(path.resolve(root,path.dirname(file),m[1])),file+': missing include '+m[1]);includes++;
 }
}
console.log(JSON.stringify({status:'passed_repository_consistency',documents:markdown.length,localLinks:links,relativeImports:imports,relativeNativeIncludes:includes,TVConnections:0}));
