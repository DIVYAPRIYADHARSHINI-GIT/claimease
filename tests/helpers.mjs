import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
export const base=process.env.BASE_URL||'http://127.0.0.1:4173';
export const browser=()=>chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
export async function pageFor(b,width=1440,height=1000){const context=await b.newContext({viewport:{width,height},reducedMotion:'reduce',acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(6000);page.setDefaultNavigationTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});return {context,page,errors};}
export async function login(page,role='employee'){
 if(!page.url().includes('/signin'))await page.goto(base+'/signin');
 await page.getByLabel('Email address').fill(role.includes('@')?role:`${role}@kestrel.example`);
 await page.getByLabel('Password',{exact:true}).fill('ClaimEase!2026');
 await page.getByRole('button',{name:'Sign in to ClaimEase'}).click();
 await page.waitForURL(url=>!url.pathname.startsWith('/signin'));
 await page.getByRole('button',{name:'Sign out',exact:true}).waitFor();
 await page.locator('main h1').waitFor();
 assert.ok(!page.url().includes('/signin'),'Sign-in must remain on an authenticated screen');
}
export async function signout(page){await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL('**/signin');}
export async function shot(page,name,folder='running'){
 if(page.url().startsWith(base)&&!page.url().includes('/signin'))await page.locator('main h1').waitFor();
 await mkdir(`docs/screenshots/${folder}`,{recursive:true});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`docs/screenshots/${folder}/${name}.png`,fullPage:true,mask:[page.locator('input[autocomplete="current-password"]')],maskColor:'#E3E6EC',animations:'disabled'});
}
export async function failure(page,error,label){await mkdir('docs/bug-report/screenshots',{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,'-');const stem=`failure-${stamp}`;await page.screenshot({path:`docs/bug-report/screenshots/${stem}.png`,fullPage:true,mask:[page.locator('input[autocomplete="current-password"]')]}).catch(()=>{});await writeFile(`docs/bug-report/${stem}.json`,JSON.stringify({time:new Date().toISOString(),label,url:page.url(),error:String(error),screenshot:`screenshots/${stem}.png`},null,2));console.error(`${label}: ${error}`);}
export function clean(errors){assert.deepEqual(errors,[],'Browser console and page errors must be empty');}