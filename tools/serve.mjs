import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('build');const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
const config=JSON.parse(await readFile('vercel.json','utf8'));
createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost');let path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root+'/')&&path!==root){res.writeHead(403);res.end();return;}let exists=false;try{exists=(await stat(path)).isFile();}catch{}if(!exists){if(url.pathname.startsWith('/_app/')){res.writeHead(404);res.end('Asset not found');return;}path=root+'/index.html';}const data=await readFile(path);res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');for(const h of config.headers[0].headers)res.setHeader(h.key,h.value);res.end(data);}catch{res.writeHead(503);res.end('The local build is being refreshed. Reload after the build finishes.');}
}).listen(4173,'127.0.0.1',()=>console.log('ClaimEase static production build: http://127.0.0.1:4173'));