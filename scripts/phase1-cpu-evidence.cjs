// Numeric counters only; process identities and raw /proc text are never exported.
function counters(text) {
    const values=text.trim().split(/\s+/);
    if(values.length!==6||values.some(v=>!/^\d+$/.test(v)||!Number.isSafeInteger(Number(v))))
        throw new Error('CPU counters unavailable');
    const [total,idle,cores,appTicks,threads,rssKiB]=values.map(Number);
    if(!cores||cores>256||idle>total||!threads)throw new Error('CPU counters unavailable');
    return {total,idle,cores,appTicks,threads,rssKiB};
}
function interval(before,after) {
    const total=after.total-before.total,idle=after.idle-before.idle,ticks=after.appTicks-before.appTicks;
    if(total<=0||idle<0||idle>total||ticks<0||before.cores!==after.cores)
        throw new Error('CPU interval unavailable');
    const round=n=>Math.round(n*100)/100;
    return {systemBusyPct:round(100*(total-idle)/total),appOneCorePct:round(100*after.cores*ticks/total),
        cores:after.cores,appRssKiB:after.rssKiB,appThreads:after.threads};
}
module.exports={counters,interval};
