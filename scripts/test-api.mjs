import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
const directory=await mkdtemp(join(tmpdir(),'finance-api-'));
const child=spawn(process.execPath,['--import','tsx','--test','--test-concurrency=1','tests/api.test.ts'],{
  stdio:'inherit',env:{...process.env,DATABASE_URL:`file:${join(directory,'test.db')}`,FINANCE_TEST_DB:'1'},
});
const exitCode=await new Promise(resolve=>{child.on('exit',code=>resolve(code??1));child.on('error',err=>{console.error(err);resolve(1);});});
await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
process.exitCode=exitCode;
