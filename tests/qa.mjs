import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {browser,pageFor,base,login,signout,shot,failure,clean} from './helpers.mjs';
const b=await browser();const {page,errors}=await pageFor(b);const axe=await readFile('node_modules/axe-core/axe.min.js','utf8');const results=[];const issues=[];
const routes={employee:[['overview','/dashboard'],['claims','/claims'],['claim-editor','/claims/sample-1'],['returned-claim','/claims/sample-6'],['privacy','/privacy'],['notifications','/notifications'],['about','/about']],manager:[['inbox','/manager'],['dashboard','/dashboard'],['approval','/claims/sample-2'],['privacy','/privacy'],['notifications','/notifications'],['about','/about']],finance:[['queue','/finance'],['batches','/batches'],['dashboard','/dashboard'],['review','/claims/sample-3'],['policy','/policy'],['settings','/settings'],['privacy','/privacy'],['notifications','/notifications'],['about','/about']]};
async function audit(name){
 await page.evaluate(()=>document.fonts.ready);await page.evaluate(axe);
 const report=await page.evaluate(async()=>{const a=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return a.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
 const layout=await page.evaluate(()=>{
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const small=[];while(walker.nextNode()){const node=walker.currentNode,e=node.parentElement;if(!node.textContent.trim()||!e||e.closest('script,style,.sr-only,svg'))continue;const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(r.width&&r.height&&s.visibility!=='hidden'&&Number.parseFloat(s.fontSize)<11.9)small.push({text:node.textContent.trim().slice(0,55),size:s.fontSize,tag:e.tagName});}
  const tiny=[...document.querySelectorAll('button,a,input,select,textarea,summary')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.opacity!=='0'&&!e.closest('.sr-only')&&(r.width<43.8||r.height<43.8)&&!(e.tagName==='INPUT'&&e.type==='checkbox'&&e.closest('label')?.getBoundingClientRect().height>=44);}).map(e=>({tag:e.tagName,text:(e.getAttribute('aria-label')||e.textContent).trim().slice(0,60),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)}));
  return {overflow:document.documentElement.scrollWidth>innerWidth+1,small,tiny};
 });
 await shot(page,name,'design-qa');const serious=report.filter(v=>['serious','critical'].includes(v.impact));const result={name,url:page.url(),violations:report,serious:serious.length,...layout,consoleErrors:[...errors]};results.push(result);
 if(serious.length||layout.overflow||layout.small.length||layout.tiny.length||errors.length){issues.push(result);await mkdir('docs/bug-report/screenshots',{recursive:true});await page.screenshot({path:`docs/bug-report/screenshots/QA-before-${name}.png`,fullPage:true,mask:[page.locator('input[autocomplete="current-password"]')],maskColor:'#E3E6EC'});console.log(`ISSUE ${name}: axe=${serious.length}, overflow=${layout.overflow}, small=${layout.small.length}, targets=${layout.tiny.length}`);}else console.log('PASS QA '+name);
 await writeFile('docs/verification/design-qa-results.json',JSON.stringify({time:new Date().toISOString(),base,audits:results.length,issues:issues.length,results},null,2));
}
try{
 await mkdir('docs/verification',{recursive:true});await page.goto(base+'/signin');await page.getByLabel('Email address').waitFor();
 for(const theme of ['light','dark']){
  if(theme==='dark'){await login(page,'finance');await page.getByRole('button',{name:'Use dark theme'}).click();await signout(page);}
  for(const width of [1440,1024,768,390]){await page.setViewportSize({width,height:width===390?844:1000});await audit(`signin-${theme}-${width}`);}
 }
 await login(page,'finance');await page.getByRole('button',{name:'Use light theme'}).click();await signout(page);
 for(const [role,pages] of Object.entries(routes)){
  await login(page,role);
  for(const theme of ['light','dark']){
   if((await page.locator('html').getAttribute('data-theme'))!==theme)await page.getByRole('button',{name:`Use ${theme} theme`}).click();
   for(const [name,path] of pages){await page.goto(base+path);await page.locator('main h1').waitFor();for(const width of [1440,1024,768,390]){await page.setViewportSize({width,height:width===390?844:1000});await audit(`${role}-${name}-${theme}-${width}`);}}
  }
  await signout(page);
 }
 console.log(`QA complete: ${results.length} screenshots/audits, ${issues.length} scenarios with findings.`);
 if(issues.length)process.exitCode=1;
}catch(e){await failure(page,e,'design QA harness');process.exitCode=1;}finally{await b.close();}