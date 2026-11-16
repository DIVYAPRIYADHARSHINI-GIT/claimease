import {it,expect} from 'vitest';import {writeFileSync,mkdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';
import {claimPDF} from '../src/lib/exports';import {claim,line,policy,state} from './fixtures';
it('long PDF repeats table headers and keeps every expense row on one page',async()=>{
 const c=claim({lines:Array.from({length:40},(_,i)=>line({id:'pdf-'+i,vendor:`ROW-${String(i+1).padStart(3,'0')}`,description:'Fictional planning workshop expense with supporting business purpose.',amount:10000+i*17}))});
 const bytes=await claimPDF(c,state(),policy(),[],async()=>undefined);mkdirSync('docs/verification',{recursive:true});writeFileSync('docs/verification/long-claim.pdf',bytes);
 const pages=execFileSync('pdftotext',['-layout','docs/verification/long-claim.pdf','-'],{encoding:'utf8'}).split('\f').filter(p=>p.trim());
 expect(pages.length).toBeGreaterThan(2);
 for(let i=0;i<40;i++){const marker=`ROW-${String(i+1).padStart(3,'0')}`,matches=pages.filter(p=>p.includes(marker));expect(matches).toHaveLength(1);expect(matches[0]).toContain(((10000+i*17)/100).toFixed(2));expect(matches[0]).toContain('DATE / CATEGORY');expect(matches[0]).toContain('EXPENSE / POLICY FINDINGS');}
});