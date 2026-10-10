'use strict';
const at=Date.parse(process.env.CRPG_CALENDAR_START);
if(!Number.isFinite(at))throw new Error('CRPG_CALENDAR_START is required');
Date.now=()=>at;
