import type {State} from './types';
import {claimStore} from './store';
export const app=$state({ready:false,data:null as State|null,error:'',toast:'',warning:false,usage:{metadata:0,receipts:0,quota:0,usage:0}});
export function refresh(){app.data=claimStore.view();}
export function notify(message:string){app.toast=message;setTimeout(()=>{if(app.toast===message)app.toast='';},6000);}
export async function run<T>(fn:()=>T|Promise<T>,message=''):Promise<T|undefined>{try{const result=await fn();refresh();if(message)notify(message);return result;}catch(e){notify(e instanceof Error?e.message:'Something went wrong. Your saved data was not changed.');return undefined;}}
export async function usage(){try{app.usage=await claimStore.storageUsage();}catch{notify('Receipt storage is unavailable. Your saved claims remain intact.');}}