import {categories,statuses,ruleKeys,type State,type Backup,type Policy} from './types';
import {validDate} from './policy';
import {total,sum} from './money';
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const text=(x:unknown,max=2000)=>typeof x==='string'&&x.length<=max;
const number=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>=0;
const array=(x:unknown,max=10000):x is unknown[]=>Array.isArray(x)&&x.length<=max;
const unique=(xs:string[])=>new Set(xs).size===xs.length;
function fail(message:string):never {throw new Error(message);}
export function samePolicy(a:Policy,b:Policy):boolean {
  const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):object(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value;
  return JSON.stringify(canonical({...a,createdAt:''}))===JSON.stringify(canonical({...b,createdAt:''}));
}
export function validatePolicy(p: unknown): asserts p is Policy {
  if(!object(p)||!number(p.version)||!p.version||!object(p.rules)||!object(p.dailyLimits)||!object(p.monthlyLimits)||!object(p.glCodes)||!object(p.allowedDepartments)||!object(p.allowedGrades)||!array(p.holidays)||!array(p.receiptCategories)||typeof p.secondLevel!=='boolean'||![p.mileageRate,p.perDiem,p.secondLevelThreshold].every(number))fail('Invalid policy structure.');
  for(const k of ruleKeys){const r=p.rules[k];if(!object(r)||typeof r.enabled!=='boolean'||!number(r.value)||!text(r.explanation))fail(`Invalid policy rule: ${k}.`);}
  for(const c of categories)if(!number(p.dailyLimits[c])||!number(p.monthlyLimits[c])||!text(p.glCodes[c],40))fail(`Invalid category settings: ${c}.`);
  for(const a of [...Object.values(p.allowedDepartments),...Object.values(p.allowedGrades),p.receiptCategories])if(!array(a)||!a.every(c=>categories.includes(c as never)))fail('Unknown category in policy.');
  if(!p.holidays.every(d=>typeof d==='string'&&validDate(d)))fail('Invalid holiday date.');
}
export function validateState(value: unknown): State {
  if(!object(value)||value.schemaVersion!==2||!array(value.users,100)||!array(value.claims)||!array(value.policies,1000)||!array(value.audit,100000)||!array(value.batches)||!object(value.counters)||!object(value.notificationsRead)||!number(value.revision)||!text(value.createdAt)||!['light','dark'].includes(String(value.theme)))fail('Unrecognised or damaged ClaimEase data. Existing data has not been changed.');
  const s=value as unknown as State;
  if(!object(s.locks)||Object.values(s.locks).some(l=>!object(l)||!number(l.failures)||!number(l.until)))fail('Invalid saved login lock data.');
  if(s.session!==null&&(!object(s.session)||!text(s.session.userId,100)||!number(s.session.createdAt)||!number(s.session.activityAt)||!s.users.some(u=>u.id===s.session?.userId)))fail('Invalid saved session data.');
  if(Object.entries(s.counters).some(([year,n])=>!/^\d{4}$/.test(year)||!number(n)))fail('Invalid claim counters.');
  if(!s.policies.length)fail('At least one policy is required.');
  s.policies.forEach(validatePolicy);
  for(const u of s.users)if(!object(u)||![u.id,u.name,u.department,u.grade].every(x=>text(x,120))||!text(u.email,200)||!u.email.endsWith('.example')||!['Employee','Manager','Finance'].includes(u.role)||!/^\w{32}$/.test(u.salt)||! /^[a-f0-9]{64}$/.test(u.hash))fail('Invalid fictional account in backup.');
  if(!unique(s.users.map(u=>u.id))||!unique(s.users.map(u=>u.email))||!unique(s.claims.map(c=>c.id))||!unique(s.claims.map(c=>c.number))||!unique(s.policies.map(p=>String(p.version)))||!unique(s.audit.map(a=>a.id))||!unique(s.batches.map(b=>b.id)))fail('Duplicate identifiers in saved data.');
  for(const c of s.claims) {
    if(!object(c)||!text(c.id,100)||!/^CLM-\d{4}-\d{4,}$/.test(c.number)||![c.title,c.costCentre,c.department,c.grade,c.justification,c.tripStart,c.tripEnd,c.currency,c.submittedBy,c.createdAt,c.updatedAt].every(x=>text(x))||!statuses.includes(c.status)||!s.users.some(u=>u.id===c.ownerId)||!array(c.lines,200)||!array(c.managerApprovals,2)||!unique(c.lines.map(l=>l.id)))fail('Invalid claim header or line list.');
    if(c.policyVersion!==undefined&&!s.policies.some(p=>p.version===c.policyVersion))fail('Claim references a missing policy version.');
    for(const l of c.lines) {
      if(!object(l)||![l.id,l.date,l.vendor,l.description,l.notes,l.attendees].every(x=>text(x))||!categories.includes(l.category)||![l.amount,l.quantity,l.rate,l.foreignAmount,l.fxRate].every(number)||(l.tax!==undefined&&!number(l.tax))||!['expense','mileage','perdiem'].includes(l.kind)||!['personal card','cash','UPI'].includes(l.payment)||!['INR','USD','EUR','GBP'].includes(l.currency)||!array(l.receipts,10)||!([undefined,'approved','rejected'].includes(l.decision)))fail('Invalid expense line or amount.');
      for(const r of l.receipts)if(!object(r)||!text(r.id,100)||!text(r.name,200)||!number(r.size)||r.size>=204800||! /^[a-f0-9]{64}$/.test(r.hash))fail('Invalid receipt metadata.');
    }
    const [,year,seq]=c.number.split('-');if(!number(s.counters[year])||s.counters[year]<Number(seq))fail('Claim counter is lower than an existing claim number.');
  }
  for(const a of s.audit)if(!object(a)||![a.id,a.claimId,a.actorId,a.actorName,a.time,a.comment].every(x=>text(x))||!statuses.includes(a.status)||!['Employee','Manager','Finance'].includes(a.role))fail('Invalid audit entry.');
  sum(s.claims.map(c=>total(c.lines)));
  for(const b of s.batches){
    if(!object(b)||![b.id,b.date,b.mode,b.reference,b.createdBy,b.paidAt].every(x=>text(x))||!validDate(b.date)||!number(b.total)||!array(b.claimIds)||!unique(b.claimIds)||!b.claimIds.every(id=>s.claims.some(c=>c.id===id&&c.status==='Paid')))fail('Invalid payment batch.');
    if(b.total!==total(s.claims.filter(c=>b.claimIds.includes(c.id)).flatMap(c=>c.lines),true))fail('Payment batch total does not equal its approved claims.');
  }
  const paidIds=s.batches.flatMap(b=>b.claimIds);if(!unique(paidIds))fail('A paid claim appears in more than one batch.');
  return s;
}
export function migrate(input: unknown): State {
  if(!object(input))return fail('Saved data is not an object.');
  if(input.schemaVersion===1)input={...input,schemaVersion:2,notificationsRead:{},revision:typeof input.revision==='number'?input.revision:0};
  return validateState(input);
}
export function validateBackup(raw: string): Backup {
  if(raw.length>30*1024*1024)fail('Backup exceeds the 30 MB import limit.');
  let b:unknown;try{b=JSON.parse(raw);}catch{return fail('This file is not valid JSON. Nothing was imported.');}
  if(!object(b)||b.format!=='ClaimEase'||b.version!==2||!text(b.exportedAt)||!object(b.data)||!array(b.receipts,10000))fail('Choose a ClaimEase version 2 JSON backup.');
  validateState({...b.data,session:null,locks:{}});
  const backup=b as unknown as Backup;
  if(!unique(backup.receipts.map(r=>r.id)))fail('Duplicate receipt identifiers.');
  for(const r of backup.receipts)if(!object(r)||!text(r.id,100)||!text(r.data,300000)||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(r.data)||! /^[a-f0-9]{64}$/.test(r.hash))fail('Invalid receipt image in backup.');
  for(const c of backup.data.claims)for(const l of c.lines)for(const r of l.receipts)if(!backup.receipts.some(x=>x.id===r.id&&x.hash===r.hash))fail('A receipt referenced by a claim is missing from this backup.');
  return backup;
}