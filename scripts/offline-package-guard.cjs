// Offline packaging only. Never load a device profile or open a network socket.
const net=require('node:net'),tls=require('node:tls'),dns=require('node:dns'),dgram=require('node:dgram');
let attempts=0;
const deny=()=>{attempts++;throw Error('Offline packaging prohibits network operations');};
net.Socket.prototype.connect=deny;net.connect=net.createConnection=deny;tls.connect=deny;dgram.createSocket=deny;
for(const key of Object.keys(dns))if(typeof dns[key]==='function'&&/^(lookup|resolve|reverse)/.test(key))dns[key]=deny;
for(const key of Object.keys(dns.promises))if(typeof dns.promises[key]==='function'&&/^(lookup|resolve|reverse)/.test(key))dns.promises[key]=deny;
if(typeof globalThis.fetch==='function')globalThis.fetch=deny;
process.once('exit',()=>console.log('OFFLINE_PACKAGE_NETWORK_ATTEMPTS:'+attempts));
