const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');let clock=Date.now();
const c=vm.createContext({console,Date:class extends Date{static now(){return clock;}},setTimeout,clearTimeout});
for(const [,f]of fs.readFileSync(path.join(root,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g))vm.runInContext(fs.readFileSync(path.join(root,'source',f),'utf8'),c,{filename:f});
const db=JSON.parse(fs.readFileSync(path.join(root,'content/db.json'),'utf8')),R=c.CRPGRuntime.Runtime;
let id=0;function fresh(map='MAP_MOND_CITY',route='ROUTE_TRAVELER'){const r=new R(db);r.newGame({name:'클라나드',route,seed:71247,saveId:'V011-'+(++id)});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,STORY_MENU_POLICY:'',WORLD_TIME:'12:00',MORA:3000});delete r.s.storyJourney;delete r.s.storyBreak;r.prepareStory();return r;}
module.exports={fs,path,vm,root,c,db,R,fresh,advance:ms=>clock+=ms};
