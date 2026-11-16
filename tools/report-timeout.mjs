import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['tools/build-bug-report.mjs'],{stdio:'inherit',detached:true});
const timer=setTimeout(()=>{console.error('Report rendering exceeded 45 seconds; stopping its process group.');process.kill(-child.pid,'SIGTERM');process.exitCode=1;},45000);
child.on('exit',code=>{clearTimeout(timer);process.exitCode=code||process.exitCode||0;});