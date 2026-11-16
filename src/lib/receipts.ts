export const MAX_RECEIPT=200*1024;
export async function sha256(blob: Blob): Promise<string> {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');}
export async function compressReceipt(file: Blob): Promise<Blob> {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPEG, PNG or WebP image. PDF receipts are not supported.');
  if(file.size>20*1024*1024)throw new Error('Choose an image smaller than 20 MB.');
  let bitmap: ImageBitmap;
  try {bitmap=await createImageBitmap(file);}catch{throw new Error('This image cannot be read. Choose a different receipt.');}
  if(bitmap.width*bitmap.height>50000000){bitmap.close();throw new Error('Image dimensions are too large. Use a smaller photo.');}
  const canvas=document.createElement('canvas');
  let max=1600;
  try {
    for(let pass=0;pass<6;pass++) {
      const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.max(1,Math.round(bitmap.width*scale)); canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d'); if(!ctx)throw new Error('Image processing is unavailable.');
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      for(const quality of [.85,.7,.55,.4]) {
        const blob=await new Promise<Blob|null>(r=>canvas.toBlob(r,'image/jpeg',quality));
        if(blob&&blob.size<MAX_RECEIPT)return blob;
      }
      max=Math.floor(max*.7);
    }
    throw new Error('Could not compress this image under 200 KB. Choose a closer crop.');
  }finally{bitmap.close();}
}
export function openReceiptDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{const request=indexedDB.open('claimease-receipts',1);request.onupgradeneeded=()=>request.result.createObjectStore('images');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Receipt storage is unavailable. Enable browser storage.'));request.onblocked=()=>reject(new Error('Close other ClaimEase tabs to upgrade receipt storage.'));});
}
export async function receiptTransaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore)=>IDBRequest<T>): Promise<T> {
  const db=await openReceiptDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction('images',mode); const req=run(tx.objectStore('images'));let value:T;req.onsuccess=()=>{value=req.result;};tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=tx.onabort=()=>{db.close();reject(new Error('Receipt storage is full or unavailable. Export a backup and free browser space.'));};});
}
export const blobToData=(blob: Blob)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read receipt.'));reader.readAsDataURL(blob);});
export function dataToBlob(data: string): Blob {const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(data);if(!match)throw new Error('Backup contains an invalid receipt image.');const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));if(bytes.length>=MAX_RECEIPT)throw new Error('Backup receipt exceeds the 200 KB limit.');return new Blob([bytes],{type:'image/'+match[1]});}
export async function syntheticReceipt(vendor: string, date: string, amount: string, reference: string): Promise<Blob> {
  const c=document.createElement('canvas');c.width=640;c.height=760;const x=c.getContext('2d')!;
  x.fillStyle='#ffffff';x.fillRect(0,0,640,760);x.fillStyle='#101828';x.font='bold 30px sans-serif';x.fillText(vendor,44,80);
  x.font='18px sans-serif';x.fillStyle='#475467';x.fillText('FICTIONAL SAMPLE · NOT A TAX INVOICE',44,118);
  x.fillText(`Reference  ${reference}`,44,190);x.fillText(`Date  ${date}`,44,228);
  x.strokeStyle='#d0d5dd';x.beginPath();x.moveTo(44,268);x.lineTo(596,268);x.stroke();
  x.fillStyle='#101828';x.fillText('Business expense',44,320);x.fillText('Amount includes applicable sample tax',44,360);
  x.font='bold 32px sans-serif';x.fillText(`INR ${amount}`,44,440);
  x.font='18px sans-serif';x.fillStyle='#475467';x.fillText('Paid by personal funds',44,510);x.fillText('Generated locally by ClaimEase',44,664);x.fillText('Invented vendor. No real bank details.',44,700);
  return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Could not create sample receipt.')),'image/png'));
}