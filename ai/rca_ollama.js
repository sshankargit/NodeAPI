const fs=require("fs"), path=require("path");
const {callOllama}=require("./ollama_client");
function read(file){return fs.existsSync(file)?fs.readFileSync(file,"utf8"):"";}
async function main(){
 const root=path.join(__dirname,".."), reportDir=path.join(root,"validation","reports");
 if(!fs.existsSync(reportDir)) fs.mkdirSync(reportDir,{recursive:true});
 const files=["gate1_closed_loop_metrics.json","gate1_initial_test_run.log","gate1_repaired_test_run.log","gate2_api_tests.log","gate3_data_validation.log","gate4_kpi_validation.log","data_validation_report.json","kpi_validation_report.json"];
 const artifacts=files.map(f=>`\n===== ${f} =====\n${read(path.join(reportDir,f))||"Not available"}`).join("\n");
 const tpl=fs.readFileSync(path.join(__dirname,"gate5_rca_prompt_template.txt"),"utf8");
 const prompt=tpl.replace("{{ARTIFACTS}}",artifacts);
 fs.writeFileSync(path.join(reportDir,"gate5_rca_prompt.txt"),prompt);
 let output;
 try{output=await callOllama(prompt);}
 catch(e){output=`# Gate 5 - RCA Report\n\nOllama unavailable. Review failed stage logs in validation/reports.\n\nError: ${e.message}\n\nDeployment Decision: BLOCK if any prior gate failed.`;}
 fs.writeFileSync(path.join(reportDir,"gate5_ollama_rca_report.md"),output);
 console.log(output);
}
main().catch(e=>{console.error("Gate 5 RCA failed:",e.message);process.exit(1);});
