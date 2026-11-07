import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Server } from 'node:http';

if (process.env['FINANCE_TEST_DB'] !== '1') throw new Error('Run npm test to use an isolated database.');
process.env['APP_ORIGIN'] = 'http://localhost:3000';
process.env['NODE_ENV'] = 'test';
execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'),'migrate','deploy'], { env: process.env, stdio: 'pipe' });
const { default: app } = await import('../src/app.js');
const { default: prisma } = await import('../src/config/prisma.js');
let server: Server, base: string;
type Client = { cookie: string };
const alice: Client = { cookie: '' }, bob: Client = { cookie: '' }, analyst: Client = { cookie: '' }, viewer: Client = { cookie: '' };
const password = 'correct horse battery 123';
async function request(client: Client, path: string, method='GET', body?: unknown, origin: string|null='http://localhost:3000') {
  const response = await fetch(base+'/api'+path, { method, headers: { ...(client.cookie?{cookie:client.cookie}:{}), ...(origin?{origin}:{}), ...(body!==undefined?{'content-type':'application/json'}:{}) }, body: body===undefined?undefined:JSON.stringify(body) });
  const cookie=response.headers.get('set-cookie');if(cookie)client.cookie=cookie.split(';')[0]!;
  const text=await response.text();
  const data=response.headers.get('content-type')?.includes('application/json')&&text?JSON.parse(text):text;
  return { status:response.status, data, headers:response.headers };
}
before(async()=>{server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;});
after(async()=>{await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));await prisma.$disconnect();});
const date=new Date().toISOString().slice(0,10);
const range=`start=${date.slice(0,7)}-01&end=${date}`;
let recordId: string;

