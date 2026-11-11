'use strict';
// 0.16.47 고유명사 사전 (user: 「앞으로 고유명사 나오면 그 명사를 쓸 수 있게 어디 저장을 해두던가 해서 단어들은 그걸 이용하게 하는게
// 좋아보이는데」, after 「테이바트가 한국 공식 이름이 아닐텐데..」). tools/editorial/glossary_ko.json is the one place for proper
// nouns; this keeps the game to it.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),rd=f=>fs.readFileSync(path.join(root,f),'utf8');
const G=JSON.parse(rd('tools/editorial/glossary_ko.json'));
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');

check('every chosen term has its official Korean, English, kind and where it was confirmed; no wrong spelling is another term',()=>{
 assert(G.terms.length>=60);const kos=new Set(G.terms.map(t=>t.ko));
 for(const t of G.terms){assert(t.ko&&t.en&&t.kind,JSON.stringify(t));assert(G.sources[t.source],t.ko+' source');assert(Array.isArray(t.wrong),t.ko);for(const w of t.wrong){assert(!kos.has(w),t.ko+': '+w+' is a term');assert.notEqual(w,t.ko);}}
 assert.equal(G.terms.find(t=>t.en==='Teyvat').ko,'티바트');assert(G.terms.find(t=>t.en==='Teyvat').wrong.includes('테이바트'));
 for(const k of ['characters','weapons','materials','monsters','foods'])assert(Object.keys(G.data[k]||{}).length>100,k);
 assert.equal(G.data.characters.Qiqi,'치치');assert.equal(G.data.characters.Amber,'엠버');assert.equal(G.data.characters.Sucrose,'설탕');
});

check('the screen corrects the old spellings marked for it, with the same map as the glossary',()=>{
 const want=Object.fromEntries(G.terms.filter(t=>t.display).flatMap(t=>t.wrong.map(w=>[w,t.ko])));
 assert.deepEqual(G.display,want);
 const app=rd('source/app_glossary_v01647.js'),m=/\/\*GLOSSARY_DISPLAY\*\/(.*?)\/\*END\*\//.exec(app);assert(m,'map in the page');assert.deepEqual(JSON.parse(m[1]),G.display);
 assert.equal(G.display['나선비경'],'나선 비경');
 assert(rd('source/index.html').includes('<script src="app_glossary_v01647.js"></script>'));assert(rd('tools/build.py').includes("'app_glossary_v01647.js'"));
 const doc=rd('docs/GLOSSARY_KO.md');for(const t of G.terms)assert(doc.includes('| '+t.ko+' |'),'docs/GLOSSARY_KO.md lists '+t.ko+' (node tools/editorial/build_glossary.cjs)');
});

check('no wrong spelling in the game\'s data, code, story manuscripts or this release\'s notes',()=>{
 const files=[];const walk=(d,re)=>{for(const f of fs.readdirSync(path.join(root,d),{withFileTypes:true})){const p=d+'/'+f.name;if(f.isDirectory())walk(p,re);else if(re.test(f.name))files.push(p);}};
 walk('source',/\.(js|html|css|webmanifest)$/);walk('tools/editorial/main_story_k',/\.md$/);walk('tools/editorial/personal_k',/\.md$/);walk('tools/editorial/festival_k',/\.md$/);files.push('content/db.json');
 const texts=files.filter(f=>f!=='source/app_glossary_v01647.js').map(f=>[f,rd(f)]);
 const notes=JSON.parse(rd('content/release-notes.json'));texts.push(['content/release-notes.json (this release)',JSON.stringify({changes:notes.changes,notes:notes.notes})]);
 const shown=new Set(Object.keys(G.display)),found=[];
 for(const t of G.terms)for(const w of t.wrong){if(shown.has(w))continue;for(const [f,s] of texts){let i=s.indexOf(w);while(i>=0){const around=s.slice(Math.max(0,i-30),i+w.length+30);
   const ok=(G.allow||[]).some(a=>a.file===f&&(a.text==='*'||around.includes(a.text)));if(!ok)found.push(f+': 「'+w+'」 → 「'+t.ko+'」 … '+around.replace(/\s+/g,' '));i=s.indexOf(w,i+1);}}}
 assert.deepEqual(found,[],found.join('\n'));
});

check('the game\'s Mondstadt and Liyue characters, its weapons and its monsters carry the official names',()=>{
 const db=JSON.parse(rd('content/db.json')),tables=db.tables||db,T=n=>{const t=tables[n];return Array.isArray(t)?t:(t?.rows||[]);};
 const known=new Set((G.knownDifferences||[]).flatMap(d=>String(d.where).match(/MON_[A-Z_]+/g)||[]));
 const match=(map,id,strip)=>{const en=norm(String(id).replace(strip,''));for(const [k,v] of Object.entries(map))if(norm(k)===en)return v;return null;};
 const bad=[];let seen=0;
 for(const r of T('07_CHAR_DB'))if(/^(MOND|LIYUE)_/.test(r[0])){const o=match(G.data.characters,r[0],/^(MOND|LIYUE)_/);if(o){seen++;if(o!==r[1])bad.push(r[0]+' '+r[1]+' → '+o);}}
 assert(seen>=40,'Mondstadt and Liyue characters found: '+seen);
 for(const r of T('16_EQUIP_DB'))if(/^EQ_(SWORD|CLAYMORE|POLEARM|BOW|CATALYST)_/.test(r[0])){const o=match(G.data.weapons,r[0],/^EQ_(SWORD|CLAYMORE|POLEARM|BOW|CATALYST)_/);if(o&&o!==r[1])bad.push(r[0]+' '+r[1]+' → '+o);}
 const monsters=new Map(Object.entries(G.data.monsters).map(([en,ko])=>[norm(en),ko]));
 for(const r of T('09_MONSTER_DB')){if(typeof r[0]!=='string'||!/^MON_/.test(r[0])||known.has(r[0]))continue;const o=monsters.get(norm(r[0].replace(/^MON_/,'')));if(o&&o!==r[1])bad.push(r[0]+' '+r[1]+' → '+o);}
 assert.deepEqual(bad,[],bad.join('\n'));
});

check('the writing rules point every writer to the glossary',()=>{
 assert(rd('AGENTS.md').includes('tools/editorial/glossary_ko.json'));
 assert(rd('tools/editorial/personal_k/VOICE_BIBLE.md').includes('tools/editorial/glossary_ko.json'));
 assert(rd('tools/editorial/main_story_k/README.md').includes('tools/editorial/glossary_ko.json'));
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
