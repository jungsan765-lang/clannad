'use strict';
// The production relationship bootstrap and the fixed clock the balance checks run under.
const NativeDate=Date,NOW=1791615600000,FixedDate=class extends NativeDate{constructor(...args){super(...(args.length?args:[NOW]));}static now(){return NOW;}};
function productionBootstrap(env){if(!env.R.prototype.__relationshipsInstalled){const rel=env.c?.CRPGRelationships;if(!rel)throw new Error('production relationship module is missing');rel.install(env.api,{events:rel.catalogFromDB(env.db),activities:rel.activitiesFromDB(env.db)});}return env;}
module.exports={productionBootstrap,FixedDate,NOW};
