const {spawnSync}=require("child_process");
const fs=require("fs"), path=require("path");
const root=path.join(__dirname,".."), reportDir=path.join(root,"validation","reports");
if(!fs.existsSync(reportDir)) fs.mkdirSync(reportDir,{recursive:true});
function run(stage){
 console.log(`\n=== ${stage.name} ===`);
 const r=spawnSync(stage.cmd,stage.args,{cwd:root,encoding:"utf8",shell:true});
 const out=(r.stdout||"")+"\n"+(r.stderr||"");
 fs.writeFileSync(path.join(reportDir,stage.log),out);
 console.log(out);
 return r.status;
}
const stages=[
 {name:"Gate 1 - Closed-loop AI Test Generation and Repair",cmd:"npm",args:["run","gate1:closed-loop"],log:"gate1_closed_loop.log"},
 {name:"Gate 2 - Manual API Tests",cmd:"npm",args:["run","test:manual"],log:"gate2_api_tests.log"},
 {name:"Gate 3 - Data Validation",cmd:"npm",args:["run","validate:data"],log:"gate3_data_validation.log"},
 {name:"Gate 4 - KPI Validation",cmd:"npm",args:["run","validate:kpi"],log:"gate4_kpi_validation.log"}
];
let failed=false;
for(const s of stages){if(run(s)!==0){console.error(`${s.name} failed.`); failed=true; break;}}
console.log("\n=== Gate 5 - Ollama RCA ===");
const rca=spawnSync("npm",["run","gate5:rca"],{cwd:root,encoding:"utf8",shell:true});
console.log(rca.stdout||""); console.error(rca.stderr||"");
if(failed){console.error("Pipeline failed. Deployment blocked.");process.exit(1);}
console.log("All quality gates passed. Deployment can proceed.");
