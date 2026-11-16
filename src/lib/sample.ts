import type {State,Claim,Line,User,Status,Audit} from './types';
import {defaultPolicy} from './policy';
import {hashPassword,newSalt} from './auth';
import {syntheticReceipt,sha256} from './receipts';
import {inputMoney,total} from './money';
export const DEMO_PASSWORD='ClaimEase!2026';
export const todayLocal=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function newLine(date: string,rate=1000): Line {return {id:crypto.randomUUID(),date,category:'Travel',vendor:'',description:'',amount:0,payment:'personal card',receipts:[],notes:'',attendees:'',kind:'expense',quantity:0,rate,currency:'INR',foreignAmount:0,fxRate:1000000};}
export async function seedState(withClaims: boolean, put: (id:string,blob:Blob)=>Promise<void>, now=new Date()): Promise<State> {
  const iso=now.toISOString();
  const people: Omit<User,'salt'|'hash'>[]=[
    {id:'u1',name:'Mira Vale',email:'employee@kestrel.example',role:'Employee',department:'Engineering',grade:'Standard',managerId:'m1',secondaryManagerId:'m2'},
    {id:'u2',name:'Arin Moss',email:'arin@kestrel.example',role:'Employee',department:'Engineering',grade:'Standard',managerId:'m1'},
    {id:'u3',name:'Nila Brook',email:'nila@kestrel.example',role:'Employee',department:'Operations',grade:'Standard',managerId:'m1'},
    {id:'u4',name:'Theo Fern',email:'theo@kestrel.example',role:'Employee',department:'Operations',grade:'Lead',managerId:'m1'},
    {id:'u5',name:'Isha Reed',email:'isha@kestrel.example',role:'Employee',department:'Design',grade:'Standard',managerId:'m2',secondaryManagerId:'m1'},
    {id:'m1',name:'Evan Wren',email:'manager@kestrel.example',role:'Manager',department:'Engineering',grade:'Lead'},
    {id:'m2',name:'Sana Elm',email:'sana@kestrel.example',role:'Manager',department:'Design',grade:'Lead'},
    {id:'f1',name:'Leah Finch',email:'finance@kestrel.example',role:'Finance',department:'Operations',grade:'Lead'}
  ];
  const users=await Promise.all(people.map(async u=>{const salt=newSalt();return {...u,salt,hash:await hashPassword(DEMO_PASSWORD,salt)};}));
  const state:State={schemaVersion:2,revision:0,users,claims:[],policies:[defaultPolicy(iso)],batches:[],audit:[],counters:{},session:null,locks:{},theme:'light',createdAt:iso,lastBackup:null,notificationsRead:{}};
  if(!withClaims)return state;
  const states:Status[]=['Draft','Submitted','Manager approved','Finance approved','Paid','Returned for correction','Rejected','Cancelled'];
  const titles=['Client workshop travel','Product research visit','Workspace essentials','Quarterly planning meet','Field operations visit','Design review travel'];
  const cats:Line['category'][]=['Travel','Meals','Office supplies','Local conveyance','Accommodation','Internet and phone'];
  for(let i=0;i<30;i++) {
    const owner=users[i%5], status=states[i%8], date=new Date(now.getTime()-(i+2)*86400000).toISOString().slice(0,10), amount=([240000,89000,125000,46000,420000,79900][i%6]+i*1300);
    const line:Line={...newLine(date),id:`sample-line-${i+1}`,category:cats[i%6],vendor:['Copper Finch Transit','Willow Table','Paper Lantern Supply','Amber Wheel','Cedar House Stay','Bramble Connect'][i%6],description:titles[i%6],amount,tax:Math.round(amount/20)};
    if(i===0)line.date=new Date(now.getTime()+86400000).toISOString().slice(0,10);
    if(i===5)line.tax=undefined;
    if(i===10){line.currency='USD';line.foreignAmount=2000;line.fxRate=83500000;line.amount=167000;}
    const receiptId=`sample-receipt-${i+1}-${crypto.randomUUID()}`, blob=await syntheticReceipt(line.vendor,date,inputMoney(line.amount),`KL-${String(i+1).padStart(4,'0')}`);
    const hash=await sha256(blob);await put(receiptId,blob);line.receipts=[{id:receiptId,hash,name:`receipt-${i+1}.png`,size:blob.size}];
    const year=String(now.getFullYear());
    const c:Claim={id:`sample-${i+1}`,number:`CLM-${year}-${String(i+1).padStart(4,'0')}`,ownerId:owner.id,submittedBy:owner.id,title:titles[i%6],department:owner.department,grade:owner.grade,costCentre:['ENG-101','ENG-102','OPS-201','OPS-202','DSN-301'][i%5],tripStart:'',tripEnd:'',currency:'INR',status,lines:[line],justification:'Business activity required on this date; fictional sample reviewed with supporting documentation.',policyVersion:status==='Draft'?undefined:1,createdAt:date+'T08:00:00.000Z',submittedAt:status==='Draft'?undefined:date+'T09:00:00.000Z',updatedAt:date+'T13:00:00.000Z',managerApprovals:['Manager approved','Finance approved','Paid'].includes(status)?[owner.managerId!]:[]};
    state.claims.push(c);
    const event=(actor:User,s:Status,h:number,comment:string):Audit=>({id:`sample-event-${i}-${h}`,claimId:c.id,actorId:actor.id,actorName:actor.name,role:actor.role,time:date+`T${String(h).padStart(2,'0')}:00:00.000Z`,status:s,comment});
    state.audit.push(event(owner,'Draft',8,'Draft created.'));
    if(status!=='Draft')state.audit.push(event(owner,'Submitted',9,'Submitted under policy v1.'));
    if(['Manager approved','Finance approved','Paid'].includes(status))state.audit.push(event(users.find(u=>u.id===owner.managerId)!,'Manager approved',10,'Business purpose and receipts reviewed.'));
    if(['Finance approved','Paid'].includes(status))state.audit.push(event(users[7],'Finance approved',11,'Approved for reimbursement.'));
    if(['Rejected','Returned for correction'].includes(status))state.audit.push(event(users.find(u=>u.id===owner.managerId)!,status,12,status==='Rejected'?'Personal expenditure is not reimbursable.':'Please clarify the business purpose and included tax.'));
    if(status==='Cancelled')state.audit.push(event(owner,status,12,'Trip was cancelled; no reimbursement needed.'));
    state.counters[year]=i+1;
  }
  const paid=state.claims.filter(c=>c.status==='Paid');
  for(let b=0;b<2;b++) {const claims=paid.filter((_,i)=>i%2===b),date=now.toISOString().slice(0,10);state.batches.push({id:`PAY-SAMPLE-${b+1}`,date,mode:'Bank transfer',reference:`DEMO-SETTLEMENT-${b+1}`,claimIds:claims.map(c=>c.id),total:total(claims.flatMap(c=>c.lines),true),createdBy:'f1',paidAt:iso});for(const c of claims)state.audit.push({id:`paid-${c.id}`,claimId:c.id,actorId:'f1',actorName:'Leah Finch',role:'Finance',time:iso,status:'Paid',comment:`Included in PAY-SAMPLE-${b+1}. No real payment made.`});}
  return state;
}