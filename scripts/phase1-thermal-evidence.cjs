const {command}=require('./phase1-native-ssh.cjs');
function parseTemperatures(text) {
    const samples=[];
    for(const line of text.split('\n').filter(Boolean)) {
        const match=line.match(/^(\/sys\/class\/(?:thermal\/thermal_zone\d+\/temp|hwmon\/hwmon\d+\/temp\d+_input))\s+(-?\d+)$/);
        if(!match||samples.length>=32)throw new Error('Temperature counters unavailable');
        const milliCelsius=Number(match[2]);
        if(!Number.isSafeInteger(milliCelsius)||milliCelsius< -100000||milliCelsius>250000)
            throw new Error('Temperature counters unavailable');
        samples.push({source:match[1],celsius:milliCelsius/1000,sensorRole:'unknown'});
    }
    return {status:samples.length?'verified':'unknown',samples,
        scope:'read-only thermal/hwmon sysfs; sensor role and safe operating limits not established'};
}
async function readTemperatures(client) {
    const text=await command(client,'for file in /sys/class/thermal/thermal_zone[0-9]*/temp /sys/class/hwmon/hwmon[0-9]*/temp[0-9]*_input; do if test -r "$file"; then printf "%s " "$file"; cat "$file"; fi; done');
    return {hostUtc:new Date().toISOString(),...parseTemperatures(text)};
}
module.exports={parseTemperatures,readTemperatures};
