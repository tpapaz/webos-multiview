const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const child=spawn(process.execPath,[path.join(__dirname,'physical-candidate-foreground-child.cjs')],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let output='',error='',aliveAtCue=false;
const timer=setTimeout(()=>{child.kill();throw Error('Synthetic foreground session exceeded its local test bound');},5000);
child.stdout.on('data',bytes=>{output+=bytes;if(output.includes('ONE_SUBMISSION_INTENT')&&!output.includes('FOREGROUND_COLLECTION_COMPLETE'))aliveAtCue=child.exitCode===null;});
child.stderr.on('data',bytes=>{error+=bytes;});
child.on('close',code=>{clearTimeout(timer);assert.equal(code,0);assert.equal(error,'');assert(aliveAtCue);assert(output.indexOf('ONE_SUBMISSION_INTENT')<output.indexOf('FOREGROUND_COLLECTION_COMPLETE'));console.log('Foreground subprocess stays alive after cue through scheduled collection and closure; synthetic transport only');});
