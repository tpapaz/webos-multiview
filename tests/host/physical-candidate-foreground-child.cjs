require('./physical-candidate-runner.test.cjs').trial({foregroundWait:true}).then(t=>{
    if(t.r.status!=='collected'||t.r.connections.length!==2||!t.r.connections.every(x=>x.closed))throw Error('foreground collection incomplete');
    console.log('FOREGROUND_COLLECTION_COMPLETE');
}).catch(()=>{console.error('Synthetic foreground test failed');process.exitCode=1;});
