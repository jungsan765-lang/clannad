'use strict';
// Read-only previous-source injection: product files on disk are never changed.
// Run from any directory: node docs/data/reaction_fixes_v01619/replay_counterfactual.cjs
// Expected exit 1: the old formula is supposed to fail the corrected assertion.
const fs=require('node:fs'),path=require('node:path');
const repository=path.resolve(__dirname,'../../..'),read=fs.readFileSync;
const archived=new Set(['runtime_rules.js','runtime_premium_v0148.js','runtime_mond_cards.js']);
process.env.REACTION_FILTER='direct talent scales but RX_AGGRAVATE addition does not at level 60';
delete process.env.REACTION_FIX_REPORT;
fs.readFileSync=function(file,...args){
 if(typeof file==='string'&&path.dirname(file)===path.join(repository,'source')&&archived.has(path.basename(file)))return read.call(this,path.join(__dirname,'baseline_v01618',path.basename(file)),...args);
 return read.call(this,file,...args);
};
require(path.join(repository,'tests/test_reaction_fixes_v01619.cjs'));
