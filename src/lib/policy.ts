import {categories, type Claim, type Policy, type Finding, type RuleKey} from './types';
import {lineAmount, total, money} from './money';
export const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const day = (s: string) => Date.parse(s+'T12:00:00Z')/86400000;
export function defaultPolicy(now: string): Policy {
  const definitions: [RuleKey,number,string][] = [
    ['daily',1,'Category totals per employee per day, including other active submissions.'],['claimCap',1500000,'Maximum INR amount for one claim.'],['monthly',1,'Category totals per employee per calendar month, including active submissions.'],['receiptAmount',50000,'A receipt is required when a line is above this INR amount.'],['receiptCategories',1,'These categories always need a receipt, even below the threshold.'],['duplicate',1,'Match vendor/date/INR amount or a receipt SHA-256 across any claim. No personal details are revealed.'],['late',30,'Warn when a line is older than this many calendar days on submission.'],['future',1,'Expenses cannot be dated after today.'],['trip',1,'When trip dates exist, every expense must fall within them.'],['mileageDay',200000,'Maximum mileage per day, stored as thousandths of a kilometre.'],['mileageRate',1200,'Maximum reimbursable paise per kilometre.'],['allowed',1,'Allow categories by both department and employee grade.'],['entertainment',150000,'Attendee names are required; this is the maximum INR amount per attendee.'],['weekend',1,'Warn on Saturday, Sunday or a listed company holiday.'],['tax',1,'Warn for missing tax, zero tax or tax exceeding the inclusive line amount.']
  ];
  return {version:1,createdAt:now,rules:Object.fromEntries(definitions.map(([k,value,explanation])=>[k,{enabled:true,value,explanation}])) as Policy['rules'],dailyLimits:Object.fromEntries(categories.map(c=>[c,c==='Meals'?150000:1000000])) as Policy['dailyLimits'],monthlyLimits:Object.fromEntries(categories.map(c=>[c,c==='Meals'?1000000:5000000])) as Policy['monthlyLimits'],receiptCategories:['Accommodation','Client entertainment'],allowedDepartments:{Engineering:[...categories],Operations:[...categories],Design:[...categories]},allowedGrades:{Standard:[...categories],Lead:[...categories]},holidays:['2026-01-26','2026-08-15','2026-10-02'],mileageRate:1000,perDiem:120000,secondLevel:false,secondLevelThreshold:1000000,glCodes:Object.fromEntries(categories.map((c,i)=>[c,String(6100+i*10)])) as Policy['glCodes']};
}
export function checkClaim(claim: Claim, policy: Policy, existingClaims: Claim[], today: string): Finding[] {
  const out: Finding[]=[];
  const add=(rule: Finding['rule'],severity: Finding['severity'],lineId: string|null,message: string,fix: string)=>out.push({rule,severity,lineId,message,fix});
  const on=(k: RuleKey)=>policy.rules[k].enabled;
  if (!claim.title.trim() || !claim.costCentre.trim() || !claim.lines.length) add('validation','Block',null,'Add a purpose, cost centre and at least one expense.','Complete the claim header.');
  if ((claim.tripStart || claim.tripEnd) && (!validDate(claim.tripStart)||!validDate(claim.tripEnd)||claim.tripStart>claim.tripEnd)) add('validation','Block',null,'Trip dates must be a complete, ordered date range.','Set a valid start and end date.');
  const existing=existingClaims.filter(c=>c.id!==claim.id);
  const active=existing.filter(c=>c.ownerId===claim.ownerId && !['Draft','Cancelled','Rejected','Returned for correction'].includes(c.status));
  const combined=[...active.flatMap(c=>c.lines),...claim.lines];
  if(on('claimCap') && total(claim.lines)>policy.rules.claimCap.value) add('claimCap','Block',null,`Claim exceeds ${money(policy.rules.claimCap.value)}.`, 'Reduce the claim to the policy cap; do not split expenses to evade limits.');
  for(const l of claim.lines) {
    const amount=lineAmount(l), id=l.id;
    if(!validDate(l.date)||!l.vendor.trim()||!l.description.trim()||!amount) add('validation','Block',id,'Date, vendor, description and a positive amount are required.','Complete this expense line.');
    if(l.kind==='expense' && l.currency!=='INR') {if(!l.fxRate) add('validation','Block',id,'An exchange rate is required.','Enter INR per unit of foreign currency.'); add('manualRate','Info',id,'Exchange rate entered manually.','Keep evidence of the conversion rate with the receipt.');}
    const daily=combined.filter(x=>x.date===l.date&&x.category===l.category).reduce((n,x)=>n+lineAmount(x),0);
    const monthly=combined.filter(x=>x.date.slice(0,7)===l.date.slice(0,7)&&x.category===l.category).reduce((n,x)=>n+lineAmount(x),0);
    if(on('daily')&&daily>policy.dailyLimits[l.category]) add('daily','Block',id,`${l.category} daily total ${money(daily)} exceeds ${money(policy.dailyLimits[l.category])}.`,'Reduce or correct expenses for this date.');
    if(on('monthly')&&monthly>policy.monthlyLimits[l.category]) add('monthly','Block',id,`${l.category} monthly total exceeds ${money(policy.monthlyLimits[l.category])}.`,'Check other submissions in this month.');
    if(!l.receipts.length && ((on('receiptAmount')&&amount>policy.rules.receiptAmount.value)||(on('receiptCategories')&&policy.receiptCategories.includes(l.category)))) add(!l.receipts.length&&on('receiptCategories')&&policy.receiptCategories.includes(l.category)?'receiptCategories':'receiptAmount','Block',id,'A receipt is required for this expense.','Attach a readable receipt image.');
    if(on('duplicate')) {
      const candidates=[...existing.flatMap(c=>c.lines),...claim.lines.filter(x=>x.id!==id)];
      if(candidates.some(x=>(x.vendor.trim().toLowerCase()===l.vendor.trim().toLowerCase()&&x.date===l.date&&lineAmount(x)===amount)||l.receipts.some(r=>x.receipts.some(y=>r.hash===y.hash)))) add('duplicate','Warn',id,'A matching expense or receipt exists in this browser.','Remove a duplicate or justify why these are separate expenses. Personal details are not shown.');
    }
    if(validDate(l.date)) {
      if(on('late')&&day(today)-day(l.date)>policy.rules.late.value) add('late','Warn',id,`Expense is more than ${policy.rules.late.value} days old.`,'Explain the late submission.');
      if(on('future')&&l.date>today) add('future','Block',id,'Expense date is in the future.','Use the actual expense date.');
      if(on('trip')&&claim.tripStart&&claim.tripEnd&&(l.date<claim.tripStart||l.date>claim.tripEnd)) add('trip','Block',id,'Expense is outside the trip dates.','Correct the expense or trip dates.');
      const weekday=new Date(l.date+'T12:00:00Z').getUTCDay();
      if(on('weekend')&&(weekday===0||weekday===6||policy.holidays.includes(l.date))) add('weekend','Warn',id,'Expense falls on a weekend or company holiday.','Explain the business purpose for this date.');
    }
    if(l.kind==='mileage') {
      if(on('mileageDay')&&combined.filter(x=>x.kind==='mileage'&&x.date===l.date).reduce((n,x)=>n+x.quantity,0)>policy.rules.mileageDay.value) add('mileageDay','Block',id,'Daily mileage exceeds the policy distance cap.','Correct the distance.');
      if(on('mileageRate')&&l.rate>policy.rules.mileageRate.value) add('mileageRate','Block',id,'Mileage rate exceeds the policy maximum.','Use a rate within policy.');
    }
    if(on('allowed')&&(!(policy.allowedDepartments[claim.department]||[]).includes(l.category)||!(policy.allowedGrades[claim.grade]||[]).includes(l.category))) add('allowed','Block',id,'This category is not allowed for your department or grade.','Select an eligible category or contact Finance.');
    if(on('entertainment')&&l.category==='Client entertainment') {
      const attendees=l.attendees.split(',').map(x=>x.trim()).filter(Boolean);
      if(!attendees.length) add('entertainment','Block',id,'Client entertainment needs attendee names.','Enter each attendee name, separated by commas.');
      else if(amount>policy.rules.entertainment.value*attendees.length) add('entertainment','Block',id,'Entertainment cost exceeds the per-head cap.','Correct the amount or attendee list.');
    }
    if(on('tax')&&l.kind==='expense'&&(l.tax===undefined||l.tax===0||l.tax>amount)) add('tax','Warn',id,'Tax is missing, zero or inconsistent with the inclusive amount.','Enter the included INR tax, or explain why no tax applies.');
  }
  return out;
}