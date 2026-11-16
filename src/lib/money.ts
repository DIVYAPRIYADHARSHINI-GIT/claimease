import type {Line} from './types';
export function integer(n: number): number {if (!Number.isSafeInteger(n) || n < 0) throw new Error('Use a non-negative, safe integer amount.'); return n;}
export function decimal(value: string, places = 2): number {
  if (!/^\d+(\.\d+)?$/.test(value.trim())) throw new Error('Enter a positive number, without commas or symbols.');
  const [whole, fraction=''] = value.trim().split('.');
  const base = 10n ** BigInt(places);
  const padded = fraction.padEnd(places+1,'0');
  const result = BigInt(whole)*base + BigInt(padded.slice(0,places)||'0') + (Number(padded[places])>=5 ? 1n:0n);
  return integer(Number(result));
}
export function multiply(a: number, b: number, denominator: number): number {
  integer(a); integer(b); integer(denominator); if (!denominator) throw new Error('Rate divisor cannot be zero.');
  return integer(Number((BigInt(a)*BigInt(b)+BigInt(Math.floor(denominator/2)))/BigInt(denominator)));
}
export const mileage = (kmMilli: number, ratePaise: number) => multiply(kmMilli,ratePaise,1000);
export const perDiem = (days: number, ratePaise: number) => multiply(integer(days),ratePaise,1);
export const foreign = (minor: number, rateMicros: number) => multiply(minor,rateMicros,1000000);
export function lineAmount(l: Line): number {return l.kind==='mileage' ? mileage(l.quantity,l.rate) : l.kind==='perdiem' ? perDiem(l.quantity,l.rate) : l.currency!=='INR' ? foreign(l.foreignAmount,l.fxRate) : integer(l.amount);}
export function sum(values: number[]): number {return values.reduce((a,b)=>integer(a+integer(b)),0);}
export const total = (lines: Line[], approved=false) => sum(lines.filter(l=>!approved || l.decision!=='rejected').map(lineAmount));
export const money = (paise: number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(paise/100);
export const inputMoney = (paise: number) => (paise/100).toFixed(2);
export function nextNumber(counters: Record<string,number>, year: string): {number:string;counters:Record<string,number>} {
  if (!/^\d{4}$/.test(year)) throw new Error('Invalid claim year.');
  const n = integer((counters[year]||0)+1);
  return {number:`CLM-${year}-${String(n).padStart(4,'0')}`,counters:{...counters,[year]:n}};
}