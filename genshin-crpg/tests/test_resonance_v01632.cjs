'use strict';
// 0.16.32 신의 눈동자 「공명」 (runtime_geo_oculi.js): the corner mark's strength, the catch's collection, and the oculi that
// keep their own way (puzzle, night, hidden, in-shop).
const assert=require('node:assert/strict');
const {fresh}=require('./helpers_v011.cjs');
const g=fresh();g.serverAdmin=true;g.action('OPERATOR_DEBUG',{op:'level',value:60});
const left=g.resonanceLeft();
assert(left.length>=20,'most oculi answer the resonance');
for(const p of left)assert(!['PUZZLE','NIGHT','HIDDEN'].includes(p.method)&&!p.place,p.id+' keeps its own way');
// Away from every one, the mark is faint or near; at the place it says here and names the point.
const first=left[0];
g.action('OPERATOR_DEBUG',{op:'travel',map:first.map});
const here=g.resonanceView();assert.equal(here.level,3);assert.equal(here.point,first.id);
// Not at its place: refused, nothing changes.
const other=left.find(p=>p.map!==first.map);
assert.match(g.actionReason('OCULUS_RESONANCE',{point:other.id}),/공명이 가장 강한 곳/);
assert.throws(()=>g.action('OCULUS_RESONANCE',{point:other.id}));
// A kept kind is never collected by a catch.
assert.equal(g.resonancePoint('ANEMO_FOREST_ROOTS'),null,'a puzzle oculus is not a resonance one');
// Every resonance oculus is collected once with its region's oculus, and the save stays valid.
const before={mond:g.itemCount('KEY_CRPG_ANEMOCULUS'),geo:g.itemCount('KEY_CRPG_GEOCULUS')};let mond=0,geo=0;
for(const p of left){g.action('OPERATOR_DEBUG',{op:'travel',map:p.map});g.action('OCULUS_RESONANCE',{point:p.id});if(p.geo)geo++;else mond++;
 assert.match(g.actionReason('OCULUS_RESONANCE',{point:p.id}),/이미 회수한/,'once only');}
assert.equal(g.itemCount('KEY_CRPG_ANEMOCULUS'),before.mond+mond);assert.equal(g.itemCount('KEY_CRPG_GEOCULUS'),before.geo+geo);
assert.equal(g.oculusSummary().collected,mond);assert.equal(g.geoOculusSummary().collected,geo);
assert.equal(g.resonanceLeft().length,0);assert.equal(g.resonanceView(),null,'nothing left: no mark');
g.validateSave(JSON.parse(JSON.stringify(g.s)));
console.log(JSON.stringify({ok:true,resonance:left.length,mond,geo}));
