/* Presentation-only music queues. Never consume the saved game's random stream. */
(function(root){
 'use strict';
 class MusicQueue {
  constructor(catalog={},random=Math.random){this.catalog=catalog;this.random=typeof random==='function'?random:Math.random;this.positions=new Map();this.key=null;this.state=null;this.battleSerial=0;this.wasBattle=false;}
  select({map='TITLE',region='몬드',place=null,battle=false,boss=false,battleId=null}={}){
   const regionKey=this.catalog.regions?.[region]||'mond';
   const mapped=this.catalog.maps?.[map];
   const candidates=battle?[boss?regionKey+'_boss':regionKey+'_battle',regionKey+'_battle','battle']:[this.catalog.places?.[place],mapped,regionKey+(map.includes('CITY')||map.includes('HARBOR')?'_city':'_field'),regionKey+'_field','mond_city'];
   const playlist=candidates.find(k=>k&&this.catalog.playlists?.[k]?.some(id=>this.catalog.tracks?.[id]));
   if(!playlist){this.key=null;this.state=null;this.wasBattle=!!battle;return null;}
   const ids=this.catalog.playlists[playlist].filter(id=>this.catalog.tracks[id]);
   if(battle&&!this.wasBattle)this.battleSerial++;
   const key=playlist+'|'+(battle?'battle:'+String(battleId??this.battleSerial):map+(place?'|'+place:''));
   if(!battle&&this.lastExplorationKey!==key){this.positions.delete(key);this.lastExplorationKey=key;}
   this.wasBattle=!!battle;
   if(key!==this.key){
    if(!this.positions.has(key)){let index;if(battle){const roll=Number(this.random());index=Math.floor(Math.max(0,Math.min(.9999999999999999,Number.isFinite(roll)?roll:0))*ids.length);}else{let hash=0;for(const c of map)hash=(hash*31+c.charCodeAt(0))>>>0;index=hash%ids.length;}this.positions.set(key,{index,time:0});}
    this.key=key;this.state=this.positions.get(key);
   }
   this.ids=ids;this.playlist=playlist;return this.current();
  }
  current(){if(!this.state||!this.ids?.length)return null;const id=this.ids[this.state.index%this.ids.length];return {id,...this.catalog.tracks[id],playlist:this.playlist,key:this.key,time:this.state.time||0};}
  remember(time){if(this.state&&Number.isFinite(time)&&time>=0)this.state.time=time;}
  next(){if(!this.state)return null;this.state.index=(this.state.index+1)%this.ids.length;this.state.time=0;return this.current();}
 }
 root.CRPGMusicQueue=MusicQueue;
})(typeof window!=='undefined'?window:globalThis);
