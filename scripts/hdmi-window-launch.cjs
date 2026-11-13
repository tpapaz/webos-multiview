// Fixed launch authority from bounded read-only TV boot metadata. Never print IDs.
function launchPayload(bootBefore, uptime, bootAfter) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\n$/;
    if (!uuid.test(bootBefore) || bootBefore !== bootAfter) throw Error('boot changed or unreadable');
    // Linux /proc/uptime first field is boot elapsed time including suspend,
    // truncated to centiseconds. Flooring makes the native deadline conservative.
    const match = /^([0-9]{1,13})\.([0-9]{2}) [0-9]{1,15}\.[0-9]{2}\n$/.exec(uptime);
    if (!match) throw Error('boot clock format');
    const startBy = Number(match[1]) * 1000 + Number(match[2]) * 10 + 3000;
    if (!Number.isSafeInteger(startBy) || startBy <= 0) throw Error('boot clock range');
    return {acquireHdmi4: true, launchBootId: bootBefore.slice(0, -1), launchStartByBoottimeMs: startBy};
}
module.exports = {launchPayload};
