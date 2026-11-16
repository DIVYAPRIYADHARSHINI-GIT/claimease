import type {State,User,Claim,Policy,Status,ReceiptRef,Backup,Batch,Finding} from './types';
import {seedState,todayLocal,newLine} from './sample';
import {hashPassword,failedAttempt,locked} from './auth';
import {canSee,sessionValid,transition,decideLine} from './workflow';
import {checkClaim,validDate} from './policy';
import {nextNumber,total} from './money';
import {migrate,validateBackup,validatePolicy,validateState,samePolicy} from './backup';
import {receiptTransaction,compressReceipt,sha256,blobToData,dataToBlob} from './receipts';
export const STORAGE_KEY='claimease.v2';
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
export interface ClaimStore {
  init():Promise<void>; view():State; accounts():User[]; actor():User|undefined;
  signIn(email:string,password:string):Promise<void>; signOut():void; touch():void;
  create(sourceId?:string):Claim; saveDraft(claim:Claim):void; deleteDraft(id:string):void;
  change(id:string,next:Status,comment:string):void; lineDecision(id:string,lineId:string,decision:'approved'|'rejected',comment:string):void;
  findings(claim:Claim):Finding[]; policyFor(claim?:Claim):Policy; setPolicy(policy:Policy):void;
  pay(ids:string[],date:string,mode:string,reference:string,expectedTotal:number):Batch;
  addReceipt(file:File):Promise<ReceiptRef>; receipt(id:string):Promise<Blob|undefined>;
  backup():Promise<string>; importBackup(raw:string):Promise<string>; reset(sample:boolean):Promise<void>;
  setTheme(theme:'light'|'dark'):void; storageUsage():Promise<{metadata:number;receipts:number;quota:number;usage:number}>;
  rawRecovery():string; markRead():void;
}
export class BrowserClaimStore implements ClaimStore {
  private data!:State;
  private raw='';
  async init():Promise<void> {
    let saved:string|null;
    try{saved=localStorage.getItem(STORAGE_KEY);this.raw=saved||'';}catch{throw new Error('Browser storage is disabled. Enable local storage for this site, then reload. Nothing has been changed.');}
    if(saved) {
      try{this.data=migrate(JSON.parse(saved));}catch{throw new Error('Saved data is damaged or from an unsupported version. Your original data is preserved. Download it before attempting recovery.');}
      try{const test=STORAGE_KEY+'.probe';localStorage.setItem(test,'1');localStorage.removeItem(test);}catch{throw new Error('Browser storage is full or read-only. Existing data is preserved. Download recovery data, free space and reload.');}
    } else {
      const seeded=await seedState(true,async(id,blob)=>{await receiptTransaction('readwrite',s=>s.put(blob,id));});
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(seeded));this.data=seeded;}catch{throw new Error('Browser storage is full or disabled. Sample data could not be saved. Enable storage and reload.');}
    }
  }
  rawRecovery():string{return this.raw;}
  private requireActor():User {const actor=this.actor();if(!actor||!sessionValid(this.data.session,Date.now()))throw new Error('Your session has expired. Sign in again.');return actor;}
  actor():User|undefined{return this.data?.users.find(u=>u.id===this.data.session?.userId);}
  accounts():User[]{return this.data.users.map(u=>({...u,salt:'',hash:''}));}
  view():State {
    const actor=this.actor();const claims=actor?this.data.claims.filter(c=>canSee(c,actor,this.data.users)):[];
    return copy({...this.data,users:this.accounts(),claims,audit:actor?this.data.audit.filter(a=>claims.some(c=>c.id===a.claimId)):[],batches:actor?.role==='Finance'?this.data.batches:[],locks:{},counters:{}});
  }
  private commit(next:State):void {
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw){let revision:number;try{revision=JSON.parse(raw).revision;}catch{throw new Error('Saved data changed unexpectedly. Reload before saving. Your editor has not been cleared.');}if(revision!==this.data.revision)throw new Error('Another tab changed this browser’s data. Export your current work or reload before saving.');}
    const nextState={...next,revision:this.data.revision+1};
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(nextState));}catch{throw new Error('Browser storage is full or disabled. Your changes have not been saved. Keep this page open, export a backup and free space.');}
    this.data=nextState;
  }
  async signIn(email:string,password:string):Promise<void> {
    const key=email.trim().toLowerCase(),now=Date.now(),user=this.data.users.find(u=>u.email===key),lock=this.data.locks[key];
    if(locked(lock,now))throw new Error('Email or password is incorrect');
    const hash=await hashPassword(password,user?.salt||'00000000000000000000000000000000');
    if(!user||user.hash!==hash){this.commit({...this.data,locks:{...this.data.locks,[key]:failedAttempt(lock,now)}});throw new Error('Email or password is incorrect');}
    const locks={...this.data.locks};delete locks[key];this.commit({...this.data,locks,session:{userId:user.id,createdAt:now,activityAt:now}});
  }
  signOut():void {this.commit({...this.data,session:null});}
  touch():void {this.requireActor();if(this.data.session&&Date.now()-this.data.session.activityAt>10000)this.commit({...this.data,session:{...this.data.session,activityAt:Date.now()}});}
  private owned(id:string):Claim {const c=this.data.claims.find(c=>c.id===id),actor=this.requireActor();if(!c||!canSee(c,actor,this.data.users))throw new Error('This claim is not available to your account.');return copy(c);}
  policyFor(claim?:Claim):Policy {return copy(this.data.policies.find(p=>p.version===claim?.policyVersion)||this.data.policies[this.data.policies.length-1]);}
  findings(claim:Claim):Finding[] {const actor=this.requireActor();if(claim.ownerId!==actor.id&&!this.data.claims.some(c=>c.id===claim.id&&canSee(c,actor,this.data.users)))throw new Error('Claim access denied.');return checkClaim(copy(claim),this.policyFor(claim),this.data.claims,todayLocal());}
  private audit(next:State,c:Claim,actor:User,comment:string):void {next.audit.push({id:crypto.randomUUID(),claimId:c.id,actorId:actor.id,actorName:actor.name,role:actor.role,time:new Date().toISOString(),status:c.status,comment});}
  create(sourceId?:string):Claim {
    const actor=this.requireActor();if(actor.role!=='Employee')throw new Error('Only employees create claims.');
    const now=new Date().toISOString(),year=todayLocal().slice(0,4),sequence=nextNumber(this.data.counters,year),source=sourceId?this.owned(sourceId):undefined;
    const c:Claim={id:crypto.randomUUID(),number:sequence.number,ownerId:actor.id,submittedBy:actor.id,title:source?`${source.title} (copy)`:'',department:actor.department,grade:actor.grade,costCentre:source?.costCentre||'',tripStart:'',tripEnd:'',currency:'INR',status:'Draft',lines:source?source.lines.map(l=>({...l,id:crypto.randomUUID(),decision:undefined,decisionComment:undefined})):[newLine(todayLocal(),this.policyFor().mileageRate)],justification:'',createdAt:now,updatedAt:now,managerApprovals:[]};
    const next=copy(this.data);next.counters=sequence.counters;next.claims.push(c);this.audit(next,c,actor,source?'Duplicated as a new draft; policy and approvals reset.':'Draft created.');this.commit(next);return copy(c);
  }
  saveDraft(claim:Claim):void {
    const actor=this.requireActor(),saved=this.owned(claim.id);
    if(actor.role!=='Employee'||saved.ownerId!==actor.id||!['Draft','Returned for correction'].includes(saved.status))throw new Error('Only your draft or returned claim can be edited.');
    const c:Claim={...copy(claim),id:saved.id,number:saved.number,ownerId:saved.ownerId,submittedBy:saved.submittedBy,department:saved.department,grade:saved.grade,status:saved.status,policyVersion:saved.policyVersion,managerApprovals:saved.managerApprovals,createdAt:saved.createdAt,updatedAt:new Date().toISOString()};
    c.lines=c.lines.map(l=>({...l,decision:undefined,decisionComment:undefined}));
    const next=copy(this.data);next.claims=next.claims.map(x=>x.id===c.id?c:x);validateState(next);this.audit(next,c,actor,'Expense draft saved.');this.commit(next);
  }
  deleteDraft(id:string):void {const actor=this.requireActor(),c=this.owned(id);if(actor.id!==c.ownerId||c.status!=='Draft')throw new Error('Only your own draft can be deleted.');const next=copy(this.data);next.claims=next.claims.filter(c=>c.id!==id);this.audit(next,c,actor,'Draft deleted. Claim number permanently retired; audit retained.');this.commit(next);}
  change(id:string,status:Status,comment:string):void {
    const actor=this.requireActor(),c=this.owned(id),policy=this.policyFor(c);
    if(status==='Paid')throw new Error('Use a balanced payment batch to mark claims paid.');
    if(status==='Submitted') {
      const findings=checkClaim(c,policy,this.data.claims,todayLocal());
      if(findings.some(f=>f.severity==='Block'))throw new Error('Resolve all Block findings before submitting.');
      if(findings.some(f=>f.severity==='Warn')&&!c.justification.trim())throw new Error('A justification is required for policy warnings.');
      c.policyVersion=policy.version;c.submittedAt=new Date().toISOString();
    }
    const changed=transition(c,actor,status,comment,policy,this.data.users);changed.updatedAt=new Date().toISOString();
    const next=copy(this.data);next.claims=next.claims.map(x=>x.id===id?changed:x);this.audit(next,changed,actor,comment.trim()||(changed.status==='Submitted'&&status==='Manager approved'?'First-level approved; awaiting a different assigned manager.':`Status changed to ${status}.`));this.commit(next);
  }
  lineDecision(id:string,lineId:string,decision:'approved'|'rejected',comment:string):void {const actor=this.requireActor(),c=decideLine(this.owned(id),actor,lineId,decision,comment,this.data.users),next=copy(this.data);next.claims=next.claims.map(x=>x.id===id?c:x);this.audit(next,c,actor,`Line ${c.lines.findIndex(l=>l.id===lineId)+1} ${decision}. ${comment}`);this.commit(next);}
  setPolicy(p:Policy):void {if(this.requireActor().role!=='Finance')throw new Error('Only Finance can edit policies.');validatePolicy(p);const next=copy(this.data),policy={...copy(p),version:Math.max(...next.policies.map(x=>x.version))+1,createdAt:new Date().toISOString()};next.policies.push(policy);this.commit(next);}
  pay(ids:string[],date:string,mode:string,reference:string,expectedTotal:number):Batch {
    const actor=this.requireActor();if(actor.role!=='Finance')throw new Error('Only Finance can create payment batches.');
    if(!ids.length||new Set(ids).size!==ids.length||!validDate(date)||date>todayLocal()||!reference.trim()||!['Bank transfer','UPI','Cash'].includes(mode))throw new Error('Select claims, a valid payment date, mode and reference.');
    const claims=ids.map(id=>this.owned(id));if(claims.some(c=>c.status!=='Finance approved'))throw new Error('Every claim must be Finance approved and not already paid.');
    const amount=total(claims.flatMap(c=>c.lines),true);if(amount!==expectedTotal)throw new Error('Batch total does not equal its approved claim amounts.');
    const now=new Date().toISOString(),batch:Batch={id:`PAY-${date.replaceAll('-','')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`,date,mode,reference:reference.trim(),claimIds:ids,total:amount,createdBy:actor.id,paidAt:now},next=copy(this.data);
    for(const c of claims){const paid=transition(c,actor,'Paid','Payment recorded',this.policyFor(c),this.data.users);paid.updatedAt=now;next.claims=next.claims.map(x=>x.id===c.id?paid:x);this.audit(next,paid,actor,`Payment recorded in ${batch.id}; ${mode}, reference ${reference}.`);}next.batches.push(batch);this.commit(next);return batch;
  }
  async addReceipt(file:File):Promise<ReceiptRef> {this.requireActor();const blob=await compressReceipt(file),hash=await sha256(blob),id=crypto.randomUUID();await receiptTransaction('readwrite',s=>s.put(blob,id));return {id,hash,name:file.name.slice(0,200),size:blob.size};}
  async receipt(id:string):Promise<Blob|undefined> {this.requireActor();if(!this.view().claims.some(c=>c.lines.some(l=>l.receipts.some(r=>r.id===id))))throw new Error('Receipt is not available to your account.');return receiptTransaction('readonly',s=>s.get(id));}
  async backup():Promise<string> {
    if(this.requireActor().role!=='Finance')throw new Error('Only Finance can export a full-browser backup.');const data=copy(this.data);const receipts:Backup['receipts']=[];
    for(const ref of new Map(data.claims.flatMap(c=>c.lines.flatMap(l=>l.receipts)).map(r=>[r.id,r])).values()){const blob=await receiptTransaction<Blob|undefined>('readonly',s=>s.get(ref.id));if(!blob)throw new Error(`Receipt ${ref.name} is missing. Backup was not marked complete.`);receipts.push({id:ref.id,data:await blobToData(blob),hash:ref.hash});}
    const exportedAt=new Date().toISOString();data.lastBackup=exportedAt;const {session:_,locks:__,...safe}=data;const out:Backup={format:'ClaimEase',version:2,exportedAt,data:safe,receipts};this.commit({...this.data,lastBackup:exportedAt});return JSON.stringify(out,null,2);
  }
  async importBackup(raw:string):Promise<string> {
    if(this.requireActor().role!=='Finance')throw new Error('Only Finance can import a full-browser backup.');const backup=validateBackup(raw),next=copy(this.data);
    for(const p of backup.data.policies){const existing=next.policies.find(x=>x.version===p.version);if(existing&&!samePolicy(existing,p))throw new Error(`Policy v${p.version} conflicts with this browser. Restore in a new browser profile after Start fresh; nothing was overwritten.`);if(!existing)next.policies.push(p);}
    for(const u of backup.data.users){const existing=next.users.find(x=>x.id===u.id);if(existing&&(existing.email!==u.email||existing.role!==u.role))throw new Error('Account identifiers conflict. Nothing was imported.');if(!existing)next.users.push(u);}
    const added=backup.data.claims.filter(c=>!next.claims.some(x=>x.id===c.id||x.number===c.number));next.claims.push(...added);
    for(const a of backup.data.audit)if(!next.audit.some(x=>x.id===a.id))next.audit.push(a);
    for(const b of backup.data.batches)if(!next.batches.some(x=>x.id===b.id)&&b.claimIds.every(id=>next.claims.some(c=>c.id===id&&c.status==='Paid')))next.batches.push(b);
    for(const [y,n] of Object.entries(backup.data.counters))next.counters[y]=Math.max(next.counters[y]||0,n);
    validateState(next);
    const written:string[]=[];
    try {
      for(const r of backup.receipts){const blob=dataToBlob(r.data);if(await sha256(blob)!==r.hash)throw new Error('Receipt hash verification failed. Nothing was imported.');const existing=await receiptTransaction<Blob|undefined>('readonly',s=>s.get(r.id));if(existing){if(await sha256(existing)!==r.hash)throw new Error('Receipt identifier conflict. Existing images were not overwritten.');}else{await receiptTransaction('readwrite',s=>s.put(blob,r.id));written.push(r.id);}}
      this.commit(next);
    }catch(error){for(const id of written)await receiptTransaction('readwrite',s=>s.delete(id));throw error;}
    return `Imported ${added.length} claims. Skipped ${backup.data.claims.length-added.length} existing claim identifiers; no existing claim or audit entry was overwritten.`;
  }
  async reset(sample:boolean):Promise<void> {
    const actor=this.requireActor();if(actor.role!=='Finance')throw new Error('Only Finance can reset the demo.');
    const fresh=await seedState(sample,async(id,blob)=>{const key=`${id}-${this.data.revision}`;await receiptTransaction('readwrite',s=>s.put(blob,key));});
    const next=copy(this.data);next.claims=fresh.claims;next.batches=fresh.batches;if(sample)next.policies.push({...fresh.policies[0],version:Math.max(...next.policies.map(p=>p.version))+1});
    const version=next.policies.at(-1)!.version,remap=new Map<string,string>();
    for(const c of next.claims){const old=c.id;c.id=crypto.randomUUID();remap.set(old,c.id);const seq=nextNumber(next.counters,todayLocal().slice(0,4));c.number=seq.number;next.counters=seq.counters;if(c.policyVersion)c.policyVersion=version;for(const l of c.lines)for(const r of l.receipts)r.id+=`-${this.data.revision}`;}
    next.batches=next.batches.map(b=>({...b,id:crypto.randomUUID(),claimIds:b.claimIds.map(id=>remap.get(id)!)}));
    next.audit.push(...fresh.audit.map(a=>({...a,id:crypto.randomUUID(),claimId:remap.get(a.claimId)!})));
    next.audit.push({id:crypto.randomUUID(),claimId:'system',actorId:actor.id,actorName:actor.name,role:actor.role,time:new Date().toISOString(),status:'Cancelled',comment:sample?'Demo claims replaced with a new sample dataset. Earlier audit retained.':'Started fresh; previous audit and retired claim numbers retained.'});
    this.commit(next);
  }
  setTheme(theme:'light'|'dark'):void {this.commit({...this.data,theme});}
  markRead():void {const actor=this.requireActor();this.commit({...this.data,notificationsRead:{...this.data.notificationsRead,[actor.id]:new Date().toISOString()}});}
  async storageUsage():Promise<{metadata:number;receipts:number;quota:number;usage:number}> {const metadata=new Blob([JSON.stringify(this.data)]).size;const keys=await receiptTransaction<IDBValidKey[]>('readonly',s=>s.getAllKeys());let receipts=0;for(const key of keys){const b=await receiptTransaction<Blob>('readonly',s=>s.get(key));receipts+=b?.size||0;}const estimate=await navigator.storage?.estimate?.();return {metadata,receipts,quota:estimate?.quota||5*1024*1024,usage:estimate?.usage||receipts};}
}
export const claimStore:ClaimStore=new BrowserClaimStore();