import {browser,pageFor,base,login,shot,failure,clean} from './helpers.mjs';
const b=await browser();const {page,errors}=await pageFor(b);
try{
 await page.goto(base);await page.getByRole('heading',{name:'Welcome to your workspace'}).waitFor();await shot(page,'01-signin');clean(errors);
 await login(page);await page.getByRole('heading',{name:'Hello, Mira.'}).waitFor();await shot(page,'02-employee-home');clean(errors);
 await page.goto(base+'/claims/sample-1');await page.getByRole('heading',{name:'Claim workspace'}).waitFor();await shot(page,'03-claim-block');clean(errors);
 await page.getByRole('button',{name:/View receipt/}).first().click();await page.locator('dialog[open]').waitFor();await shot(page,'04-receipt-viewer');clean(errors);
 console.log('Smoke: sign-in, employee home, claim Block, receipt viewer passed; no console errors.');
}catch(e){await failure(page,e,'production smoke');process.exitCode=1;}finally{await b.close();}