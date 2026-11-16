import type {Claim,User,Status,Policy,Line,Session} from './types';
import {total} from './money';
export function inTeam(claim: Claim, actor: User, users: User[]): boolean {const owner=users.find(u=>u.id===claim.ownerId); return actor.role==='Manager' && !!owner && (owner.managerId===actor.id || owner.secondaryManagerId===actor.id);}
export function canSee(claim: Claim, actor: User, users: User[]): boolean {return actor.role==='Finance'||(actor.role==='Employee'&&claim.ownerId===actor.id)||(actor.role==='Manager'&&inTeam(claim,actor,users));}
export function routeAllowed(path: string, role: User['role']): boolean {
  if(['/about','/privacy','/notifications','/dashboard'].includes(path)) return true;
  if(path==='/claims'||path==='/claims/new') return role==='Employee';
  if(/^\/claims\/[^/]+$/.test(path)) return true;
  if(path==='/manager') return role==='Manager';
  if(['/finance','/batches','/settings','/policy'].includes(path)) return role==='Finance';
  return false;
}
export function sessionValid(session: Session|null, now: number): boolean {return !!session && now-session.createdAt<8*3600000 && now-session.activityAt<15*60000 && now>=session.createdAt;}
export function guard(path: string, actor: User|undefined, session: Session|null, now: number): string|null {
  if(path==='/signin')return null;
  if(!actor||!sessionValid(session,now))return '/signin?reason=expired';
  return routeAllowed(path,actor.role)?null:'/signin?reason=forbidden';
}
export function transition(claim: Claim, actor: User, next: Status, comment: string, policy: Policy, users: User[]): Claim {
  const c=structuredClone(claim), own=actor.id===claim.ownerId;
  const reject=()=>{throw new Error('This action is not permitted for this role, team or claim status.');};
  if(['Rejected','Returned for correction','Cancelled'].includes(next)&&!comment.trim())throw new Error('A comment is required.');
  if(next==='Submitted') {
    if(!own||actor.role!=='Employee'||!['Draft','Returned for correction'].includes(c.status))return reject();
    c.managerApprovals=[]; c.lines=c.lines.map(l=>({...l,decision:undefined,decisionComment:undefined}));
  } else if(next==='Cancelled') {
    if(!own||!['Submitted','Returned for correction'].includes(c.status))return reject();
  } else if(actor.role==='Manager') {
    if(!inTeam(c,actor,users)||own||c.submittedBy===actor.id||c.status!=='Submitted'||!['Manager approved','Rejected','Returned for correction'].includes(next))return reject();
    if(next==='Manager approved') {
      if(c.managerApprovals.includes(actor.id)) throw new Error('A different team manager must provide the second approval.');
      if(!total(c.lines,true))throw new Error('At least one line must be approved.');
      c.managerApprovals.push(actor.id);
      if(policy.secondLevel&&total(c.lines,true)>policy.secondLevelThreshold&&c.managerApprovals.length<2) {return c;}
    }
  } else if(actor.role==='Finance') {
    if(own||!((c.status==='Manager approved'&&['Finance approved','Returned for correction','Rejected'].includes(next))||(c.status==='Finance approved'&&next==='Paid')))return reject();
  } else return reject();
  c.status=next; return c;
}
export function decideLine(claim: Claim, actor: User, lineId: string, decision: 'approved'|'rejected', comment: string, users: User[]): Claim {
  if(claim.status!=='Submitted'||!inTeam(claim,actor,users)||claim.ownerId===actor.id||claim.submittedBy===actor.id||claim.managerApprovals.length)throw new Error('Line decisions are locked or not permitted.');
  if(decision==='rejected'&&!comment.trim()) throw new Error('A rejection comment is required.');
  if(!claim.lines.some(l=>l.id===lineId))throw new Error('Expense line not found.');
  return {...claim,lines:claim.lines.map(l=>l.id===lineId?{...l,decision,decisionComment:comment}:l)};
}
export function approvedTotal(lines: Line[]): number {return total(lines,true);}