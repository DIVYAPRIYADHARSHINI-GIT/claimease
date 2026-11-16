import type {Claim,User,State,Line} from '../src/lib/types';
import {defaultPolicy} from '../src/lib/policy';
export const today='2026-11-16';
export const policy=()=>defaultPolicy(today+'T00:00:00.000Z');
export const users:User[]=[
 {id:'u1',name:'Mira Vale',email:'employee@kestrel.example',role:'Employee',department:'Engineering',grade:'Standard',managerId:'m1',secondaryManagerId:'m2',salt:'a'.repeat(32),hash:'a'.repeat(64)},
 {id:'u2',name:'Isha Reed',email:'isha@kestrel.example',role:'Employee',department:'Design',grade:'Standard',managerId:'m2',salt:'b'.repeat(32),hash:'b'.repeat(64)},
 {id:'m1',name:'Evan Wren',email:'manager@kestrel.example',role:'Manager',department:'Engineering',grade:'Lead',salt:'c'.repeat(32),hash:'c'.repeat(64)},
 {id:'m2',name:'Sana Elm',email:'sana@kestrel.example',role:'Manager',department:'Design',grade:'Lead',salt:'d'.repeat(32),hash:'d'.repeat(64)},
 {id:'f1',name:'Leah Finch',email:'finance@kestrel.example',role:'Finance',department:'Operations',grade:'Lead',salt:'e'.repeat(32),hash:'e'.repeat(64)}
];
export const employee=users[0],manager=users[2],secondManager=users[3],finance=users[4];
export const line=(extra:Partial<Line>={}):Line=>({id:'l1',date:today,category:'Travel',vendor:'Fictional Transit',description:'Business meeting',amount:10000,tax:500,payment:'personal card',receipts:[],notes:'',attendees:'',kind:'expense',quantity:0,rate:1000,currency:'INR',foreignAmount:0,fxRate:1000000,...extra});
export const claim=(extra:Partial<Claim>={}):Claim=>({id:'c1',number:'CLM-2026-0001',ownerId:'u1',submittedBy:'u1',title:'Planning meeting travel',department:'Engineering',grade:'Standard',costCentre:'ENG-101',tripStart:'',tripEnd:'',currency:'INR',status:'Draft',lines:[line()],justification:'',createdAt:today+'T00:00:00.000Z',updatedAt:today+'T00:00:00.000Z',managerApprovals:[],...extra});
export const state=():State=>({schemaVersion:2,revision:0,users:structuredClone(users),claims:[claim()],policies:[policy()],batches:[],audit:[],counters:{'2026':1},session:{userId:'u1',createdAt:Date.now(),activityAt:Date.now()},locks:{},theme:'light',createdAt:today+'T00:00:00.000Z',lastBackup:null,notificationsRead:{}});