'use strict';
const assert=require('node:assert/strict'),{fresh,c,fs,path,vm,root,db}=require('./helpers_v011.cjs');
const old=vm.createContext({console,Date,setTimeout,clearTimeout});
for(const [,f]of fs.readFileSync(path.join(root,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g))if(!['runtime_local_story_content.js','runtime_local_story.js'].includes(f))vm.runInContext(fs.readFileSync(path.join(root,'source',f),'utf8'),old,{filename:f});
const before=new old.CRPGRuntime.Runtime(db),after=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');before.newGame({name:'이전 장면',route:'ROUTE_ISEKAI',saveId:'editorial-before',seed:7});
const baseline=before.storyIndex(),edition=after.storyIndex();let nodes=0,effects=0;
for(const [key,row]of baseline.nodes){const revised=edition.nodes.get(key);assert(revised,'old saved cursor removed: '+key);assert.equal(revised[12],row[12],'story effects/rewards altered: '+key);nodes++;if(row[12])effects++;}
const authored=JSON.parse(fs.readFileSync(path.join(root,'tools/editorial/liyue_ensemble.json'),'utf8'));let fields=0,bypassed=0;
for(const [anchor,e]of Object.entries(authored)){assert(edition.nodes.has('ROUTE_ISEKAI:'+anchor),anchor);for(const id of e.payoff)assert(edition.nodes.has('ROUTE_ISEKAI:'+id),id);if(e.steps.length)fields++;else if(!e.before.length&&!e.after.length)bypassed++;for(const step of e.steps){assert(!step.map||after.tables['32_MAP_DB'].has(step.map));assert(!step.options&&!step.sequence,'new edition must not restore repeated answer quizzes');}}
assert.equal(fields,25);assert.equal(bypassed,12);
// Exact source/engine agreement: author-only notes never enter player dialogue.
for(const [id,e]of Object.entries(authored)){const shipped=JSON.parse(JSON.stringify(e));delete shipped.purpose;delete shipped.payoff;assert.deepEqual(JSON.parse(JSON.stringify(c.CRPGLocalStory.episodes[id])),shipped);}
const out={ok:true,preservedNodeIds:nodes,preservedEffectRows:effects,fieldEpisodes:fields,fullyBypassedErrands:bypassed,validPayoffReferences:true};fs.mkdirSync(root+'/reports/local-v0141',{recursive:true});fs.writeFileSync(root+'/reports/local-v0141/story-integrity.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
