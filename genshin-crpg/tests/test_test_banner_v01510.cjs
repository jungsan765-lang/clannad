const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const workflow=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/crpg-sync-dist.yml'),'utf8');
const injected=workflow.match(/cat >verified-pack\/online_config\.js <<'EOF'\n([\s\S]*?)\n\s*EOF/)[1];
let height=26,observer,resize,appends=0;
const props=new Map(),nodes=new Map(),dom={readyState:'complete',documentElement:{style:{setProperty:(k,v)=>props.set(k,v)}},getElementById:id=>nodes.get(id),createElement:()=>({style:{},getBoundingClientRect:()=>({height})}),body:{appendChild:n=>{appends++;nodes.set(n.id,n)}}};
class ResizeObserver {constructor(cb){observer=cb;}observe(n){assert.equal(n.id,'crpg-test-banner');}}
const c={document:dom,Math,ResizeObserver,addEventListener:(event,cb)=>{assert.equal(event,'resize');resize=cb;}};c.window=c;
vm.runInNewContext(injected,c);
assert.equal(props.get('--crpg-top-inset'),'26px');
height=51.3;observer();assert.equal(props.get('--crpg-top-inset'),'52px','wrapped label reserves its full height');
height=26;resize();assert.equal(props.get('--crpg-top-inset'),'26px','wide viewport removes excess inset');
vm.runInNewContext(injected,c);assert.equal(appends,1,'configuration cannot duplicate the banner');
assert.equal(nodes.get('crpg-test-banner').style.pointerEvents,'none');
console.log('PASS: measured test-banner inset, wrapping, resize, single instance, pointer transparency');