test('registration creates isolated workspaces and HttpOnly sessions; origin checks protect all writes',async()=>{
  assert.equal((await request(alice,'/auth/register','POST',{name:'Alice',email:'alice@example.com',password,workspace:'Alpha'},'https://evil.example')).status,403);
  assert.equal((await request(alice,'/auth/register','POST',{},null)).status,403);
  const a=await request(alice,'/auth/register','POST',{name:'Alice',email:'ALICE@example.com',password,workspace:'Alpha'});
  assert.equal(a.status,201);assert.match(a.headers.get('set-cookie')!,/HttpOnly/);assert.match(a.headers.get('set-cookie')!,/SameSite=Lax/);assert.equal(a.data.token,undefined);
  assert.equal((await request(bob,'/auth/register','POST',{name:'Bob',email:'bob@example.com',password,workspace:'Beta'})).status,201);
  const me=(await request(alice,'/auth/me')).data,other=(await request(bob,'/auth/me')).data;
  assert.equal(me.role,'ADMIN');assert.equal(me.user.email,'alice@example.com');assert.equal(me.workspace.currency,'INR');assert.notEqual(me.workspace.id,other.workspace.id);
  assert.equal(me.user.passwordHash,undefined);
  assert.equal((await request(alice,'/auth/switch','POST',{workspaceId:other.workspace.id})).status,403);
  assert.equal((await request({cookie:''},'/records')).status,401);
});
test('record amounts preserve paise, exports neutralize formulas, and optimistic edits reject stale versions',async()=>{
  const created=await request(alice,'/records','POST',{amount:'1250.50',type:'INCOME',category:'Consulting',description:'=SUM(A1)',date});
  assert.equal(created.status,201);assert.equal(created.data.amountMinor,'125050');recordId=created.data.id;
  assert.equal((await request(bob,'/records/'+recordId)).status,404);
  assert.equal((await request(bob,'/records/'+recordId,'PATCH',{amount:'5',type:'INCOME',category:'Other',description:'Other',date,version:1})).status,404);
  assert.equal((await request(bob,'/records/'+recordId,'DELETE',{version:1})).status,404);
  const report=(await request(alice,'/dashboard?'+range)).data;
  assert.equal(report.totals.income,'125050');assert.equal(report.totals.balance,'125050');assert.ok(report.series.length>=1);
  assert.equal((await request(bob,'/dashboard?'+range)).data.totals.count,0);
  const csv=await request(alice,'/records/export?'+range);assert.equal(csv.status,200);assert.match(csv.data,/'=SUM\(A1\)/);assert.match(csv.data,/1250\.50/);
  assert.equal((await request(alice,'/records/'+recordId,'PATCH',{amount:'0.10',type:'INCOME',category:'Consulting',description:'Updated',date,version:1})).status,200);
  assert.equal((await request(alice,'/records/'+recordId,'PATCH',{amount:'0.20',type:'INCOME',category:'Consulting',description:'Stale',date,version:1})).status,409);
  const second=await request(alice,'/records','POST',{amount:'0.20',type:'INCOME',category:'Consulting',description:'Twenty paise',date});assert.equal(second.status,201);
  assert.equal((await request(alice,'/dashboard?'+range)).data.totals.income,'30');
  assert.equal((await request(alice,'/records/'+recordId,'DELETE',{version:2})).status,204);
  assert.equal((await request(alice,'/dashboard?'+range)).data.totals.income,'20');
  assert.equal((await request(bob,'/records/'+recordId+'/restore','POST',{})).status,404);
  assert.equal((await request(alice,'/records/'+recordId+'/restore','POST',{})).status,200);
  assert.equal((await request(alice,'/dashboard?'+range)).data.totals.income,'30');
});
test('validation rejects invalid amounts, dates, pagination, sort and injected scope',async()=>{
  for(const amount of ['-1','0','1.001','1e6','NaN',1.2])assert.equal((await request(alice,'/records','POST',{amount,type:'EXPENSE',category:'Other',description:'Invalid',date})).status,400);
  assert.equal((await request(alice,'/records','POST',{amount:'1',type:'EXPENSE',category:'Other',description:'Invalid',date:'2025-02-30'})).status,400);
  assert.equal((await request(alice,'/records','POST',{amount:'1',type:'EXPENSE',category:'Other',description:'Invalid',date,workspaceId:'other'})).status,400);
  for(const query of ['page=-1','page=1x','limit=101','sort=unsafe','type=OTHER','start=2020-01-02&end=2020-01-01'])assert.equal((await request(alice,'/records?'+query)).status,400);
  assert.equal((await request(alice,'/dashboard?start=2000-01-01&end='+date)).status,400);
  const large=await request(alice,'/records','POST',{amount:'999999999.99',type:'EXPENSE',category:'Large',description:'Large decimal amount',date});
  assert.equal(large.status,201);assert.equal(large.data.amountMinor,'99999999999');
  const page=(await request(alice,'/records?limit=1&sort=amount-desc')).data;assert.equal(page.data[0].id,large.data.id);assert.equal(page.totalPages,3);
  await request(alice,'/records/'+large.data.id,'DELETE',{version:1});
});
async function joinTeam(client: Client,email: string,role: string){
  const invitation=await request(alice,'/team/invite','POST',{email,role});assert.equal(invitation.status,201);
  const token=invitation.data.url.split('/').at(-1);
  assert.equal((await request(client,'/auth/register','POST',{name:role,email,password,invitation:token})).status,201);
  assert.equal((await request(client,'/team/invitation/'+token)).status,404);
}
test('invitations are email-bound, expiring, single use; roles apply to existing sessions',async()=>{
  await joinTeam(analyst,'analyst@example.com','ANALYST');await joinTeam(viewer,'viewer@example.com','VIEWER');
  assert.equal((await request(analyst,'/records')).status,200);assert.equal((await request(analyst,'/team')).status,403);
  assert.equal((await request(analyst,'/records','POST',{amount:'1',type:'INCOME',category:'Other',description:'Forbidden',date})).status,403);
  assert.equal((await request(viewer,'/records')).status,403);assert.equal((await request(viewer,'/records/export')).status,403);assert.equal((await request(viewer,'/dashboard/activity')).status,403);
  assert.equal((await request(viewer,'/dashboard?'+range)).status,200);assert.equal((await request(viewer,'/dashboard/export?'+range)).status,200);
  const members=(await request(alice,'/team')).data.members;
  const target=members.find((m:any)=>m.user.email==='analyst@example.com');
  assert.equal((await request(bob,'/team/'+target.id,'PATCH',{role:'ADMIN'})).status,404);
  assert.equal((await request(alice,'/team/'+target.id,'PATCH',{role:'VIEWER'})).status,200);
  assert.equal((await request(analyst,'/records')).status,403);
  assert.equal((await request(alice,'/team/'+target.id,'PATCH',{isActive:false})).status,200);
  assert.equal((await request(analyst,'/dashboard?'+range)).status,403);
  const owner=members.find((m:any)=>m.user.email==='alice@example.com');
  assert.equal((await request(alice,'/team/'+owner.id,'PATCH',{role:'VIEWER'})).status,409);
  assert.equal((await request(alice,'/team/'+owner.id,'PATCH',{isActive:false})).status,409);
  const invitation=await request(alice,'/team/invite','POST',{email:'bound@example.com',role:'VIEWER'});
  const token=invitation.data.url.split('/').at(-1);
  assert.equal((await request(bob,'/team/accept','POST',{token})).status,400);
  assert.equal((await request(bob,'/auth/register','POST',{name:'Wrong',email:'wrong@example.com',password,invitation:token})).status,400);
  assert.equal(await prisma.user.count({where:{email:'wrong@example.com'}}),0);
  await prisma.invitation.update({where:{id:invitation.data.id},data:{expiresAt:new Date(0)}});
  assert.equal((await request(bob,'/team/invitation/'+token)).status,404);
});
test('concurrent administrators cannot remove every administrator',async()=>{
  await request(alice,'/team/invite','POST',{email:'bob@example.com',role:'ADMIN'}).then(async r=>assert.equal((await request(bob,'/team/accept','POST',{token:r.data.url.split('/').at(-1)})).status,200));
  const members=(await request(alice,'/team')).data.members;
  const a=members.find((m:any)=>m.user.email==='alice@example.com'),b=members.find((m:any)=>m.user.email==='bob@example.com');
  const results=await Promise.all([request(alice,'/team/'+a.id,'PATCH',{role:'VIEWER'}),request(bob,'/team/'+b.id,'PATCH',{role:'VIEWER'})]);
  assert.equal(results.filter(r=>r.status===200).length,1);
  assert.ok(results.some(r=>r.status===409));
  const workspaceId=a.workspaceId;
  assert.equal(await prisma.membership.count({where:{workspaceId,role:'ADMIN',isActive:true}}),1);
});
test('demo sessions have separate synthetic data and expire without touching private workspaces',async()=>{
  const d1={cookie:''},d2={cookie:''};assert.equal((await request(d1,'/auth/demo','POST',{})).status,201);assert.equal((await request(d2,'/auth/demo','POST',{})).status,201);
  const m1=(await request(d1,'/auth/me')).data,m2=(await request(d2,'/auth/me')).data;assert.notEqual(m1.workspace.id,m2.workspace.id);assert.equal(m1.workspace.isDemo,true);
  assert.equal((await request(d1,'/records')).data.total,48);
  const r=(await request(d1,'/records')).data.data[0];assert.equal((await request(d2,'/records/'+r.id)).status,404);
  assert.equal((await request(d1,'/team/invite','POST',{email:'test@example.com',role:'ADMIN'})).status,403);
  await prisma.workspace.update({where:{id:m1.workspace.id},data:{expiresAt:new Date(0)}});
  assert.equal((await request(d1,'/records')).status,401);
  const {cleanupExpired}=await import('../src/services/demo.js');await cleanupExpired();
  assert.equal(await prisma.workspace.count({where:{id:m1.workspace.id}}),0);assert.equal((await request(d2,'/records')).data.total,48);
});
test('password changes revoke other sessions, logout revokes its token, and session expiry is enforced',async()=>{
  const current={cookie:''},other={cookie:''};
  assert.equal((await request(current,'/auth/login','POST',{email:'alice@example.com',password})).status,200);
  assert.equal((await request(other,'/auth/login','POST',{email:'alice@example.com',password})).status,200);
  assert.equal((await request(current,'/auth/password','POST',{currentPassword:password,newPassword:'another strong password 123'})).status,200);
  assert.equal((await request(other,'/auth/me')).status,401);
  const saved={cookie:current.cookie};assert.equal((await request(current,'/auth/logout','POST',{})).status,204);assert.equal((await request(saved,'/auth/me')).status,401);
  assert.equal((await request(current,'/auth/login','POST',{email:'alice@example.com',password})).status,401);
  await request(current,'/auth/login','POST',{email:'alice@example.com',password:'another strong password 123'});
  const {hashToken}=await import('../src/middleware/auth.js');await prisma.session.update({where:{id:hashToken(current.cookie.split('=')[1]!)},data:{expiresAt:new Date(0)}});
  assert.equal((await request(current,'/auth/me')).status,401);
});
