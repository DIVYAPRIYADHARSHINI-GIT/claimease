import {readFile,writeFile,mkdir} from 'node:fs/promises';
const pkg=JSON.parse(await readFile('package.json','utf8'));const results=[];
for(const [name,version] of Object.entries({...pkg.dependencies,...pkg.devDependencies})){
 if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error(`${name} is not pinned exactly.`);
 const metadata=await(await fetch(`https://registry.npmjs.org/${name}`)).json();const published=metadata.time[version];
 if(!published||Date.now()-Date.parse(published)<14*86400000)throw new Error(`${name}@${version} is newer than two weeks.`);
 results.push({name,version,published});
}
await mkdir('docs/verification',{recursive:true});await writeFile('docs/verification/dependency-ages.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));console.log(`${results.length} exact dependency pins verified at least 14 days old.`);