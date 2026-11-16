import type {Claim,State,Policy,Finding,Line} from './types';
import {lineAmount,total,inputMoney,money} from './money';
import {checkClaim} from './policy';
export function csvCell(value:unknown):string {let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export const csv=(rows:unknown[][])=>'\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
export function lineContext(l:Line):string {return l.kind==='mileage'?`${l.quantity/1000} km x INR ${inputMoney(l.rate)} per km`:l.kind==='perdiem'?`${l.quantity} travel days x INR ${inputMoney(l.rate)} per day`:l.currency!=='INR'?`${l.currency} ${inputMoney(l.foreignAmount)} x ${(l.fxRate/1000000).toFixed(6)} INR per unit (manual rate)`:'';}
export function exportCSV(kind:'claims'|'lines'|'batches'|'accounting',state:State,today:string,findings?:(c:Claim)=>Finding[]):string {
  const policy=(c:Claim)=>state.policies.find(p=>p.version===c.policyVersion)||state.policies.at(-1)!;
  const checks=(c:Claim)=>findings?findings(c):checkClaim(c,policy(c),state.claims,today);
  if(kind==='batches')return csv([['Batch','Date','Mode','Reference','Claim count','Total INR'],...state.batches.map(b=>[b.id,b.date,b.mode,b.reference,b.claimIds.length,inputMoney(b.total)])]);
  if(kind==='claims')return csv([['Claim','Purpose','Employee','Department','Cost centre','Status','Policy version','Requested INR','Approved INR','Policy findings'],...state.claims.map(c=>[c.number,c.title,state.users.find(u=>u.id===c.ownerId)?.name,c.department,c.costCentre,c.status,c.policyVersion||'Draft',inputMoney(total(c.lines)),inputMoney(total(c.lines,true)),checks(c).map(f=>`${f.severity}: ${f.message}`).join('; ')])]);
  return csv([[...(kind==='accounting'?['GL code']:[]),'Claim','Cost centre','Date','Category','Vendor','Description','Amount INR (tax inclusive)','Included tax INR','Decision','Policy findings','Type','Payment method','Source calculation','Attendees','Notes','Receipt names'],...state.claims.flatMap(c=>c.lines.filter(l=>kind!=='accounting'||(['Finance approved','Paid'].includes(c.status)&&l.decision!=='rejected')).map(l=>[...(kind==='accounting'?[policy(c).glCodes[l.category]]:[]),c.number,c.costCentre,l.date,l.category,l.vendor,l.description,inputMoney(lineAmount(l)),l.tax===undefined?'':inputMoney(l.tax),l.decision||(['Manager approved','Finance approved','Paid'].includes(c.status)?'approved with claim':'pending'),checks(c).filter(f=>!f.lineId||f.lineId===l.id).map(f=>`${f.severity}: ${f.message}`).join('; '),l.kind,l.payment,lineContext(l),l.attendees,l.notes,l.receipts.map(r=>r.name).join('; ')]))]);
}
export function download(data:Blob|string,name:string,type='text/plain'):void {const blob=typeof data==='string'?new Blob([data],{type}):data;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function claimPDF(claim:Claim,state:State,policy:Policy,findings:Finding[],getReceipt:(id:string)=>Promise<Blob|undefined>):Promise<Uint8Array> {
  const printedMoney=(value:number)=>money(value).replace('₹','');
  const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');
  const doc=await PDFDocument.create(),regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const safe=(s:string)=>s.replace(/₹/g,'INR ').replace(/[–—·•]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[^\x20-\x7e\n]/g,'?');
  let page=doc.addPage([595.28,841.89]),y=790;
  const ink=rgb(.063,.094,.157),blue=rgb(.227,.341,.839),gray=rgb(.28,.33,.4);
  const draw=(s:string,x:number,yy:number,size=10,heavy=false)=>page.drawText(safe(s),{x,y:yy,size,font:heavy?bold:regular,color:ink});
  const wrap=(s:string,width:number,size=9)=>{const words=safe(s).split(/\s+/),lines:string[]=[];let line='';for(const word of words){if(regular.widthOfTextAtSize((line+' '+word).trim(),size)>width&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);return lines;};
  const newPage=()=>{page=doc.addPage([595.28,841.89]);y=790;};
  const room=(h:number)=>{if(y-h<60)newPage();};
  const paragraph=(s:string,width=500,size=9)=>{for(const line of wrap(s,width,size)){room(16);draw(line,44,y,size);y-=14;}};
  draw('ClaimEase',44,y,22,true);draw('Claim it. Clear it.',390,y,11);y-=32;
  page.drawLine({start:{x:44,y},end:{x:551,y},color:blue,thickness:2});y-=28;
  draw(claim.number,44,y,16,true);draw(claim.status,350,y,12,true);y-=23;
  paragraph(`${state.users.find(u=>u.id===claim.ownerId)?.name||'Employee'} | ${claim.department} | ${claim.costCentre}`);
  const dates=claim.lines.map(l=>l.date).sort();paragraph(claim.title);paragraph(`Period: ${claim.tripStart||dates[0]||'-'} to ${claim.tripEnd||dates.at(-1)||'-'} | Policy v${claim.policyVersion||policy.version} | Currency: INR`);y-=16;
  const header=()=>{page.drawRectangle({x:44,y:y-10,width:507,height:26,color:rgb(.94,.95,.98)});draw('DATE / CATEGORY',52,y,9,true);draw('EXPENSE / POLICY FINDINGS',175,y,9,true);draw('INR',508,y,9,true);y-=32;};header();
  for(const l of claim.lines){const details=wrap(`${l.vendor}: ${l.description}. ${lineContext(l)} ${l.decision==='rejected'?'REJECTED: '+l.decisionComment: l.decision||''}`,285),issues=findings.filter(f=>!f.lineId||f.lineId===l.id).flatMap(f=>wrap(`${f.severity} - ${f.message} Fix: ${f.fix}`,285));const rows=[...details,...issues];const height=Math.max(48,rows.length*12+16);if(y-height<60){newPage();header();}draw(l.date,52,y,9);wrap(l.category,110).forEach((s,i)=>draw(s,52,y-15-i*12,9));rows.forEach((s,i)=>draw(s,175,y-i*12,8));const amt=printedMoney(lineAmount(l));draw(amt,543-regular.widthOfTextAtSize(amt,9),y,9);y-=height;page.drawLine({start:{x:44,y:y+8},end:{x:551,y:y+8},color:rgb(.88,.9,.93),thickness:.5});}
  room(100);y-=10;draw(`Requested: INR ${printedMoney(total(claim.lines))}`,44,y,12,true);y-=22;draw(`Approved: INR ${printedMoney(total(claim.lines,true))}`,44,y,12,true);y-=22;paragraph('Amounts include tax; tax is not added a second time.');if(claim.justification)paragraph('Justification: '+claim.justification);y-=15;
  room(50);draw('Approval trail',44,y,14,true);y-=24;for(const a of state.audit.filter(a=>a.claimId===claim.id))paragraph(`${a.time.slice(0,16).replace('T',' ')} UTC | ${a.actorName}, ${a.role} | ${a.status}: ${a.comment}`);
  for(const l of claim.lines)for(const r of l.receipts){const blob=await getReceipt(r.id);if(!blob)continue;room(230);y-=12;draw('Receipt · '+r.name,44,y,10,true);y-=15;const bytes=await blob.arrayBuffer(),image=blob.type==='image/png'?await doc.embedPng(bytes):await doc.embedJpg(bytes),scale=Math.min(180/image.width,180/image.height);page.drawImage(image,{x:44,y:y-image.height*scale,width:image.width*scale,height:image.height*scale});y-=image.height*scale+20;}
  const pages=doc.getPages();pages.forEach((p,i)=>{p.drawText(`Kestrel Labs - fictional browser-only demo | ${i+1} / ${pages.length}`,{x:44,y:28,size:8,font:regular,color:gray});});
  return doc.save();
}