import {describe,it,expect,beforeEach} from 'vitest';
import {BrowserClaimStore,STORAGE_KEY} from '../src/lib/store';
import {state,claim,line,policy} from './fixtures';
import {hashPassword} from '../src/lib/auth';
import type {State} from '../src/lib/types';
let values:Map<string,string>,store:BrowserClaimStore;
function storage(){return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>values.delete(k)};}
async function init(s:State=state()){values.set(STORAGE_KEY,JSON.stringify(s));store=new BrowserClaimStore();await store.init();return store;}
beforeEach(()=>{values=new Map();Object.defineProperty(globalThis,'localStorage',{value:storage(),configurable:true});});
describe('ClaimStore enforces workflow and storage',()=>{
 it('employee view never includes others claims',async()=>{const s=state();s.claims.push(claim({id:'c2',number:'CLM-2026-0002',ownerId:'u2'}));s.counters['2026']=2;await init(s);expect(store.view().claims.map(c=>c.id)).toEqual(['c1']);});
 it('public accounts never expose hashes',async()=>{await init();expect(store.accounts().every(u=>!u.hash&&!u.salt)).toBe(true);});
 it('employee cannot export full browser backup',async()=>{await init();await expect(store.backup()).rejects.toThrow(/Finance/);});
 it('employee cannot import full browser backup',async()=>{await init();const b={format:'ClaimEase',version:2,exportedAt:'2026-11-16',data:state(),receipts:[]};await expect(store.importBackup(JSON.stringify(b))).rejects.toThrow(/Finance/);});
 it('saving draft preserves immutable number/owner',async()=>{await init();const c=store.view().claims[0];c.number='CLM-2026-9999';c.ownerId='u2';store.saveDraft(c);expect(store.view().claims[0].number).toBe('CLM-2026-0001');expect(store.view().claims[0].ownerId).toBe('u1');});
 it('deleted number never reused and audit kept',async()=>{await init();store.deleteDraft('c1');const c=store.create();expect(c.number).toBe('CLM-2026-0002');expect(JSON.parse(values.get(STORAGE_KEY)!).audit.some((a:{comment:string})=>a.comment.includes('retired'))).toBe(true);});
 it('blocks stop submission',async()=>{const s=state();s.claims[0].lines[0].date='2099-01-01';await init(s);expect(()=>store.change('c1','Submitted','')).toThrow(/Block/);});
 it('warnings need justification',async()=>{const s=state();s.claims[0].lines[0].tax=0;await init(s);expect(()=>store.change('c1','Submitted','')).toThrow(/justification/);});
 it('warn justification allows submission and snapshots policy',async()=>{const s=state();s.claims[0].lines[0].tax=0;s.claims[0].justification='No tax charged';await init(s);store.change('c1','Submitted','');expect(store.view().claims[0].status).toBe('Submitted');expect(store.view().claims[0].policyVersion).toBe(1);});
 it('policy edit does not rebind old submission',async()=>{const s=state();s.session!.userId='f1';s.claims[0].policyVersion=1;await init(s);const p=policy();p.rules.claimCap.value=1;store.setPolicy(p);expect(store.policyFor(store.view().claims[0]).version).toBe(1);expect(store.policyFor().version).toBe(2);});
 it('employee cannot edit policy',async()=>{await init();expect(()=>store.setPolicy(policy())).toThrow(/Finance/);});
 it('finance cannot create employee draft',async()=>{const s=state();s.session!.userId='f1';await init(s);expect(()=>store.create()).toThrow(/employees/);});
 it('no individual Paid transition bypasses batch',async()=>{const s=state();s.session!.userId='f1';s.claims[0].status='Finance approved';await init(s);expect(()=>store.change('c1','Paid','')).toThrow(/batch/);});
 it('batch validates sum before mutation',async()=>{const s=state();s.session!.userId='f1';s.claims[0].status='Finance approved';await init(s);expect(()=>store.pay(['c1'],'2026-11-16','UPI','DEMO-01',9999)).toThrow(/total/);expect(store.view().claims[0].status).toBe('Finance approved');});
 it('batch marks paid atomically',async()=>{const s=state();s.session!.userId='f1';s.claims[0].status='Finance approved';await init(s);const b=store.pay(['c1'],'2026-11-16','UPI','DEMO-01',10000);expect(b.total).toBe(10000);expect(store.view().claims[0].status).toBe('Paid');expect(store.view().audit).toHaveLength(1);});
 it('cannot pay a claim twice',async()=>{const s=state();s.session!.userId='f1';s.claims[0].status='Finance approved';await init(s);store.pay(['c1'],'2026-11-16','UPI','DEMO-01',10000);expect(()=>store.pay(['c1'],'2026-11-16','UPI','DEMO-02',10000)).toThrow();});
 it('duplicate ids in batch rejected',async()=>{const s=state();s.session!.userId='f1';s.claims[0].status='Finance approved';await init(s);expect(()=>store.pay(['c1','c1'],'2026-11-16','UPI','DEMO-01',20000)).toThrow();});
 it('quota failure preserves saved data',async()=>{await init();const before=values.get(STORAGE_KEY);Object.defineProperty(globalThis,'localStorage',{value:{...storage(),setItem:()=>{throw new Error('QuotaExceededError');}},configurable:true});expect(()=>store.create()).toThrow(/full/);expect(values.get(STORAGE_KEY)).toBe(before);expect(store.view().claims).toHaveLength(1);});
 it('disabled storage gives clear recovery error',async()=>{Object.defineProperty(globalThis,'localStorage',{value:{getItem:()=>{throw new Error('SecurityError');}},configurable:true});await expect(new BrowserClaimStore().init()).rejects.toThrow(/disabled/);});
 it('corrupted data stays untouched',async()=>{values.set(STORAGE_KEY,'{bad');const s=new BrowserClaimStore();await expect(s.init()).rejects.toThrow(/preserved/);expect(values.get(STORAGE_KEY)).toBe('{bad');expect(s.rawRecovery()).toBe('{bad');});
 it('other tab revision refuses lost update',async()=>{await init();const data=JSON.parse(values.get(STORAGE_KEY)!);data.revision++;values.set(STORAGE_KEY,JSON.stringify(data));expect(()=>store.create()).toThrow(/Another tab/);});
 it('failed authentication uses generic message',async()=>{await init();await expect(store.signIn('unknown@kestrel.example','Wrong')).rejects.toThrow('Email or password is incorrect');});
 it('valid browser PBKDF2 sign-in',async()=>{const s=state();s.users[0].hash=await hashPassword('ClaimEase!2026',s.users[0].salt);s.session=null;await init(s);await store.signIn(' EMPLOYEE@KESTREL.EXAMPLE ','ClaimEase!2026');expect(store.actor()?.id).toBe('u1');});
 it('sign-out clears session',async()=>{await init();store.signOut();expect(store.view().session).toBeNull();expect(store.view().claims).toHaveLength(0);});
 it('cross-browser import accepts an identical policy with a different creation timestamp',async()=>{const s=state();s.session!.userId='f1';await init(s);const incoming=state();incoming.policies[0].createdAt='2026-11-15T00:00:00.000Z';const raw=JSON.stringify({format:'ClaimEase',version:2,exportedAt:'2026-11-16',data:incoming,receipts:[]});await expect(store.importBackup(raw)).resolves.toContain('Skipped 1');});
 it('expired sessions cannot mutate',async()=>{const s=state();s.session!.createdAt=Date.now()-8*3600000;await init(s);expect(()=>store.create()).toThrow(/expired/);});
});