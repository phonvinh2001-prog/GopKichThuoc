const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
process.chdir(path.resolve(__dirname,'..'));
for(const file of fs.readdirSync('src/js').filter(f=>f.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',`src/js/${file}`],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
for(const name of ['production','input','custom-stock','entry-grid','fixed-stock','mode-ui','review','results-view','print-presets']){const r=spawnSync(process.execPath,[`tests/${name}.cjs`],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
console.log('ALL CHECKS PASSED');
