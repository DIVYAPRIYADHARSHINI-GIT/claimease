import type {Lock} from './types';
export const ITERATIONS=120000;
export const passwordRules=(password: string)=>password.length>=12&&/[a-z]/.test(password)&&/[A-Z]/.test(password)&&/\d/.test(password)&&/[^a-zA-Z0-9]/.test(password);
const hex=(array: Uint8Array)=>Array.from(array,b=>b.toString(16).padStart(2,'0')).join('');
export async function hashPassword(password: string,salt: string): Promise<string> {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:ITERATIONS,hash:'SHA-256'},key,256)));
}
export const newSalt=()=>hex(crypto.getRandomValues(new Uint8Array(16)));
export const locked=(lock: Lock|undefined,now: number)=>!!lock && lock.until>now;
export function failedAttempt(lock: Lock|undefined,now: number): Lock {const failures=(lock && (!lock.until||lock.until>now)?lock.failures:0)+1; return {failures,until:failures>=5?now+5*60000:0};}